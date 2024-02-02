---
sidebar_position: 3
---

# Naming Convention

Since Bitwarden will both store passkeys in users' vaults and support login with passkeys, it is
important to understand how to refer to these two different concepts in code, regardless of how they
are referred to in the marketplace, especially since the term "passkey" is one that is evolving over
time.

The current convention is:

- When working with [Provider](implementations/provider) code (i.e storing a credential in the
  vault), use `Fido2`.
  - Example: `Fido2Credential`, `Fido2Client`.
- When working with [Relying Party](implementations/relying-party) code (i.e. authenticating to
  Bitwarden with a passkey), use `WebAuthn`.
  - Example: `WebAuthnLogin` for passkey login, `WebAuthn` for the older 2FA login.
- Use the term `Credential` (and not `Passkey`) when referring to a FIDO2 Credential in code.

:::info

The implementation of 2FA login will eventually be consolidated with the newer passkey login
implementation under the `WebAuthn` namespace.

:::
