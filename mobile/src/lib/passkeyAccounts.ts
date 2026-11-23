export interface StoredPasskeyEntry {
  credentialId: string;
  serverUrl: string;
  username: string;
  userId: string;
  firstName?: string;
  lastName?: string;
  deviceName?: string;
  counter: number;
  useBiometrics: boolean;
  createdAt: string;
}

/**
 * Filters local passkey index entries to a single server origin and
 * deduplicates by case-insensitive username (keeping the newest entry).
 */
export function filterSavedPasskeyAccounts(
  entries: StoredPasskeyEntry[],
  serverUrl: string
): StoredPasskeyEntry[] {
  const origin = new URL(serverUrl).origin;
  const seenUsernames = new Set<string>();
  const result: StoredPasskeyEntry[] = [];

  for (const entry of entries) {
    if (entry.serverUrl !== origin) continue;
    const key = entry.username.trim().toLowerCase();
    if (!key || seenUsernames.has(key)) continue;
    seenUsernames.add(key);
    result.push(entry);
  }

  return result;
}
