---
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
flag in the passkey metadata (called `discoverable`). If this flag is set to `false` the RP will
need to provide the `credentialId` to Bitwarden in order to perform an assertion. If the flag is set
to `true` the passkey will be discoverable using the `rpId`. The `userHandle` is always returned if
available.
