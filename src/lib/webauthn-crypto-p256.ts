/**
 * Pure-TypeScript WebAuthn FIDO2 P-256 (ES256, COSE alg -7) + SHA-256 + CBOR/COSE
 * cryptographic helper for mobile passkey registration and authentication.
 * Compatible with `@simplewebauthn/server` verifyRegistrationResponse & verifyAuthenticationResponse.
 */

const P256_P = 0xffffffff00000001000000000000000000000000ffffffffffffffffffffffffn;
const P256_A = P256_P - 3n;
const P256_N = 0xffffffff00000000ffffffffffffffffbce6faada7179e84f3b9cac2fc632551n;
const P256_GX = 0x6b17d1f2e12c4247f8bce6e563a440f277037d812deb33a0f4a13945d898c296n;
const P256_GY = 0x4fe342e2fe1a7f9b8ee7eb4a7c0f9e162bce33576b315ececbb6406837bf51f5n;

function mod(a: bigint, m: bigint = P256_P): bigint {
  const r = a % m;
  return r >= 0n ? r : r + m;
}

function modInv(a: bigint, m: bigint = P256_P): bigint {
  let t = 0n;
  let newT = 1n;
  let r = m;
  let newR = mod(a, m);

  while (newR !== 0n) {
    const q = r / newR;
    [t, newT] = [newT, t - q * newT];
    [r, newR] = [newR, r - q * newR];
  }
  return mod(t, m);
}

interface AffinePoint {
  x: bigint;
  y: bigint;
  infinity?: boolean;
}

const POINT_AT_INFINITY: AffinePoint = { x: 0n, y: 0n, infinity: true };
const BASE_POINT: AffinePoint = { x: P256_GX, y: P256_GY };

function pointDouble(pt: AffinePoint): AffinePoint {
  if (pt.infinity || pt.y === 0n) return POINT_AT_INFINITY;
  const num = mod(3n * pt.x * pt.x + P256_A);
  const den = modInv(2n * pt.y);
  const lam = mod(num * den);
  const x3 = mod(lam * lam - 2n * pt.x);
  const y3 = mod(lam * (pt.x - x3) - pt.y);
  return { x: x3, y: y3 };
}

function pointAdd(p1: AffinePoint, p2: AffinePoint): AffinePoint {
  if (p1.infinity) return p2;
  if (p2.infinity) return p1;
  if (p1.x === p2.x) {
    if (mod(p1.y + p2.y) === 0n) return POINT_AT_INFINITY;
    return pointDouble(p1);
  }
  const lam = mod((p2.y - p1.y) * modInv(p2.x - p1.x));
  const x3 = mod(lam * lam - p1.x - p2.x);
  const y3 = mod(lam * (p1.x - x3) - p1.y);
  return { x: x3, y: y3 };
}

function pointMultiply(k: bigint, pt: AffinePoint = BASE_POINT): AffinePoint {
  let scalar = mod(k, P256_N);
  let result: AffinePoint = POINT_AT_INFINITY;
  let addend: AffinePoint = pt;

  while (scalar > 0n) {
    if (scalar & 1n) {
      result = pointAdd(result, addend);
    }
    addend = pointDouble(addend);
    scalar >>= 1n;
  }
  return result;
}

const SHA256_K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

function rotr(x: number, n: number): number {
  return (x >>> n) | (x << (32 - n));
}

export function sha256(message: Uint8Array): Uint8Array {
  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;

  const bitLen = message.length * 8;
  const paddedLen = Math.ceil((message.length + 9) / 64) * 64;
  const padded = new Uint8Array(paddedLen);
  padded.set(message);
  padded[message.length] = 0x80;

  const view = new DataView(padded.buffer);
  view.setUint32(paddedLen - 8, Math.floor(bitLen / 0x100000000), false);
  view.setUint32(paddedLen - 4, bitLen >>> 0, false);

  const w = new Uint32Array(64);

  for (let offset = 0; offset < paddedLen; offset += 64) {
    for (let i = 0; i < 16; i++) {
      w[i] = view.getUint32(offset + i * 4, false);
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let h = h7;

    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + SHA256_K[i] + w[i]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
    h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0;
    h7 = (h7 + h) >>> 0;
  }

  const out = new Uint8Array(32);
  const outView = new DataView(out.buffer);
  outView.setUint32(0, h0, false);
  outView.setUint32(4, h1, false);
  outView.setUint32(8, h2, false);
  outView.setUint32(12, h3, false);
  outView.setUint32(16, h4, false);
  outView.setUint32(20, h5, false);
  outView.setUint32(24, h6, false);
  outView.setUint32(28, h7, false);
  return out;
}

export function randomBytes(length: number): Uint8Array {
  const out = new Uint8Array(length);
  const cryptoObj = (globalThis as unknown as { crypto?: { getRandomValues?: (arr: Uint8Array) => Uint8Array } }).crypto;
  if (cryptoObj?.getRandomValues) {
    cryptoObj.getRandomValues(out);
    return out;
  }
  throw new Error(
    'Secure random number generator (crypto.getRandomValues) is unavailable'
  );
}

function hmacSha256(key: Uint8Array, data: Uint8Array): Uint8Array {
  const blockSize = 64;
  let k = key;
  if (k.length > blockSize) {
    k = sha256(k);
  }
  const paddedKey = new Uint8Array(blockSize);
  paddedKey.set(k);

  const oKeyPad = new Uint8Array(blockSize);
  const iKeyPad = new Uint8Array(blockSize);
  for (let i = 0; i < blockSize; i++) {
    oKeyPad[i] = paddedKey[i] ^ 0x5c;
    iKeyPad[i] = paddedKey[i] ^ 0x36;
  }

  const innerInput = new Uint8Array(blockSize + data.length);
  innerInput.set(iKeyPad, 0);
  innerInput.set(data, blockSize);
  const innerHash = sha256(innerInput);

  const outerInput = new Uint8Array(blockSize + innerHash.length);
  outerInput.set(oKeyPad, 0);
  outerInput.set(innerHash, blockSize);
  return sha256(outerInput);
}

export function utf8ToBytes(str: string): Uint8Array {
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(str);
  }
  const encoded = unescape(encodeURIComponent(str));
  const out = new Uint8Array(encoded.length);
  for (let i = 0; i < encoded.length; i++) {
    out[i] = encoded.charCodeAt(i);
  }
  return out;
}

const B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export function bytesToBase64Url(bytes: Uint8Array): string {
  let result = '';
  const len = bytes.length;
  for (let i = 0; i < len; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < len ? bytes[i + 1] : 0;
    const b2 = i + 2 < len ? bytes[i + 2] : 0;

    result += B64_CHARS[b0 >> 2];
    result += B64_CHARS[((b0 & 0x03) << 4) | (b1 >> 4)];
    if (i + 1 < len) {
      result += B64_CHARS[((b1 & 0x0f) << 2) | (b2 >> 6)];
    }
    if (i + 2 < len) {
      result += B64_CHARS[b2 & 0x3f];
    }
  }
  return result.replace(/\+/g, '-').replace(/\//g, '_');
}

export function bytesToHex(bytes: Uint8Array): string {
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

export function bigIntTo32Bytes(n: bigint): Uint8Array {
  const hex = n.toString(16).padStart(64, '0');
  const out = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

export function bytesToBigInt(bytes: Uint8Array): bigint {
  return BigInt(`0x${bytesToHex(bytes) || '0'}`);
}

export function generateP256KeyPair(): {
  privateKeyHex: string;
  xBytes: Uint8Array;
  yBytes: Uint8Array;
} {
  let d = 0n;
  while (d <= 0n || d >= P256_N) {
    d = mod(bytesToBigInt(randomBytes(32)), P256_N - 1n) + 1n;
  }
  const pub = pointMultiply(d, BASE_POINT);
  return {
    privateKeyHex: d.toString(16).padStart(64, '0'),
    xBytes: bigIntTo32Bytes(pub.x),
    yBytes: bigIntTo32Bytes(pub.y),
  };
}

function encodeDerInteger(value: bigint): Uint8Array {
  let hex = value.toString(16);
  if (hex.length % 2 !== 0) hex = `0${hex}`;
  const raw = new Uint8Array(hex.length / 2);
  for (let i = 0; i < raw.length; i++) {
    raw[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  const needsLeadingZero = (raw[0] & 0x80) !== 0;
  const len = raw.length + (needsLeadingZero ? 1 : 0);
  const out = new Uint8Array(2 + len);
  out[0] = 0x02;
  out[1] = len;
  if (needsLeadingZero) {
    out[2] = 0x00;
    out.set(raw, 3);
  } else {
    out.set(raw, 2);
  }
  return out;
}

export function p256SignDer(privateKeyHex: string, messageHash32: Uint8Array): Uint8Array {
  const d = BigInt(`0x${privateKeyHex}`);
  const z = bytesToBigInt(messageHash32);

  // RFC 6979 Section 3.2 deterministic nonce generation (HMAC-SHA256, P-256)
  const xOctets = bigIntTo32Bytes(d);
  const h1Octets = bigIntTo32Bytes(z >= P256_N ? z - P256_N : z);

  let V: Uint8Array = new Uint8Array(32).fill(0x01);
  let K: Uint8Array = new Uint8Array(32).fill(0x00);

  K = hmacSha256(K, concatBytes(V, new Uint8Array([0x00]), xOctets, h1Octets));
  V = hmacSha256(K, V);
  K = hmacSha256(K, concatBytes(V, new Uint8Array([0x01]), xOctets, h1Octets));
  V = hmacSha256(K, V);

  while (true) {
    V = hmacSha256(K, V);
    const k = bytesToBigInt(V);
    if (k >= 1n && k < P256_N) {
      const R = pointMultiply(k, BASE_POINT);
      if (!R.infinity) {
        const r = mod(R.x, P256_N);
        if (r !== 0n) {
          let s = mod(modInv(k, P256_N) * mod(z + r * d, P256_N), P256_N);
          if (s !== 0n) {
            if (s > P256_N >> 1n) {
              s = P256_N - s;
            }
            const rDer = encodeDerInteger(r);
            const sDer = encodeDerInteger(s);
            const seqLen = rDer.length + sDer.length;
            const der = new Uint8Array(2 + seqLen);
            der[0] = 0x30;
            der[1] = seqLen;
            der.set(rDer, 2);
            der.set(sDer, 2 + rDer.length);
            return der;
          }
        }
      }
    }
    K = hmacSha256(K, concatBytes(V, new Uint8Array([0x00])));
    V = hmacSha256(K, V);
  }
}

function concatBytes(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((acc, a) => acc + a.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const arr of arrays) {
    out.set(arr, offset);
    offset += arr.length;
  }
  return out;
}

export function buildWebAuthnRegistration(params: {
  challenge: string;
  rpId: string;
  origin: string;
  userVerified?: boolean;
}) {
  const credentialIdBytes = randomBytes(16);
  const credentialId = bytesToBase64Url(credentialIdBytes);
  const { privateKeyHex, xBytes, yBytes } = generateP256KeyPair();

  const clientDataObj = {
    type: 'webauthn.create',
    challenge: params.challenge,
    origin: params.origin,
    crossOrigin: false,
  };
  const clientDataBytes = utf8ToBytes(JSON.stringify(clientDataObj));

  // COSE Key Map (5 pairs): { 1: 2 (EC2), 3: -7 (ES256), -1: 1 (P-256), -2: x, -3: y }
  const coseKey = concatBytes(
    new Uint8Array([0xa5, 0x01, 0x02, 0x03, 0x26, 0x20, 0x01, 0x21, 0x58, 0x20]),
    xBytes,
    new Uint8Array([0x22, 0x58, 0x20]),
    yBytes
  );

  const rpIdHash = sha256(utf8ToBytes(params.rpId));
  const uvBit = params.userVerified !== false ? 0x04 : 0x00;
  const flags = new Uint8Array([0x41 | uvBit]); // UP (0x01) | optional UV (0x04) | AT (0x40)
  const signCount = new Uint8Array([0x00, 0x00, 0x00, 0x00]);
  const aaguid = new Uint8Array(16);
  const credIdLen = new Uint8Array([0x00, credentialIdBytes.length]);

  const authData = concatBytes(
    rpIdHash,
    flags,
    signCount,
    aaguid,
    credIdLen,
    credentialIdBytes,
    coseKey
  );

  // CBOR map: { "fmt": "none", "attStmt": {}, "authData": <bstr 148> }
  const attestationObject = concatBytes(
    new Uint8Array([
      0xa3,
      0x63, 0x66, 0x6d, 0x74, // "fmt"
      0x64, 0x6e, 0x6f, 0x6e, 0x65, // "none"
      0x67, 0x61, 0x74, 0x74, 0x53, 0x74, 0x6d, 0x74, // "attStmt"
      0xa0, // {}
      0x68, 0x61, 0x75, 0x74, 0x68, 0x44, 0x61, 0x74, 0x61, // "authData"
      0x58, authData.length,
    ]),
    authData
  );

  return {
    credentialId,
    privateKeyHex,
    registrationResponse: {
      id: credentialId,
      rawId: credentialId,
      type: 'public-key' as const,
      authenticatorAttachment: 'platform' as const,
      clientExtensionResults: {},
      response: {
        clientDataJSON: bytesToBase64Url(clientDataBytes),
        attestationObject: bytesToBase64Url(attestationObject),
        transports: ['internal' as const],
      },
    },
  };
}

export function buildWebAuthnAssertion(params: {
  credentialId: string;
  privateKeyHex: string;
  userHandle?: string;
  challenge: string;
  rpId: string;
  origin: string;
  counter: number;
  userVerified?: boolean;
}) {
  const clientDataObj = {
    type: 'webauthn.get',
    challenge: params.challenge,
    origin: params.origin,
    crossOrigin: false,
  };
  const clientDataBytes = utf8ToBytes(JSON.stringify(clientDataObj));
  const clientDataHash = sha256(clientDataBytes);

  const rpIdHash = sha256(utf8ToBytes(params.rpId));
  const uvBit = params.userVerified !== false ? 0x04 : 0x00;
  const flags = new Uint8Array([0x01 | uvBit]); // UP (0x01) | optional UV (0x04)
  const countBuf = new Uint8Array(4);
  new DataView(countBuf.buffer).setUint32(0, params.counter >>> 0, false);

  const authenticatorData = concatBytes(rpIdHash, flags, countBuf);
  const signedPayload = concatBytes(authenticatorData, clientDataHash);
  const signatureDer = p256SignDer(params.privateKeyHex, sha256(signedPayload));

  return {
    id: params.credentialId,
    rawId: params.credentialId,
    type: 'public-key' as const,
    authenticatorAttachment: 'platform' as const,
    clientExtensionResults: {},
    response: {
      clientDataJSON: bytesToBase64Url(clientDataBytes),
      authenticatorData: bytesToBase64Url(authenticatorData),
      signature: bytesToBase64Url(signatureDer),
      ...(params.userHandle ? { userHandle: params.userHandle } : {}),
    },
  };
}
