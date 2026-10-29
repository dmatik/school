import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { getWebAuthnConfig, isLoopbackOrIp } from '../../server/webauthn-config.js'

describe('WebAuthn Config Resolver', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    delete process.env.RP_ID
    delete process.env.EXPECTED_ORIGIN
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  describe('isLoopbackOrIp', () => {
    it('identifies loopback hostnames and localhost', () => {
      expect(isLoopbackOrIp('localhost')).toBe(true)
      expect(isLoopbackOrIp('127.0.0.1')).toBe(true)
      expect(isLoopbackOrIp('::1')).toBe(true)
      expect(isLoopbackOrIp('')).toBe(true)
      expect(isLoopbackOrIp(null as unknown as string)).toBe(true)
    })

    it('identifies IPv4 addresses', () => {
      expect(isLoopbackOrIp('192.168.1.1')).toBe(true)
      expect(isLoopbackOrIp('10.0.0.5')).toBe(true)
    })

    it('identifies regular domains as non-loopback', () => {
      expect(isLoopbackOrIp('school.trosman.co.il')).toBe(false)
      expect(isLoopbackOrIp('trosman.co.il')).toBe(false)
      expect(isLoopbackOrIp('example.com')).toBe(false)
    })
  })

  describe('getWebAuthnConfig with production domain', () => {
    it('resolves RP ID and expectedOrigin from request Origin header', () => {
      const req = {
        headers: { origin: 'https://school.trosman.co.il' },
        get: (h: string) => (h.toLowerCase() === 'origin' ? 'https://school.trosman.co.il' : undefined),
      }

      const config = getWebAuthnConfig(req)
      expect(config.rpID).toBe('school.trosman.co.il')
      expect(config.expectedOrigin).toContain('https://school.trosman.co.il')
    })

    it('resolves RP ID and strips port from request Origin header with custom port', () => {
      const req = {
        headers: { origin: 'https://school.trosman.co.il:8443' },
        get: (h: string) => (h.toLowerCase() === 'origin' ? 'https://school.trosman.co.il:8443' : undefined),
      }

      const config = getWebAuthnConfig(req)
      expect(config.rpID).toBe('school.trosman.co.il')
      expect(config.expectedOrigin).toContain('https://school.trosman.co.il:8443')
    })

    it('falls back to Referer when Origin header is absent', () => {
      const req = {
        headers: { referer: 'https://school.trosman.co.il/account' },
        get: (h: string) => (h.toLowerCase() === 'referer' ? 'https://school.trosman.co.il/account' : undefined),
      }

      const config = getWebAuthnConfig(req)
      expect(config.rpID).toBe('school.trosman.co.il')
      expect(config.expectedOrigin).toContain('https://school.trosman.co.il')
    })

    it('resolves from x-forwarded-host behind Cloudflare/reverse proxy', () => {
      const req = {
        headers: {
          'x-forwarded-host': 'school.trosman.co.il',
          'x-forwarded-proto': 'https',
          host: 'localhost:3001',
        },
        get: (h: string) => {
          const map: Record<string, string> = {
            'x-forwarded-host': 'school.trosman.co.il',
            'x-forwarded-proto': 'https',
            host: 'localhost:3001',
          }
          return map[h.toLowerCase()]
        },
      }

      const config = getWebAuthnConfig(req)
      expect(config.rpID).toBe('school.trosman.co.il')
      expect(config.expectedOrigin).toContain('https://school.trosman.co.il')
    })
  })

  describe('getWebAuthnConfig with local development', () => {
    it('defaults to localhost for Vite local development', () => {
      const req = {
        headers: { origin: 'http://localhost:5173', host: 'localhost:3001' },
        get: (h: string) => (h.toLowerCase() === 'origin' ? 'http://localhost:5173' : 'localhost:3001'),
      }

      const config = getWebAuthnConfig(req)
      expect(config.rpID).toBe('localhost')
      expect(config.expectedOrigin).toContain('http://localhost:5173')
      expect(config.expectedOrigin).toContain('http://localhost:3001')
    })

    it('defaults to localhost for 127.0.0.1 since WebAuthn forbids IP addresses in rpId', () => {
      const req = {
        headers: { origin: 'http://127.0.0.1:5173', host: '127.0.0.1:3001' },
        get: (h: string) => (h.toLowerCase() === 'origin' ? 'http://127.0.0.1:5173' : '127.0.0.1:3001'),
      }

      const config = getWebAuthnConfig(req)
      expect(config.rpID).toBe('localhost')
      expect(config.expectedOrigin).toContain('http://127.0.0.1:5173')
    })
  })

  describe('getWebAuthnConfig with explicit environment overrides', () => {
    it('respects RP_ID when explicitly specified in environment', () => {
      process.env.RP_ID = 'trosman.co.il'
      const req = {
        headers: { origin: 'https://school.trosman.co.il' },
        get: (h: string) => (h.toLowerCase() === 'origin' ? 'https://school.trosman.co.il' : undefined),
      }

      const config = getWebAuthnConfig(req)
      expect(config.rpID).toBe('trosman.co.il')
      expect(config.expectedOrigin).toContain('https://school.trosman.co.il')
    })

    it('respects EXPECTED_ORIGIN when specified in environment', () => {
      process.env.EXPECTED_ORIGIN = 'https://custom.domain.com, https://another.domain.com'
      const req = {
        headers: {},
        get: () => undefined,
      }

      const config = getWebAuthnConfig(req)
      expect(config.rpID).toBe('custom.domain.com')
      expect(config.expectedOrigin).toContain('https://custom.domain.com')
      expect(config.expectedOrigin).toContain('https://another.domain.com')
    })
  })
})

