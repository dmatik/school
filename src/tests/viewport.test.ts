import { describe, it, expect } from 'vitest'
import { computeAppHeight } from '@/lib/viewport'

const IPHONE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148'
const DESKTOP_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36'

const base = {
  userAgent: IPHONE_UA,
  isStandalone: true,
  isPortrait: true,
  screenWidth: 393,
  screenHeight: 852,
  innerHeight: 793, // short by the status bar height (WebKit bug)
}

describe('computeAppHeight (iOS standalone viewport fix)', () => {
  it('uses the full screen height on iPhone standalone portrait', () => {
    expect(computeAppHeight(base)).toBe(852)
  })

  it('uses the short screen side in landscape', () => {
    expect(computeAppHeight({ ...base, isPortrait: false, innerHeight: 393 })).toBe(393)
  })

  it('never shrinks below window.innerHeight', () => {
    expect(computeAppHeight({ ...base, innerHeight: 900 })).toBe(900)
  })

  it('returns null in regular Safari (not standalone)', () => {
    expect(computeAppHeight({ ...base, isStandalone: false })).toBeNull()
  })

  it('returns null on non-iPhone devices', () => {
    expect(computeAppHeight({ ...base, userAgent: DESKTOP_UA })).toBeNull()
  })

  it('returns null when screen size is unavailable', () => {
    expect(computeAppHeight({ ...base, screenWidth: 0, screenHeight: 0 })).toBeNull()
  })
})

