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
} from '../lib/webauthn-crypto-p256';

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
});
