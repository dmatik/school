import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiFetch, getActiveServerUrl } from './api';
import {
  buildWebAuthnAssertion,
  buildWebAuthnRegistration,
  bytesToBase64Url,
  utf8ToBytes,
} from './webauthnCrypto';
import type { User } from '../../../src/types';

export interface PasskeyInfo {
  id: string;
  deviceName: string;
  deviceType: string;
  backedUp: boolean | number;
  createdAt: string;
  lastUsedAt: string | null;
}

interface StoredPasskeyEntry {
  credentialId: string;
  serverUrl: string;
  username: string;
  userId: string;
  counter: number;
  useBiometrics: boolean;
  createdAt: string;
}

const PASSKEY_INDEX_KEY = 'school_passkey_index_v1';
const BIO_KEYCHAIN_SERVICE = 'com.dmatik.school.passkeys.bio';

function secureKeyForCredential(credentialId: string): string {
  // SecureStore keys allow alphanumeric, '.', '-', '_'
  return `school_pk_${credentialId.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
}

async function readLocalIndex(): Promise<StoredPasskeyEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(PASSKEY_INDEX_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeLocalIndex(entries: StoredPasskeyEntry[]): Promise<void> {
  await AsyncStorage.setItem(PASSKEY_INDEX_KEY, JSON.stringify(entries));
}

function isUserCanceledError(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return (
    msg.includes('cancel') ||
    msg.includes('user fallback') ||
    msg.includes('dismiss') ||
    msg.includes('abort')
  );
}

async function savePrivateKeyToKeychain(
  credentialId: string,
  privateKeyHex: string,
  promptMessage: string
): Promise<boolean> {
  const key = secureKeyForCredential(credentialId);
  if (Platform.OS === 'web') {
    await AsyncStorage.setItem(key, privateKeyHex);
    return false;
  }

  const canBio = SecureStore.canUseBiometricAuthentication();
  if (canBio) {
    try {
      await SecureStore.setItemAsync(key, privateKeyHex, {
        requireAuthentication: true,
        authenticationPrompt: promptMessage,
        keychainService: BIO_KEYCHAIN_SERVICE,
      });
      return true;
    } catch (err) {
      if (isUserCanceledError(err)) {
        const cancelErr = new Error('Passkey authentication canceled');
        cancelErr.name = 'NotAllowedError';
        throw cancelErr;
      }
      // Fall back to standard SecureStore if simulator/device has no enrolled biometrics
    }
  }

  await SecureStore.setItemAsync(key, privateKeyHex);
  return false;
}

async function loadPrivateKeyFromKeychain(
  credentialId: string,
  useBiometrics: boolean,
  promptMessage: string
): Promise<string | null> {
  const key = secureKeyForCredential(credentialId);
  if (Platform.OS === 'web') {
    return AsyncStorage.getItem(key);
  }

  try {
    if (useBiometrics) {
      return await SecureStore.getItemAsync(key, {
        requireAuthentication: true,
        authenticationPrompt: promptMessage,
        keychainService: BIO_KEYCHAIN_SERVICE,
      });
    }
    return await SecureStore.getItemAsync(key);
  } catch (err) {
    if (isUserCanceledError(err)) {
      const cancelErr = new Error('Passkey authentication canceled');
      cancelErr.name = 'NotAllowedError';
      throw cancelErr;
    }
    throw err;
  }
}

async function removePrivateKeyFromKeychain(
  credentialId: string,
  useBiometrics: boolean
): Promise<void> {
  const key = secureKeyForCredential(credentialId);
  if (Platform.OS === 'web') {
    await AsyncStorage.removeItem(key);
    return;
  }
  try {
    await SecureStore.deleteItemAsync(
      key,
      useBiometrics ? { keychainService: BIO_KEYCHAIN_SERVICE } : undefined
    );
  } catch {
    // ignore cleanup errors
  }
}

export async function isPasskeySupported(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    return await SecureStore.isAvailableAsync();
  } catch {
    return false;
  }
}

/**
 * Registers a new WebAuthn passkey for the currently logged-in user.
 */
export async function registerPasskey(
  deviceName: string,
  currentUser: Pick<User, 'id' | 'username'>,
  promptMessage = 'Authenticate to create passkey'
): Promise<PasskeyInfo> {
  const serverUrl = getActiveServerUrl();
  if (!serverUrl) {
    throw new Error('Server URL not configured');
  }

  const origin = new URL(serverUrl).origin;

  // 1. Request registration challenge from server
  const optsRes = await apiFetch('/api/auth/passkey/register-options', {
    method: 'POST',
    headers: { Origin: origin },
  });
  const optsData = await optsRes.json().catch(() => null);
  if (!optsRes.ok || !optsData?.options || !optsData?.challengeId) {
    throw new Error(optsData?.error || 'Failed to start passkey registration');
  }

  const rpId: string = optsData.options.rp?.id || new URL(serverUrl).hostname || 'localhost';
  const challenge: string = optsData.options.challenge;

  // 2. Build WebAuthn FIDO2 P-256 credential and store private key in Keychain/Keystore
  const { credentialId, privateKeyHex, registrationResponse } =
    buildWebAuthnRegistration({
      challenge,
      rpId,
      origin,
    });

  const usedBio = await savePrivateKeyToKeychain(
    credentialId,
    privateKeyHex,
    promptMessage
  );

  // 3. Verify with server
  const verifyRes = await apiFetch('/api/auth/passkey/register-verify', {
    method: 'POST',
    headers: { Origin: origin },
    body: JSON.stringify({
      response: registrationResponse,
      challengeId: optsData.challengeId,
      deviceName: deviceName.trim() || 'Passkey',
    }),
  });

  const verifyData = await verifyRes.json().catch(() => null);
  if (!verifyRes.ok || !verifyData?.passkey) {
    await removePrivateKeyFromKeychain(credentialId, usedBio);
    throw new Error(verifyData?.error || 'Failed to verify passkey');
  }

  // 4. Record local metadata index for this server
  const index = await readLocalIndex();
  const nextIndex: StoredPasskeyEntry[] = [
    {
      credentialId,
      serverUrl: origin,
      username: currentUser.username,
      userId: currentUser.id,
      counter: 0,
      useBiometrics: usedBio,
      createdAt: verifyData.passkey.createdAt || new Date().toISOString(),
    },
    ...index.filter((e) => e.credentialId !== credentialId),
  ];
  await writeLocalIndex(nextIndex);

  return verifyData.passkey;
}

/**
 * Authenticates with a device passkey against the specified self-hosted server URL.
 */
export async function loginWithPasskey(
  serverUrl: string,
  username?: string,
  promptMessage = 'Sign in with Passkey'
): Promise<{ token: string; user: User }> {
  const origin = new URL(serverUrl).origin;
  const cleanUsername = username?.trim() || undefined;

  // 1. Find local passkeys registered on this device for this server
  const index = await readLocalIndex();
  const serverEntries = index.filter(
    (e) =>
      e.serverUrl === origin &&
      (!cleanUsername || e.username.toLowerCase() === cleanUsername.toLowerCase())
  );

  // 2. Request login challenge from server
  const optsRes = await fetch(`${serverUrl}/api/auth/passkey/login-options`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
    },
    body: JSON.stringify({
      username: cleanUsername || serverEntries[0]?.username || undefined,
    }),
  });

  const optsData = await optsRes.json().catch(() => null);
  if (!optsRes.ok || !optsData?.options || !optsData?.challengeId) {
    throw new Error(optsData?.error || 'Failed to start passkey authentication');
  }

  const allowCredentials: Array<{ id: string }> =
    optsData.options.allowCredentials || [];

  let matchedEntry: StoredPasskeyEntry | undefined;
  if (allowCredentials.length > 0) {
    const allowedIds = new Set(allowCredentials.map((c) => c.id));
    matchedEntry = serverEntries.find((e) => allowedIds.has(e.credentialId));
  } else {
    matchedEntry = serverEntries[0];
  }

  if (!matchedEntry) {
    throw new Error('No passkey registered on this device for this account');
  }

  // 3. Unlock private key from device Keychain/Keystore (triggers Face ID / Touch ID / Biometrics)
  const privateKeyHex = await loadPrivateKeyFromKeychain(
    matchedEntry.credentialId,
    matchedEntry.useBiometrics,
    promptMessage
  );

  if (!privateKeyHex) {
    throw new Error('Passkey key not found on this device');
  }

  const nextCounter = (matchedEntry.counter || 0) + 1;
  const rpId: string = optsData.options.rpId || new URL(serverUrl).hostname || 'localhost';
  const assertion = buildWebAuthnAssertion({
    credentialId: matchedEntry.credentialId,
    privateKeyHex,
    userHandle: matchedEntry.userId
      ? bytesToBase64Url(utf8ToBytes(matchedEntry.userId))
      : undefined,
    challenge: optsData.options.challenge,
    rpId,
    origin,
    counter: nextCounter,
  });

  // 4. Verify signed assertion on server
  const verifyRes = await fetch(`${serverUrl}/api/auth/passkey/login-verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
    },
    body: JSON.stringify({
      response: assertion,
      challengeId: optsData.challengeId,
    }),
  });

  const verifyData = await verifyRes.json().catch(() => null);
  if (!verifyRes.ok || !verifyData?.token || !verifyData?.user) {
    throw new Error(verifyData?.error || 'Passkey authentication failed');
  }

  // 5. Update local counter
  const updatedIndex = index.map((e) =>
    e.credentialId === matchedEntry!.credentialId
      ? { ...e, counter: nextCounter }
      : e
  );
  await writeLocalIndex(updatedIndex);

  return {
    token: verifyData.token,
    user: verifyData.user,
  };
}

/**
 * Fetches all registered passkeys for the current user.
 */
export async function fetchUserPasskeys(): Promise<PasskeyInfo[]> {
  const res = await apiFetch('/api/auth/passkeys');
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.error || 'Failed to fetch passkeys');
  }
  return data?.passkeys || [];
}

/**
 * Deletes a passkey from the server and cleans up any local device key.
 */
export async function deletePasskey(id: string): Promise<void> {
  const res = await apiFetch(`/api/auth/passkeys/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error || 'Failed to delete passkey');
  }

  const index = await readLocalIndex();
  const target = index.find((e) => e.credentialId === id);
  if (target) {
    await removePrivateKeyFromKeychain(target.credentialId, target.useBiometrics);
    await writeLocalIndex(index.filter((e) => e.credentialId !== id));
  }
}
