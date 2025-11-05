---
title: User account encryption
sidebar_label: User account encryption
description: Overview of the various encrypted versions of user accounts.
sidebar_position: 1
---

# User account encryption

There are three versions of user account encryption, Version 0 (legacy) accounts used until ~2018,
Version 1 accounts, used between 2018 and 2025, Version 2 accounts used from 2026 forwards.

## Version 1

The user has a central, account-wide symmetric key - "user key" - that protects everything
downstream from it. It was first added in 2017
[[1]](https://github.com/bitwarden/server/commit/a01d5d9a51d0175e9c3e39fa8271a469df07a105#diff-4ca29d3671adb5899fda48584f1107536495573ad37151297ee7599bd8424e98).
The user key encrypts with AES256-CBC with HMAC authentication
[[2]](https://github.com/bitwarden/clients/commit/3845c55155bd928bae6fb8b58822f49b21afc071#diff-0e526b2c7acdbb0c577346cd6ce9d251aea8880900e11ed361cd580e04712e90R240).

### Stretched master-password wrapping

The current approach to storing the user key for authentication and unlock with a master password
for most users is using a stretched master key. Here, the user key is wrapped with (encrypted with)
the stretched master key. These users have a public-key encryption key pair, but no signature key
pair.

### Legacy master-password wrapping

For a brief period of time, the master key was not stretched when saving the master-key-wrapped user
key. This lead to a subset of users having AES256-CBC-HMAC user keys stored, wrapped in AES-256-CBC
without authentication.

## Version 2

Version 2 aims to provide several security and stability enhancements.

### COSE

Encodings for keys, encrypted messages, and signatures now all happen in COSE instead of custom
Bitwarden EncString encodings. This is more flexible, standardized, and security tested.

### Main cryptographic changes

The user key is a COSE-encoded XChaCha20-Poly1305 key. Anything encrypted directly with the user key
is a COSE Encrypt0 message. The public-key encryption keypair is mandatory. A new signature keypair
(also encoded as COSE) is introduced, which is also mandatory. Finally, a signed “security state”
object is introduced, which is also mandatory. Any of these items missing or failing to decrypt,
means that the client must reject the unlock / login process.

### Stability improvements

Each COSE key (signature keypair, XChaCha20-Poly1305 user key) has a key ID. This key ID is unique
to the key. It is written onto every encrypted object. Thus the server can now validate the key ID
of a specific object against the keys the user owns.

### User signature key pair

In addition to the encryption private key, the user now also has a signature key pair that can be
used to sign messages that can be verified by other users. The signature key pair is the new root of
trust between users. Users - in the medium term - no longer trust another user’s public encryption
key by fingerprint, but they trust the signature key pair.

The signature key pair signs the encryption public key and the security state. Since the signature
key pair is the new root of trust, this signature can be used to find the correct public key for a
user when sharing secrets with them.

### Signed security state

The signed security state solves cryptographic format downgrades. If a part of a vault's format's
features becomes insecure, the security state version can be bumped during a migration. The clients
can then reject synchronized vault data containing the old vault format, since the signed security
state version is newer.

## Version 0

These users have no user key. Encryption is performed directly with the 256-bit master key, and is
thus tightly coupled to master password or Key Connector encryption. Encryption used AES-CBC without
HMAC. Support for these users was discontinued in 2025 for technical-debt reasons and because
support for these users introduced vulnerabilities that could affect other users.
