---
title: User encryption (legacy ➜ V2)
sidebar_label: User encryption
description: Overview of legacy (V0/V1) and the 2025 V2 user encryption schemes in Bitwarden.
---

# User encryption (legacy ➜ V2)

This page describes previously existing user encryption schemes and the 2025 V2 redesign.

## V0: Master-key users (legacy)

These users have no user key. Encryption is performed directly with the 256-bit master key, and is
thus tightly coupled to master password or Key Connector encryption. Encryption used AES-CBC without
HMAC. Support for these users was discontinued in 2025 for technical-debt reasons and because these
users introduced vulnerabilities that could affect other users.

Optionally, these users had a public-key encryption key pair.

## V1: User-key users

The user key is a central, account-wide symmetric key that protects everything downstream from it.
It was first added in 2017
([server introduction](https://github.com/bitwarden/server/commit/a01d5d9a51d0175e9c3e39fa8271a469df07a105#diff-4ca29d3671adb5899fda48584f1107536495573ad37151297ee7599bd8424e98)).
The user key has only ever been AES-CBC with HMAC
([clients change](https://github.com/bitwarden/clients/commit/3845c55155bd928bae6fb8b58822f49b21afc071#diff-0e526b2c7acdbb0c577346cd6ce9d251aea8880900e11ed361cd580e04712e90R240)).

### Legacy master-password wrapping

For a brief period of time, the master key was not stretched when saving the master-key-wrapped user
key. This allowed unauthenticated user-key material to be stored in the database.

### Stretched master-password wrapping

The current (2017–2025) approach to storing the user key for authentication and unlock with a master
password for most users is using a stretched master key. Here, the user key is wrapped with
(encrypted with) the stretched master key.

Optionally (for most users), these users had a public-key encryption key pair.

## V2: 2025 user-encryption scheme

In 2025, a new user-encryption scheme is introduced, aimed to provide a clean break to V1 and to
introduce several security and stability enhancements.

### COSE

Encodings for keys, encrypted messages, and signatures now all happen in COSE instead of custom
Bitwarden EncString encodings. This is more flexible, standardized, and security tested. COSE has
support or at least RFCs for all relevant cryptographic algorithms, and is also extensible.

### Main cryptographic changes

The user key is a COSE-encoded XChaCha20-Poly1305 key. Anything encrypted directly with the user key
is a COSE Encrypt0 message. The public-key encryption keypair is mandatory. A new signature keypair
(also encoded as COSE) is introduced, which is also mandatory. Finally, a signed “security state”
object is introduced, which is also mandatory. Any of these items missing or failing to decrypt,
means that the client must reject the unlock / login process.

### Stability improvements

Each COSE key (signing, XChaCha20-Poly1305 user key) has a key ID. This key ID is unique to the key
(locally generated). It is written onto every encrypted object. Thus the server can now validate the
key ID of a specific object against the keys the user owns.

For instance, we can introduce a user key ID column that tracks the ID of the user key. This can be
used on the server side to validate the key ID of a modified or newly uploaded cipher against the
key ID of the user to verify that the key is correct. This is not a security feature, but a
stability feature.

### User signature key pair

In addition to the encryption private key, the user now also has a signature key pair that can be
used to sign messages that can be verified by other users. The signature key pair is the new root of
trust between users. Users - in the medium term - no longer trust another user’s public encryption
key by fingerprint, but they trust the signature key pair.

The signature key pair signs the encryption public key and the security state. Since the signature
key pair is the new root of trust, this signature can be used to find the correct public key for a
user when sharing secrets with them.

### Signed security state

The security state aims to solve a systematic problem with the V1 account format. There is no
cryptographically attested versioning. This means that a class of vulnerabilities are hard to solve.
This makes it hard to solve issues where new data must be introduced to fix an issue (such as with
the not yet rolled out icon URL fixes that add an encrypted and authenticated checksum of the item
URL).

In case a format or feature becomes insecure, a user’s account can be migrated, and the signed
security states version can be bumped. Then, clients no longer accept migrations of the feature, so
that a server cannot create downgraded / insecure versions.
