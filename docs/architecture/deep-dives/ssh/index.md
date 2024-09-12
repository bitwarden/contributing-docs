# SSH Keys and Agent

:::info

For more information on how Bitwarden implements SSH Agent, see [SSH Agent](./agent).

:::

## What are SSH Keys?

SSH keys are asymmetric keypairs that can be used for signing. Historically, they were intended for logging into servers,
but recently they can also be used for signing arbitrary data, such as git commits or even regular files.
These keys consist of a private key, and an associated public key and fingerprint. The latter two can be used
to verify a signature created using the private key.

When stored on disk, private keys can be stored in different formats. The modern, widely supported format is OPENSSH encoding,
which supports all of RSA, ECDSA, and Ed25519 keys. Some applications use the older PKCS#8 format, which is more complex. Further,
PKCS#8 Ed25519 keys are not supported by openssh, so they need to be converted to OPENSSH format before they can be used.

Private keys can be encrypted with a passphrase when stored on disk. The key is derived from the passphrase using a KDF (bcrypt),
and keys can be encrypted using different ciphers (AES-128, AES-192, AES-256, 3DES). Keys can be used directly by applications,
but more commonly they are loaded and held in an SSH agent. These agents can - after decrypting - hold the keys in memory and
provide signing capabilities. Further, keys can also be stored on hardware tokens like Yubikeys (`ed25519-sk`).
