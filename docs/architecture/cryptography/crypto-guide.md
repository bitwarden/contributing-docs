---
title: How to use Cryptography in Bitwarden
sidebar_label: Cryptography Guide
description:
  A guide on using cryptographic APIs within Bitwarden, targeted at non-cryptography software
  engineers.
---

# How to use cryptography in Bitwarden

This guide is aimed at non-cryptography teams that want to consume cryptographic APIs in order to
build features that need end-to-end encryption. This guide provides an overview of available tools
for composing features that need cryptographic protection.

Currently, there is a set of low-level APIs
([EncString](https://github.com/bitwarden/sdk-internal/blob/c60a5d794732d2c0fc203feb21ce5851d5325fe1/crates/bitwarden-crypto/src/enc_string/symmetric.rs#L59),
[UnsignedSharedKey](https://github.com/bitwarden/sdk-internal/blob/c60a5d794732d2c0fc203feb21ce5851d5325fe1/crates/bitwarden-crypto/src/enc_string/asymmetric.rs#L58),
[MasterKey](https://github.com/bitwarden/sdk-internal/blob/c60a5d794732d2c0fc203feb21ce5851d5325fe1/crates/bitwarden-crypto/src/keys/master_key.rs#L32))
that have been used to build most features, with each team owning the cryptographic constructions
created. Recently, high-level safe primitives are introduced that move the complexity out of each
teams ownership. These are not yet complete, and if a particular use-case is not covered by them,
teams should reach out! The goal of these is to have most teams never have to think about
cryptography, or having to do safety analysis, or to own any cryptographic construct or protocol.
These abstract away all complex details and give teams a low-complexity, easy to use and hard to
mis-use interface to work with.

Primarily, this is aimed for consumption for end-to-end encrypted storage of long-term data, in
products such as the password manager or secrets manager.

## Rules

The primary rule here is: don't roll your own cryptography. Where possible, high level, safe tested and
analyzed protocols and primitives need to be used. The higher level the primitive, the less likely
that security bugs get introduced, and the less complexity to maintain and keep track of. Only where
not otherwise possible should low level primitives be used, and this should be done with extreme
caution and oversight.

Encryption in the typescript clients for new cases is deprecated. Any new cryptographic code must be
written in the SDK if possible. Existing use-cases can be continued in the typescript clients for
now, but eventually will have to be migrated too. There are several reasons behind this. On the one
hand the SDK has better memory safety guarantees and prevents key material from being left behind in
memory. On the other hand, newer, safer APIs are not exposed outside of the SDK.

## Terminology

### Symmetric encryption

Symmetric encryption (also secret key cryptography) describes cryptographic algorithms that have a
single key that is used both for encryption and decryption. As a rule-of-thumb, most things
non-cryptography developers build should be built with symmetric encryption. Symmetric encryption is
very fast and has small keys. To build complex sharing mechanisms, the data should be encrypted with
a symmetric key, and only the symmetric key is shared. This sharing can then be done via asymmetric
cryptography, not described here.

### Content encryption keys

A content encryption key is a per-item key that encrypts a single piece of data. It is created with
said data, and re-created (randomly sampled) when the data changes. The purpose is to decouple the
data from any upstream keys used to protect or share it.

For instance consider a large file that should be protected. If the account's symmetric key needs to
be rotated, and supposing the account symmetric key was used to encrypt the file, then the
re-encrypted file would have to be re-uploaded. With a content encryption key, only the re-encrypted
content encryption key needs to be re-uploaded.

Content encryption keys are currently used for file attachments, and for vault items ("cipher
keys").

### Key wrap

Key wrapping describes encrypting one key with another key. There are various reasons for doing
this. One of them is decoupling of keys, as in the content encryption key example above. Another is
implementing sharing mechanisms. When a set of encrypted items needs to be shared, such as a vault
item consisting of the content and a set of individually encrypted file attachments, each
content-encryption-key can be wrapped so that only a single key needs to be shared instead of
sharing a set of keys.

## How to use cryptography to build features

To use cryptographic primitives, features can be decomposed into a chain of simpler use-cases. The
cryptographic primitive to use depends on the specific requirement. The following is a list of
use-cases and the corresponding constructions that are currently supported for use. Most features
can be built out of a combination of the below constructs. If a feature cannot be constructed out of
a combination of these, teams should reach out!

### Protecting a document / struct

Use
[DataEnvelope](https://github.com/bitwarden/sdk-internal/c60a5d794732d2c0fc203feb21ce5851d5325fe1/main/crates/bitwarden-crypto/src/safe/data_envelope.rs).
This handles encryption and versioning, and hides exact sizes of the encrypted contents. The
existing
[example](https://github.com/bitwarden/sdk-internal/c60a5d794732d2c0fc203feb21ce5851d5325fe1/main/crates/bitwarden-crypto/examples/seal_struct.rs)
can be used as a reference. Using the data envelope API, an encrypted blob is obtained and,
depending on which public function is chosen, a key or a wrapped key. This key is a
content-encryption-key, which can be protected using other mechanisms noted down below. To unseal,
the content-encryption-key and the encrypted blob are required.

:::note

EncStrings have been used for this process. Instead of protecting the document as a whole, they
protected individual fields on the document. These are no longer recommended for new use-cases.
There is a few reasons, such as performance impact of many small decrypt operations, overhead of mac
/ IV of many small encrypted items, certain kinds of tampering attacks on the document as a whole.
Further, maintainability is harder, requiring a lot more work both on the client side as well as the
server side, if the structs are passed along in this representation.

If there is still a need to maintain EncStrings and help is needed figuring out a path to migrate,
teams should reach out.

The vast majority of existing encrypted data still uses EncStrings.

:::

### Protecting a file

Existing attachments are protected using an EncArrayBuffer. This is just an EncString, but encoded
slightly differently. Again, a content encryption key is usually used, but not enforced. When
encrypting files for new purposes, a content encryption key **MUST** be used. Consider that with the
current encryption scheme, the entire file must be downloaded and loaded into ram for decryption.

:::note

In the future, a higher-level abstraction will be provided that supports streaming / random access
decryption securely. This will allow using decrypted parts of the file without downloading and
decrypting the entire file first. This is yet to be designed / specified. If this functionality is
needed, teams should reach out.

:::

### Protecting a key with another key

Currently EncStrings are used to protect keys with other symmetric keys. The SDK contains high-level
functions for doing this as shown in this
[example](https://github.com/bitwarden/sdk-internal/blob/95e329ada87369bb984040b03024ef298f95e5e2/crates/bitwarden-crypto/src/store/context.rs#L210).

:::note

In the future, a CoseEncrypt0 message with more context will be provided that supports advertising
the contained key id, so that the server can validate key relationships, along with an abstraction
around this. Further, strong context binding / separation into namespaces will be provided.

:::

### Protecting a key with a password

Use
[PasswordProtectedKeyEnvelope](https://github.com/bitwarden/sdk-internal/blob/c60a5d794732d2c0fc203feb21ce5851d5325fe1/crates/bitwarden-crypto/src/safe/password_protected_key_envelope.rs)
as described in the
[example](https://github.com/bitwarden/sdk-internal/blob/c60a5d794732d2c0fc203feb21ce5851d5325fe1/crates/bitwarden-crypto/examples/protect_key_with_password.rs).
This allows storing a key with a low-entropy password or PIN. The envelope handles brute-force
protection.

#### MasterPasswordUnlockData

[MasterPasswordUnlockData](https://github.com/bitwarden/sdk-internal/blob/c60a5d794732d2c0fc203feb21ce5851d5325fe1/crates/bitwarden-core/src/key_management/master_password.rs#L46)
is a struct that encapsulates the data needed to unlock a vault using a master password. It is
currently backwards compatible to master-key based unlock, but this is not the case in the future.
Features relating to master-password based unlock should use this abstraction.

#### MasterKey

Historically, the master-key was used to protect keys with passwords. The master key is derived from
the user's master password using PBKDF2 or Argon2id user's email address as salt and the
synchronized account KDF parameters, producing a 256-bit key. This master key is then expanded using
HKDF into a 512-bit stretched master key, 256-bit of which are used as an aes256-cbc key, and
256-bit of which are used as an HMAC key. The stretched master key is used to encrypt the user's
symmetric key.

New usage of MasterKey is not supported. When interacting with it, please be aware that a
synchronization issues of the email (salt) or kdf settings will lead to a failure of decryption.

### Authenticating with a password

Use
[MasterPasswordAuthenticationData](https://github.com/bitwarden/sdk-internal/blob/c60a5d794732d2c0fc203feb21ce5851d5325fe1/crates/bitwarden-core/src/key_management/master_password.rs#L122).
It encapsulates the data needed to unlock a vault using a master password. It contains the
serverAuthorizationMasterKeyHash, the KDF settings and salt used. The cryptography is the same as
for MasterKey based authentication, but the abstraction prevents authentication issues resulting
from unsynchronized state.

:::note

The master-key used for unlock is also re-used for authentication. The
severAuthorizationMasterKeyHash is derived from the master-key using pbkdf2, with the password as a
salt and 1 iteration applied. This hash is then sent to the server for authentication.

:::
