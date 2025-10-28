---
sidebar_position: 3
---

# Data Envelope

Data envelope is a cryptographic format for encrypting structured data (documents). It addresses the
problem of: "I have a struct of related data that I want to protect from tampering and unauthorized
access.". It can be used for encrypting structured data such as vault items, reports, or user
settings, that are stored long-term. To solve existing usability goals, it includes versioning and
makes key-rotation and key-sharing simple by enforcing the use of per-document content-encryption
keys.

Data envelope is **not** designed for:

1. Encrypting cryptographic keys
2. Encrypting large binary blobs like such as file attachments

## Security

Data envelope fulfills three core security goals that formalize what end-to-end encryption means:

1. **SG1: Integrity (INT-CTXT security)** - The ciphertext must not be malleable. An attacker with
   full control over the encrypted data cannot modify it in ways that result in different but valid
   plaintexts.
2. **SG2: Confidentiality (IND-CCA security)** - The attacker cannot infer information about the
   plaintext contents beyond approximate length. The format uses padding to minimize length leakage.
3. **SG3: Context binding** - Data can only be decrypted in the correct context. For example, an
   encrypted vault item cannot be swapped into a user settings slot, preventing undefined behavior
   and security bugs.

### Attacker model

The attacker has complete control over the server and all data in transit (fully compromised server
model per P01 - Servers are zero knowledge). The attacker can:

1. Read all encrypted data
2. Modify or replace encrypted data
3. Replay old versions of encrypted data

## Format specification

A data envelope is a COSE_Encrypt0 structure with the following components:

### Protected header

The protected header contains:

1. **Algorithm (alg)**: Set to XChaCha20-Poly1305 (`-70000`)
2. **Key ID (kid)**: Identifier of the content encryption key used
3. **Content type**: Set to `"application/x.bitwarden.cbor-padded"`
4. **Namespace**: Custom header field containing an integer identifying the document type

### Unprotected header

The unprotected header contains:

1. **Initialization vector (iv)**: The nonce used for XChaCha20-Poly1305 encryption

### Serialization format

1. **Document encoding**: The plaintext document is serialized using CBOR
2. **Padding**: PKCS#5-style padding to 64-byte blocks is applied to hide the exact size

### Namespaces

Each document type is assigned a unique integer namespace identifier. The namespace is stored in the
protected header and validated during decryption. Examples:

```
VaultItem = 1
UserSettings = 2
Report = 3
```

Namespaces prevent documents from being decrypted in the wrong context, even if an attacker attempts
to substitute one encrypted document for another.

### Versioning

Documents support internal versioning. The direct inner contents of the unpadded payload are
(represented as json, but in reality encoded as CBOR):

```
{
    version: "1",
    content: {...}
}
```
