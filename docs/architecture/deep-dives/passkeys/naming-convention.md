---
sidebar_position: 4
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

## FIDO2 vs WebAuthn

This naming scheme is not based on any hard rules defined in the specifications, but rather on which
parts of FIDO2 are used to build the Provider and Relying Party code.

Historically, the Provider code was built on both the WebAuthn and CTAP2 specifications and so
`Fido2` was used to refer to it. Today, the provider code is almost exclusively based on the
WebAuthn specification. However, if Bitwarden chooses to support any authenticator extensions in the
future (e.g. `hmac-secret`), they will likely be defined in the CTAP2 specification.

In contrast, the Relying Party code is built exclusively on the WebAuthn specification and does not
need to refer to CTAP2 at all, which is why the term `WebAuthn` was chosen. The older 2FA
implementation is also based on the WebAuthn specification, but it is not a "login method" and so it
is not referred to as `WebAuthnLogin`.

:::info

The implementation of 2FA login will eventually be consolidated with the newer passkey login
implementation under the `WebAuthn` namespace.

:::
