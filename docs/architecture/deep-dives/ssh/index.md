# SSH Keys and Agent

:::info

For more information on how Bitwarden implements its SSH agent, see [SSH Agent](./agent).

:::

## What are SSH Keys?

SSH keys are asymmetric key pairs that can be used for signing. Historically they were intended for
logging into servers, but recently they can also be used for signing arbitrary data such as Git
commits or even regular files. These key pairs consist of a private key, an associated public key,
and fingerprint; the latter two can be used to verify a signature created using the private key.

When stored on disk private keys can be stored in different formats. The modern, widely supported
format is `OPENSSH` encoding, which supports all of `RSA`, `ECDSA`, and `Ed25519` keys. Some
applications use the older `PKCS#8` format which is more complex. Further, `PKCS#8` encoded
`Ed25519` keys are not supported by OpenSSH and need to be converted to `OPENSSH` format before they
can be used.

Private keys may be encrypted with a passphrase when stored on disk or left unprotected. When using
a passphrase, the encryption key is derived from the passphrase using a
[KDF](https://en.wikipedia.org/wiki/Key_derivation_function) such as `bcrypt`. SSH private keys can
be encrypted using different ciphers -- `AES-128`, `AES-192`, `AES-256`, or `3DES`. Keys can be used
directly by applications but more commonly they are loaded and held in an SSH agent. An agent can,
after decrypting, hold the keys in memory and provide signing capabilities. Keys can also be stored
on hardware tokens like YubiKeys (`ed25519-sk`).
