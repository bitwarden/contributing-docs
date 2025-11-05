---
sidebar_position: 3
---

# EncString

EncString are symmetrically encrypted byte buffers that are encoded as a string. They don't need to
contain a string, but may do so. The type of EncString depends on the key type that was used to
generate.

## Encoding

There are three types of EncStrings, each with a different symmetric encryption algorithms used.

## AES256-CBC-HMAC

```
Ciphertext=CBC_Encrypt(plaintext)
2.Base64(IV)|Base64(Ciphertext)|Base64(Mac(IV+Ciphertext))
```

## XChaCha20-Poly1305 (Cose)

```
7.Base64(CoseEncrypt0(plaintext))
```

where the CoseEncrypt0 message has the following format:

```text
COSE_Encrypt0 = [
    protected: {
      KeyID: bstr              // ID of the key that was used to encrypt this object
      Alg: int                 // Algorithm used to encrypt the message
    },
    unprotected: {             // Unprotected headers
      IV: bstr                 // IV/nonce (24 bytes for XChaCha20)
    },
    ciphertext: bstr,          // Encrypted key material
]
```

these provide both information about the content format, as well as the key that was used to encrypt
the data.

## Aes256-CBC

```
0.Base64(IV)|Base64(CBC_Encrypt(plaintext))
```

:::warning

This mode of encryption is not authenticated, and is subject to tampering, including xor
malleability and padding oracles. This mode is being phased out and already not available for
encryption of new data. It is found in very old (pre 2019) accounts that have not been migrated.

:::

## Security - Size leaks

EncStrings leak information about the size of the contained objects. For aes-cbc EncStrings, this is
in buckets of 16 bytes. From an EncString, the property that the plaintext is [0-15], [16-31], etc.
bytes long can be inferred. For xchacha20-poly1305 EncStrings that contain an UTF-8 string, a custom
padding is applied that splits into blocks of 32 bytes. Encrypting in bigger blocks of data helps
remediate this.
