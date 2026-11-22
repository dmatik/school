import { describe, it, expect } from 'vitest'
import { bumpSyncState, getSyncStateSnapshot } from '../../server/syncState.js'

describe('server/syncState', () => {
  it('increments global version and only targeted domains', () => {
    const before = getSyncStateSnapshot()
    const after = bumpSyncState('homework')

    expect(after.version).toBe(before.version + 1)
    expect(after.serverEpoch).toBe(before.serverEpoch)
    expect(after.domains.homework).toBe(before.domains.homework + 1)
    expect(after.domains.incidents).toBe(before.domains.incidents)
    expect(after.domains.exams).toBe(before.domains.exams)
    expect(after.domains.schedule).toBe(before.domains.schedule)
    expect(after.domains.config).toBe(before.domains.config)
  })

  it('increments all domains when called with no arguments', () => {
    const before = getSyncStateSnapshot()
    const after = bumpSyncState()

    expect(after.version).toBe(before.version + 1)
    expect(after.domains.homework).toBe(before.domains.homework + 1)
    expect(after.domains.incidents).toBe(before.domains.incidents + 1)
    expect(after.domains.exams).toBe(before.domains.exams + 1)
    expect(after.domains.schedule).toBe(before.domains.schedule + 1)
    expect(after.domains.config).toBe(before.domains.config + 1)
  })

  it('ignores unknown domain names without bumping version', () => {
    const before = getSyncStateSnapshot()
    const after = bumpSyncState('nonexistent')

    expect(after.version).toBe(before.version)
    expect(after.domains).toEqual(before.domains)
  })
})
