# Requirements

At Bitwarden we protect our users data depending heavily zero-knowledge cryptography. One of the
most important way of achieving this is by living up to the high standard required from today's and
tomorrow's cryptography. This document outlines the requirements we have to achieve those goals.

:::info
For more information about cryptography in Bitwarden, see
[Bitwarden Security Whitepaper](https://bitwarden.com/help/bitwarden-security-white-paper/)
:::

## Symmetric encryption

:::info
All keys used for symmetric encryption should be 512 bits.
:::

The symmetric encryption
algorithm used for encrypting vault data is AES-256 in CBC mode. The key size is 256 bits and the IV
size is 128 bits. The IV is randomly generated for each field and stored along with the cipher text.
Each operation is accompanied by an HMAC (message authentication code) verification to ensure
integrity.

The stored symmetric-key object consists of two concatenated keys, one used for encryption and one
used for HMAC, both 256 bits. This is what we mean when saying that the "`UserKey` is 512 bits".

### Asymmetric encryption

The asymmetric encryption algorithm used for encrypting user data is RSA-2048. The key size is 2048
bits.
