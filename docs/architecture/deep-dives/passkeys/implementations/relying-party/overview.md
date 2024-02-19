---
sidebar_position: 1
---

# Overview

Bitwarden can act as a Relying Party (RP) for passkeys. This means that you can log in to Bitwarden
using a passkey. Bitwarden supports passkeys as a second factor of authentication (2FA) and as a
primary factor of authentication. When used as a primary factor of authentication, Bitwarden will
not require you to enter a username or password when logging in. In cases where your passkey
[supports encryption](prf.md), your passkey will be able to decrypt your data as well. If your
passkey does not support encryption, Bitwarden will prompt you to enter a password to unlock your
vault.

## Implementations

Bitwarden currently has two implementations for authenticating users using passkeys:

- Older 2FA "WebAuthn" implementation
- Newer "Login with Passkeys" implementation

Both implementations use the same FIDO2 technologies, but are completely separate and share almost
no code. From a user perspective "Login with Passkeys" is a first-factor authentication method,
while the older "WebAuthn" implementation is a second-factor. "Login with Passkeys" takes advantage
of FIDO2 User Verification and therefore completely replaces the other existing 2FA methods.

The 2FA implementation will eventually be consolidated with the newer "Login with Passkey"
implementation.

## Storage modality

- The 2FA "WebAuthn" implementation supports both client-side and server-side storage mode.
- The "Login with Passkeys" implementation only supports the client-side storage mode.

## Discoverability

- The 2FA "WebAuthn" implementation does not support discoverability, as it is a second-factor
  authentication method and supports the server-side storage mode.
- The "Login with Passkeys" implementation requires discoverable credentials.
