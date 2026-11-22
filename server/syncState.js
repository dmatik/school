import crypto from 'node:crypto';

const serverEpoch = crypto.randomUUID();

let version = 1;
const domains = {
  homework: 1,
  incidents: 1,
  exams: 1,
  schedule: 1,
  config: 1,
};

const ALL_DOMAINS = Object.keys(domains);

/**
 * Increments the global sync version and the specified domain counters.
 * If no domains are provided, all domains are bumped.
 */
export function bumpSyncState(...targetDomains) {
  const targets = targetDomains.length > 0 ? targetDomains : ALL_DOMAINS;
  let changed = false;
  for (const domain of targets) {
    if (Object.prototype.hasOwnProperty.call(domains, domain)) {
      domains[domain] += 1;
      changed = true;
    }
  }
  if (changed) {
    version += 1;
  }
  return getSyncStateSnapshot();
}

/**
 * Returns a copy of the current in-memory sync state snapshot.
 */
export function getSyncStateSnapshot() {
  return {
    version,
    serverEpoch,
    domains: { ...domains },
  };
}
