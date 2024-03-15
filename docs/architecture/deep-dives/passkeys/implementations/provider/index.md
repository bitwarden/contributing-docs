---
title: Provider
sidebar_position: 1
---

# Overview

Bitwarden can act as a Passkey Provider to generate and store passkeys for other applications.

## Storage

Passkeys are stored alongside and in the same way as passwords, using the same encryption and
security. This includes both the private key and all related metadata. This data can be stored in
both personal and organization vaults.

Bitwarden only supports the client-side storage modality.

## Discoverability

Bitwarden respects discoverability requirements from RPs by saving a client-side discoverability
flag in the passkey metadata (called `discoverable`). If this flag is set to `false`, the RP will
need to provide the `credentialId` to Bitwarden in order to perform an assertion. If the flag is set
to `true` the passkey will be discoverable using the `rpId`. The `userHandle` is always returned if
available.

## User presence

Bitwarden always requires user presence during the registration process. This means that Bitwarden
will never respond to a registration request without guaranteeing that the user has first interacted
with their device somehow, by confirming or denying the registration request.

The same is not always true for the authentication process, for more information see
[User Presence in the Browser Extension](browser-extension#user-presence).

## User verification

Bitwarden does not yet fully support user verification for every request. This is a limitation of
the existing user verification services. Bitwarden will have full support for user verification
soon, via the user's unlock methods, such as a PIN or biometric unlock, with the master password as
a fallback.
