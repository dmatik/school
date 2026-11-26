---
name: red-team
description: Adversarial security and reliability inspection guide. Use when stress-testing features, challenging review findings, probing edge cases, or hunting for DoS, XSS, auth bypasses, and data-loss vulnerabilities.
---

# Red Team Adversarial Security & Reliability Runbook

Use this runbook to conduct adversarial evaluations on features, APIs, and proposed fixes in `school`:

## 1. Attack Vectors Checklist

### A. Authentication & Session Security
- [ ] **Token Forgery**: Does `JWT_SECRET` have an insecure default in production?
- [ ] **Token Lifetime & Invalidation**: Does changing a password increment `token_version` to immediately invalidate all existing sessions?
- [ ] **Timing Attacks**: Does username lookup or bcrypt comparison allow username enumeration via timing side-channels?
- [ ] **Rate Limiting**: Are public login/auth endpoints protected from credential brute-forcing and bcrypt CPU exhaustion?

### B. WebAuthn Passkey Resilience
- [ ] **Cryptographic Origin Binding**: Does `getWebAuthnConfig` enforce explicit static origin and RP_ID in production rather than dynamically reflecting untrusted client headers?
- [ ] **User Verification Enforcement**: Is `requireUserVerification` enforced (`true`) for passwordless access?
- [ ] **Challenge Lifecycle**: Are challenges consumed atomically on read (`delete(challengeId)`) so they cannot be reused across concurrent requests or upon verification error?

### C. Denial of Service & Memory Exhaustion (DoS / OOM)
- [ ] **Unbounded Payload Ingestion**: Are base64 avatars or payloads limited server-side to prevent V8 heap exhaustion?
- [ ] **Heavy Queries in Middleware**: Does `authenticate` avoid fetching large text/BLOB columns (like `avatar`) on every API request?
- [ ] **Database Concurrency**: Is `busy_timeout` configured in SQLite to prevent lock exceptions under concurrent writes?

### D. Data Destruction & Integrity
- [ ] **Destructive Sync Guards**: Do bulk/sync endpoints (e.g., `PUT /api/schedule/batch`, `POST /api/webtop/sync`) protect against accidental data wiping or partial overwrites if an empty or malformed payload is submitted?
- [ ] **Schema Coverage**: Do all client-persisted properties (incidents, homework, exams, schedule lessons, children) have corresponding database columns?
- [ ] **Cross-Tenant References**: Does foreign-key validation verify ownership within the authenticated tenant?

### E. Frontend & Browser Resilience
- [ ] **Reliable Flush on Exit**: Do background/exit requests use `fetch(..., { keepalive: true, headers: { Authorization: ... } })` rather than `sendBeacon` (which cannot send auth headers)?
- [ ] **Mount Race Conditions**: Do sync hooks (`useServerSync`, `/api/webtop/sync-if-stale`) avoid redundant writes or sync loops on initial component mount?

