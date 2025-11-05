---
sidebar_position: 2
---

# Password-Protected Key Envelope

## Overview

The Password-Protected Key Envelope is a cryptographic building block that enables sealing a
symmetric key with a low-entropy secret (such as a password or PIN). It produces an opaque blob that
can later be unsealed using the same password. This primitive is designed to protect cryptographic
keys at rest using user-memorable passwords, while defending against brute-force attacks through the
use of a memory-hard key derivation function.

The Password-Protected Key Envelope is used when a symmetric encryption key needs to be stored
securely using only a user-provided password, or other low-entropy secret.

Common applications can include:

- Protecting the account symmetric key for local unlock with a PIN
- Creating a password protected export
- Creating a url-shared encrypted item (sends)
  - The URL would contain the low-entropy secret that is used as the password, as the fragment

## Security

The Password-Protected Key Envelope design intends following security goals:

1. **SG1: Integrity (INT-CTXT security)** - The ciphertext must not be malleable. An attacker with
   full control over the encrypted data cannot modify it in ways that result in different but valid
   plaintexts.
2. **SG2: Confidentiality (IND-CCA security)** - The attacker cannot infer information about the
   contained key.
3. **SG3: Brute-force resistance**: A low entropy secret is used, so brute-forcing the secret must
   be made costly, while keeping unlock time reasonable.

### Attacker model

The Password-Protected Key Envelope is designed to protect against:

- **Offline brute-force attacks**: An attacker with a copy of the envelope but not the password must
  perform expensive KDF computations for each password guess
- **Rainbow table attacks**: Unique random salts prevent pre-computation attacks
- **Tampering detection**: Modification of the envelope or its parameters will be detected during
  decryption

### Cryptographic primitives

The envelope uses the following cryptographic primitives:

- **Key Derivation Function (KDF)**: Argon2id version 0x13
- **Authenticated Encryption**: XChaCha20-Poly1305
- **CSPRNG**: Cryptographically secure random number generator for salt and nonce generation

## Specification

### High-level operation

#### Sealing

1. Generate a random salt of 16 bytes
2. Derive an "envelope key" from the password and salt using Argon2id
3. Encrypt the target symmetric key using XChaCha20-Poly1305 with the envelope key
4. Package the ciphertext, nonce, KDF parameters, and salt into a COSE_Encrypt structure

#### Unsealing

1. Extract the KDF parameters and salt from the envelope
2. Derive the envelope key using the same Argon2id parameters and provided password
3. Decrypt the ciphertext using XChaCha20-Poly1305 with the derived envelope key
4. If decryption succeeds, return the unsealed symmetric key; if it fails, the password is incorrect
   or the envelope was tampered with

### Encoding format

The Password-Protected Key Envelope is encoded as a COSE_Encrypt object.

#### Structure

```text
COSE_Encrypt = [
    protected: bstr,           // Serialized protected headers
    unprotected: {             // Unprotected headers
        IV: bstr               // IV/nonce (24 bytes for XChaCha20)
    },
    ciphertext: bstr,          // Encrypted key material
    recipients: [              // Array with exactly one recipient
        COSE_Recipient
    ]
]

COSE_Recipient = [
    protected: {
        Alg: -70007              // Algorithm: Argon2id (private use)
    },
    unprotected: {               // Argon2id parameters
        KdfIterations: int,      // Iterations
        KdfMemory: int,          // Memory in KiB
        KdfParallelism: int,     // Parallelism
        KdfSalt: bstr            // Salt (16 bytes)
    },
    ciphertext: null
]
```

#### Protected headers

The protected header contains the content format identifier:

- `3`: Content type label
  - `"application/x.bitwarden.legacy-key"`: Legacy Bitwarden key format
  - Value `101`: COSE key format

#### Unprotected headers

The main COSE_Encrypt unprotected header contains:

- `5`: IV/nonce for XChaCha20-Poly1305 (24 bytes)

#### Recipient unprotected headers

The single recipient's unprotected headers contain Argon2id parameters:

- `70023` (ARGON2_ITERATIONS): Number of iterations (u32)
- `70024` (ARGON2_MEMORY): Memory in kibibytes/KiB (u32)
- `70025` (ARGON2_PARALLELISM): Degree of parallelism (u32)
- `70026` (ARGON2_SALT): Random salt (16 bytes)

#### Algorithm identifiers

- **Argon2id**: Private use algorithm identifier `-70007` (ALG_ARGON2ID13)

### Serialization

The COSE_Encrypt structure is serialized using CBOR and then encoded using Base64 for text-based
storage and transmission.

#### Wire format

```text
Base64(Cbor(COSE_Encrypt))
```
