import { describe, it, expect } from 'vitest';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import {
  buildWebAuthnRegistration,
  buildWebAuthnAssertion,
  p256SignDer,
  randomBytes,
} from '../lib/webauthn-crypto-p256';
import {
  filterSavedPasskeyAccounts,
  type StoredPasskeyEntry,
} from '../lib/passkey-accounts';

describe('mobile WebAuthn FIDO2 P-256 Passkey crypto engine', () => {
  it('generates registration and authentication payloads verified by @simplewebauthn/server', async () => {
    const rpID = 'localhost';
    const expectedOrigin = 'http://localhost:3001';
    const userId = 'user-test-123';

    const regOptions = await generateRegistrationOptions({
      rpName: 'School Incident Tracker',
      rpID,
      userName: 'parent1',
      userID: new TextEncoder().encode(userId),
      attestationType: 'none',
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
    });

    const { privateKeyHex, credentialId, registrationResponse } =
      buildWebAuthnRegistration({
        challenge: regOptions.challenge,
        origin: expectedOrigin,
        rpId: rpID,
      });

    const regVerification = await verifyRegistrationResponse({
      response: registrationResponse as unknown as Parameters<
        typeof verifyRegistrationResponse
      >[0]['response'],
      expectedChallenge: regOptions.challenge,
      expectedOrigin,
      expectedRPID: rpID,
      requireUserVerification: false,
    });

    expect(regVerification.verified).toBe(true);
    expect(regVerification.registrationInfo?.credential.id).toBe(credentialId);

    // Now verify authentication assertion with the registered public key
    const authOptions = await generateAuthenticationOptions({
      rpID,
      userVerification: 'preferred',
      allowCredentials: [
        {
          id: credentialId,
          transports: ['internal', 'hybrid'],
        },
      ],
    });

    const assertionResponse = buildWebAuthnAssertion({
      credentialId,
      privateKeyHex,
      userHandle: userId,
      challenge: authOptions.challenge,
      origin: expectedOrigin,
      rpId: rpID,
      counter: 1,
    });

    const authVerification = await verifyAuthenticationResponse({
      response: assertionResponse as unknown as Parameters<
        typeof verifyAuthenticationResponse
      >[0]['response'],
      expectedChallenge: authOptions.challenge,
      expectedOrigin,
      expectedRPID: rpID,
      requireUserVerification: false,
      credential: {
        id: regVerification.registrationInfo!.credential.id,
        publicKey: regVerification.registrationInfo!.credential.publicKey,
        counter: regVerification.registrationInfo!.credential.counter,
        transports: ['internal', 'hybrid'],
      },
    });

    expect(authVerification.verified).toBe(true);
    expect(authVerification.authenticationInfo.newCounter).toBe(1);
  });

  it('filters saved passkey accounts by server origin and deduplicates by username', () => {
    const entries: StoredPasskeyEntry[] = [
      {
        credentialId: 'cred-1',
        serverUrl: 'https://school.example.com',
        username: 'Parent1',
        userId: 'u1',
        firstName: 'Dana',
        lastName: 'Cohen',
        deviceName: 'iPhone Passkey',
        counter: 2,
        useBiometrics: true,
        createdAt: '2026-11-22T10:00:00.000Z',
      },
      {
        credentialId: 'cred-2',
        serverUrl: 'https://school.example.com',
        username: 'parent1',
        userId: 'u1',
        counter: 0,
        useBiometrics: true,
        createdAt: '2026-11-21T10:00:00.000Z',
      },
      {
        credentialId: 'cred-3',
        serverUrl: 'https://school.example.com',
        username: 'parent2',
        userId: 'u2',
        firstName: 'Avi',
        counter: 1,
        useBiometrics: true,
        createdAt: '2026-11-22T09:00:00.000Z',
      },
      {
        credentialId: 'cred-other',
        serverUrl: 'https://other.example.com',
        username: 'otheruser',
        userId: 'u3',
        counter: 0,
        useBiometrics: true,
        createdAt: '2026-11-22T08:00:00.000Z',
      },
    ];

    const filtered = filterSavedPasskeyAccounts(entries, 'https://school.example.com/api');
    expect(filtered).toHaveLength(2);
    expect(filtered.map((e) => e.credentialId)).toEqual(['cred-1', 'cred-3']);
  });

  it('uses deterministic RFC 6979 nonces in p256SignDer and fails closed if CSPRNG is absent', () => {
    const privHex = '0000000000000000000000000000000000000000000000000000000000000001';
    const msgHash = new Uint8Array(32).fill(0xab);
    const sig1 = p256SignDer(privHex, msgHash);
    const sig2 = p256SignDer(privHex, msgHash);
    expect(sig1).toEqual(sig2);

    const originalCrypto = globalThis.crypto;
    try {
      Object.defineProperty(globalThis, 'crypto', { value: undefined, configurable: true });
      expect(() => randomBytes(16)).toThrow(/unavailable/i);
    } finally {
      Object.defineProperty(globalThis, 'crypto', { value: originalCrypto, configurable: true });
    }
  });
});
