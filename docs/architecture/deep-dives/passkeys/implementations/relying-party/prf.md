# Passkeys for decryption

When a user logs into their Bitwarden vault, two related but distinct operations take place -
authentication and decryption.

When using a master password, the password itself serves both of these purposes - authenticating the
user by verifying the password was entered correctly, and allowing decryption of your data through
the derivation of an encryption key from the password. For more detail on this, see the
[Bitwarden Security Whitepaper](https://bitwarden.com/help/bitwarden-security-white-paper/).

Passkeys inherently provide the mechanism for authentication. The `prf` extension introduced in the
WebAuthn [specification](https://w3c.github.io/webauthn/#prf-extension) provides the framework
necessary for passkeys to be used for decryption as well.

## What is PRF?

At the most abstract level, account encryption and decryption requires that the user's symmetric key
be encrypted ("protected") with another key that is only available client-side. For master
password-based decryption, this is done with the master key, derived through a key derivation
function. In order to use a passkey for account decryption, the client needs to able to derive such
a key from the passkey. Fortunately, the `prf` extension provides exactly this functionality.

The `prf` client extension specifies how a WebAuthn client can supply the output from a
pseudo-random function ("PRF") that is unique to each credential. The secret that this function
generates is hashed with a salt provided by the relying party to produce a 32-byte value that is
returned with the WebAuthn assertion. In Bitwarden's case, we can leverage this unique,
cryptographically-secure key to encrypt and decrypt the user's symmetric key - analogous to the
derived master key when using a master password to log in.

:::tip Client extensions vs. authenticator extensions

The `prf` extension is defined above as a "client extension". This is to differentiate it from an
"authenticator extension".

The [distinction](https://www.w3.org/TR/webauthn-3/#sctn-extensions) between client extensions and
authenticator extensions in WebAuthn lies in where they are processed and what they influence. An
authenticator extension involves communication with and processing in both the client and
authenticator, while a client extension involves only the client.

The `prf` client extension _can_ be built on top of the the `hmac-secret` authenticator extension,
but that is not a requirement.

:::

## How does Bitwarden use the PRF key?

### During passkey registration

When a passkey is registered for use with Bitwarden, we interrogate the attestation response to see
if PRF is supported. If so, we allow the user to choose to enable encryption.

![Registering a passkey with PRF](image.png)

If the user chooses to enable encryption, we request an assertion from the authenticator, which will
provide the key. (This is why you may be prompted multiple times to provide user verification when
registering a PRF-capable passkey.)

The 32-byte key returned from the authenticator is then stretched to a 64-byte two-part key using
HKDF. The first 32 bytes will serve as the AES-256 encryption key and the second 32 bytes will serve
as a message authentication code (MAC).

Once we have this encryption key, we can encrypt the user's symmetric key as follows:

    1. Create an RSA public/private key pair, specific to this credential.
    2. Encrypt the RSA private key with the encryption key, producing `EncryptionKey(PrivateKey)`
    3. Encrypt the user's symmetric key with the RSA public key, producing `PublicKey(UserSymmetricKey)`
    4. Encrypt the RSA public key with the user's symmetric key, producing `UserSymmetricKey(PublicKey)`

`EncryptionKey(PrivateKey)`, `PublicKey(UserSymmetricKey)`, and `UserSymmetricKey(PublicKey)` are
persisted on the server and associated with the registered passkey. Note that the PRF key does
**not** leave the client at any point, to ensure zero-knowledge encryption.

:::tip Why an RSA key pair?

Put simply: key rotation. In order to support
[encryption key rotation](https://bitwarden.com/help/account-encryption-key/#rotate-your-encryption-key),
a user must be able to re-encrypt the symmetric key for all registered passkeys. If the PRF key was
used to directly encrypt the user's symmetric key then this operation would require gaining access
to the PRF keys for each registered credential. The use of a public/private key pair allows the user
to re-encrypt the new symmetric key with the public key, with the assurance that only the holder of
the private key can decrypt it, and without having to provide access to the PRF key for each
registered credential.

:::

### During passkey login

When a user chooses to authenticate with a passkey, an assertion is requested from the
authenticator. If the passkey is registered for encryption, and the
[platform supports it](#what-if-i-am-prompted-for-my-master-password-when-using-a-prf-enabled-passkey),
the Bitwarden client will receive the PRF key in the assertion response.

The client will then submit the assertion (without the PRF key) to the server to perform
authentication.

If the server is able to validate the assertion, the user is authenticated, and as a part of the
authentication response the following PRF-encrypted key data is returned to the client:

    - The PRF-encrypted RSA private key (`EncryptionKey(PrivateKey)`)
    - The RSA public key-encrypted user symmetric key (`PublicKey(UserSymmetricKey)`)

In order to decrypt the vault data:

    1. The PRF key from the credential is stretched with HKDF.
    2. The resultant 32-bit encryption key is used to decrypt the RSA private key, with MAC validation taking place first.
    3. The RSA private key is used to decrypt the user's symmetric key.
    4. The symmetric key is used for vault decryption.

## Tips for using your passkey for decryption

### What if I am prompted for my master password when using a PRF-enabled passkey?

Support for PRF varies greatly across authenticators and platforms. Only when all members of the
WebAuthn assertion ceremony support PRF can Bitwarden obtain the key necessary for decryption. If
you registered a passkey with PRF support, but you are prompted for your master password on login,
make sure you are using the same operating system and browser that you used during registration.
