---
title: How to use Cryptography in Bitwarden
sidebar_label: Cryptography Guide
description:
  A guide on using cryptographic APIs within Bitwarden, targeted at non-cryptography software
  engineers.
---

# How to use cryptography in Bitwarden

This guide is aimed at non-cryptography teams that want to consume cryptographic APIs in order to
build features that need end-to-end encryption. With this guide, you should be able to know which
tools you have available to compose your feature that needs cryptographic protection.

## Rules

The primary rule here is: don't roll your own crypto. Where possible, high level safe, tested and
analyzed protocols and primitives need to be used. The higher level the primitive, the less likely
that security bugs get introduced, and the less complexity for you to maintain and keep track of.
Only where not otherwise possible low level primitives shall be used, and this should be done with
extreme caution and oversight.

Encryption in the typescript clients for new cases is deprecated. Any new cryptographic code must be
written in the SDK if possible. Existing use-cases can be continued in the typescript clients for
now, but eventually will have to be migrated too. There are several reasons behind this. On the one
hand the SDK has better memory safety guarantees and prevents key material from being left behind in
memory. On the other hand, newer, safer APIs are not exposed outside of the SDK.

## How do I use cryptography to build my feature?

To use cryptographic primitives, you can decompose your feature into a chain of simpler use-cases.
Which cryptographic primitive you use depends on what you want to do. The following, is a list of
use-cases, and the corresponding construction that is currently supported for use. Most features can
be built out of a combination of the below constructs. If you believe your feature cannot be
constructed out of a combination of these, please reach out!

### I want to protect a document / struct

Use [DataEnvelope](https://github.com/bitwarden/sdk-internal/pull/336). This handles encryption and
versioning, and hides exact sizes of the encrypted contents. You can follow the existing
[example](https://github.com/bitwarden/sdk-internal/blob/cbc84a33f3cbb59806a472459226150b86cc06e7/crates/bitwarden-crypto/examples/seal_struct.rs)
as a reference. Using the data envelope API, you obtain an encrypted blob and, depending on which
public function you choose to use, a key or a wrapped key. This key is a content-encryption-key,
which you can protect using other mechanisms noted down below. To unseal, you again need the
content-encryption-key and the encrypted blob.

:::note

EncStrings have been used for this process. These are no longer recommended for new use-cases. With
EncStrings, in general each field of a struct would be encrypted individually, which both is bad for
performance, maintainability, and carries security issues. If you still have to maintain EncStrings
and want help figuring out a path to migrate, please reach out.

The vast majority of existing encrypted data still uses EncStrings.

:::

### I want to protect a file

Existing attachments are protected using an EncArrayBuffer. This is just an EncString, but encoded
slightly differently. Again, a content encryption key is usually used, but not enforced. If you want
to encrypt files for new purposes, you **MUST** use a content encryption key. Consider that with the
current encryption scheme, the entire file must be downloaded and loaded into ram for decryption.

:::note

In the future, a higher-level abstraction will be provided that supports streaming / random access
decryption securely. This will allow using decrypted parts of the file without downloading and
decrypting the entire file first. This is yet to be designed / specified. If you need this, please
reach out.

:::

### I want to protect a key with another key

Currently, you have to use EncStrings for this. The SDK contains high-level functions for doing this
as shown in this
[example](https://github.com/bitwarden/sdk-internal/blob/03646591c366a5568b0f8062a0cb3b4745bcbd93/crates/bitwarden-crypto/src/store/context.rs#L154).

:::note

In the future, a CoseEncrypt0 message with more context will be provided that supports advertising
the contained key id, so that the server can validate key relationships, along with an abstraction
around this. Further, strong context binding / namespacing will be provided.

:::

### I want to protect a key with a password

Use
[PasswordProtectedKeyEnvelope](https://github.com/bitwarden/sdk-internal/blob/main/crates/bitwarden-crypto/src/safe/password_protected_key_envelope.rs)
as described in
[example](https://github.com/bitwarden/sdk-internal/blob/main/crates/bitwarden-crypto/examples/protect_key_with_password.rs).
This allows you to store a key with a low-entropy password or PIN. The envelope handles brute-force
protection.

#### MasterPasswordUnlockData

MasterPasswordUnlockData is a struct that encapsulates the data needed to unlock a vault using a
master password. It contains the protected symmetric key that is encrypted with the stretched master
key, along with the KDF settings and salt used. The cryptography used is the same as for using the
master key directly, but the abstraction is safer and prevents decryption issues resulting from
unsynchronized state.

#### MasterKey

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

:::note

The master-key used for unlock is also re-used for authentication. The
severAuthorizationMasterKeyHash is derived from the master-key using pbkdf2, with the password as a
salt and 1 iteration applied. This hash is then sent to the server for authentication.

:::

## Background reading

### Content encryption keys

A content encryption key is a per-item key that encrypts a single piece of data. It is created with
said data, and re-created (randomly sampled) when the data changes. The purpose here is to decouple
the data from any upstream keys used to protect or share it.

For instance, consider that you have a large file to protect. If you want to rotate your account's
symmetric key, supposing the account symmetric key was used to encrypt the file, then you would have
to re-upload the re-encrypted file. With a content encryption key, you only need to re-upload the
re-encrypted content encryption key.

Content encryption keys are currently used for file attachments, and for vault items ("cipher
keys").

### Key wrap

Key wrapping describes encrypting one key with another key. There are various reasons for doing
this. One of them is decoupling of keys, as in the content encryption key example above. Another is
implementing sharing mechanisms. If you have a set of encrypted items you want to share, such as a
vault item consisting of the content, and a set of individually encrypted file attachments, then you
can wrap each content-encryption-key so that you only need to share a single key instead of sharing
a set of keys.
