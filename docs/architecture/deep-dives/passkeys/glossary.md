---
sidebar_position: 6
---

# Glossary

This page contains some definitions of terms used throughout the passkey documentation. For a more
comprehensive list, see the
[FIDO Alliance Glossary](https://fidoalliance.org/specs/common-specs/fido-glossary-v2.1-rd-20210525.html).

## Definitions

<dl>
  <dt>Passkey</dt>
  <dd>Any passwordless FIDO2 credential.</dd>

  <dt>Credential</dt>
  <dd>The technical term for a passkey. The two terms are used interchangeably.</dd>

  <dt>Relying Party (RP)</dt>
  <dd>A web site or other entity that uses a FIDO2 protocol to authenticate users by asking for a passkey.</dd>

  <dt>Passkey Provider (PP)</dt>
  <dd>An app and/or service that is responsible for storing and managing passkeys. Many operating systems include a default passkey provider (first-party), and many also support third-party providers (like Bitwarden).</dd>

  <dt>Attestation</dt>
  <dd>The process used to create a new passkey.</dd>
  <dd>The process of communicating a cryptographic assertion to a relying party that a key presented during authenticator registration was created and protected by a genuine authenticator with verified characteristics.</dd>

  <dt>Attestation Statement</dt>
  <dd>An optional statement about the exact type (make/model) of the authenticator and its capabilities.</dd>
  <dd>An optional statement provided by an authenticator which can be used by a Relying Party to identify and verify the provenance of the authenticator. Not to be confused with "attestation" which can be performed without providing a statement about the provenance of the authenticator.</dd>

  <dt>Assertion</dt>
  <dd>The process used to log in.</dd>
  <dd>The act of proving ownership of the private key, commonly referred to as authentication.</dd>

  <dt>Fallback</dt>
  <dd>Aborting the Bitwarden-side of the authentication process and handing off control to the native browser implementation of WebAuthn, enabling the user to use hardware security keys, etc.</dd>
</dl>
