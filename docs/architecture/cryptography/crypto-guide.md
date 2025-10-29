---
title: How to use Cryptography in Bitwarden
sidebar_label: Cryptography Guide
description: A
---

# How to use cryptography in Bitwarden

This guide is aimed at non-cryptography teams that want to consume cryptographic APIs in order to
build features that need end-to-end encryption.

## Rules

The primary rule here is: don't roll your own crypto. Where possible, high level safe, tested and
analyzed protocols and primitives need to be used. The higher level the primitive, the less likely
that security bugs get introduced, and the less complexity for you to maintain and keep track of.
Only where not otherwise possible low level primitives can be used, and this should be done with
extreme caution and external analysis.

Encryption in the typescript clients for new cases is deprecated. Any new cryptographic code must be
written in the SDK if possible. Existing use-cases can be continued in the typescript clients for
now, but eventually will have to be migrated too. There are several reasons behind this. On the one
hand the SDK has better memory safety guarantees and prevents key material from being left behind in
memory. On the other hand, newer, safer APIs are not exposed outside of the SDK.

## How do I use cryptography?

To use cryptographic primitives, you can decompose your feature into a chain of simpler use-cases.
Which cryptographic primitive you use depends on what you want to do. The following, is a list of
use-cases, and the corresponding construction that is currently supported for use. Most features can
be built out of a combination of the below constructs. If you believe your feature cannot be
constructed out of a combination of these, please reach out!

### I want to protect a document / struct

Use [DataEnvelope](https://github.com/bitwarden/sdk-internal/pull/336). This handles encryption and
versioning, and hides exact sizes of the encrypted contents. You can follow the existing
[example](https://github.com/bitwarden/sdk-internal/blob/cbc84a33f3cbb59806a472459226150b86cc06e7/crates/bitwarden-crypto/examples/seal_struct.rs).

#### Historical: EncStrings

Historically, EncStrings have been used for this process. These are no longer recommended for new
use-cases.

### I want to protect a file

Existing attachments are protected using an EncArrayBuffer. This is just an EncString, but encoded
slightly differently.

#### Future outlook: FileEnvelope

In the future, a higher-level abstraction will be provided that supports streaming / random access
decryption securely. This is yet to be designed / specified. If you need this, please reach out.

### I want to protect a key with another key

Currently, you have to use EncStrings for this. The SDK contains high-level functions for doing this
as shown in this
[example](https://github.com/bitwarden/sdk-internal/blob/03646591c366a5568b0f8062a0cb3b4745bcbd93/crates/bitwarden-crypto/src/store/context.rs#L154).

#### Future outlook: KeyEnvelope

In the future, a CoseEncrypt0 message with more context will be provided that supports advertising
the contained key id, so that the server can validate key relationships. Further, strong context
binding / namespacing will be provided.

### I want to protect a key with a password

Use
[PasswordProtectedKeyEnvelope](https://github.com/bitwarden/sdk-internal/blob/main/crates/bitwarden-crypto/src/safe/password_protected_key_envelope.rs)
as described in
[example](https://github.com/bitwarden/sdk-internal/blob/main/crates/bitwarden-crypto/examples/protect_key_with_password.rs).
This allows you to store a key with a low-entropy password or PIN. The envelope handles brute-force
protection.

#### Historical: MasterPasswordUnlockData

MasterPasswordUnlockData is a struct that encapsulates the data needed to unlock a vault using a
master password. It contains the protected symmetric key that is encrypted with the stretched master
key, along with the KDF settings and salt used. The cryptography used is the same as for using the
master key directly, but the abstraction is safer and prevents decryption issues resulting from
unsynchronized state.

#### Historical: MasterKey

Historically, the master-key was used to protect keys with passwords. The master key is derived from
the user's master password using PBKDF2 or Argon2id user's email address as salt and the
synchronized account KDF parameters, producing a 256-bit key. This master key is then expanded using
HKDF into a 512-bit stretched master key, 256-bit of which are used as an aes256-cbc key, and
256-bit of which are used as an HMAC key. The stretched master key is used to encrypt the user's
symmetric key.

New usage of MasterKey is not supported.

### I want to authenticate with a password

Use MasterPasswordAuthenticationData. It encapsulates the data needed to unlock a vault using a
master password. It contains the serverAuthorizationMasterKeyHash, the KDF settings and salt used.
The cryptography is the same as for MasterKey based authentication, but the abstraction prevents
authentication issues resulting from unsynchronized state.

#### Historical: MasterKey

The master-key used for unlock is also re-used for authentication. The
severAuthorizationMasterKeyHash is derived from the master-key using pbkdf2, with the password as a
salt and 1 iteration applied. This hash is then sent to the server for authentication.
