---
sidebar_position: 7
---

# Cryptography

This document in detail describes how cryptography in Bitwarden should be used, and serves as a
reference of how it is implemented.

Currently, there is a set of low-level APIs (EncString, UnsignedSharedKey, MasterKey) that have been
historically used to build most features, with each team owning the cryptographic constructions
created. Increasingly, high-level safe primitives are introduced that move the complexity out of
each teams ownership. These are not yet complete, and if your use-case is not covered by them,
please reach out! The goal of these is to have most teams never have to think about cryptography, or
having to do safety analysis. These abstract away all complex details and give teams a
low-complexity, easy to use and hard to mis-use interface to work with.
