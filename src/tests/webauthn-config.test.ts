import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { rateLimit, ipKeyGenerator } from 'express-rate-limit'
import { getWebAuthnConfig, isLoopbackOrIp, resolveTrustProxy } from '../../server/webauthn-config.js'

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

  describe('resolveTrustProxy & express-rate-limit behind reverse proxy', () => {
    it('defaults to trusting loopback, linklocal, uniquelocal without env configuration', () => {
      delete process.env.TRUST_PROXY
      expect(resolveTrustProxy()).toBe('loopback, linklocal, uniquelocal')
      expect(resolveTrustProxy('')).toBe('loopback, linklocal, uniquelocal')
      expect(resolveTrustProxy('true')).toBe('loopback, linklocal, uniquelocal')
    })

    it('supports explicit false/0 and numeric hop counts', () => {
      expect(resolveTrustProxy('false')).toBe(false)
      expect(resolveTrustProxy('0')).toBe(false)
      expect(resolveTrustProxy('1')).toBe(1)
      expect(resolveTrustProxy('2')).toBe(2)
      expect(resolveTrustProxy('loopback')).toBe('loopback')
    })

    it('processes X-Forwarded-For from Docker/LAN reverse proxy without ValidationError', async () => {
      const trustProxySetting = resolveTrustProxy(undefined)
      const errors: unknown[] = []
      const limiter = rateLimit({
        windowMs: 60_000,
        limit: 10,
        logger: {
          error: (...args: unknown[]) => errors.push(args),
          warn: () => {},
        },
      })

      const mockReq = {
        ip: '203.0.113.42',
        headers: {
          'x-forwarded-for': '203.0.113.42, 172.18.0.2',
        },
        app: {
          get: (setting: string) => (setting === 'trust proxy' ? trustProxySetting : undefined),
        },
      } as unknown as Parameters<typeof limiter>[0]

      const mockRes = {
        statusCode: 200,
        headersSent: false,
        setHeader: () => {},
        append: () => {},
      } as unknown as Parameters<typeof limiter>[1]

      let nextCalled = false
      let nextError: unknown = null
      await limiter(mockReq, mockRes, (err?: unknown) => {
        nextCalled = true
        nextError = err ?? null
      })

      expect(nextCalled).toBe(true)
      expect(nextError).toBeNull()
      expect(errors).toHaveLength(0)
      expect(`${ipKeyGenerator(mockReq.ip || '127.0.0.1')}:admin`).toBe('203.0.113.42:admin')
    })
  })
})

