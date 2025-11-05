---
sidebar_position: 0
---

# Specification

Specification covers the design of the various cryptographic constructs used in Bitwarden, and
explains the rationale behind them. This is section is not meant for consumers of the APIs, but for
developers working on the cryptography and for security researches verifying the designs.

## Cose

Most new constructions and primitives are encoded in
[Cose](https://datatracker.ietf.org/doc/html/rfc8152) objects. Reading the COSE standard is helpful
to understand other parts of the specification. There are objects that are not yet transitioned.
