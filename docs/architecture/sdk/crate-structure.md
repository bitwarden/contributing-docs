---
sidebar_position: 2
---

# Crate structure

The internal SDK is organized as a mono-repository containing multiple Rust crates, each with a
focused responsibility. The crates form a layered architecture where higher-level crates depend on
lower-level ones, but never the reverse. This layering keeps the codebase modular and ensures that
each crate can be developed, tested, and compiled independently.

The [SDK repository](https://github.com/bitwarden/sdk-internal) groups its crates into four
categories:

- **Bindings** — compile the SDK for consumption by non-Rust platforms (WASM, iOS, Android)
- **Application Interfaces** — assemble features into product-specific clients
- **Features** — implement individual business-logic domains
- **Core and Utility** — provide the shared runtime, cryptographic primitives, and common types

From top to bottom, the dependency flow looks like this:

```kroki type=plantuml
@startuml
skinparam componentStyle rectangle

component "Bindings (WASM & UniFFI)" as bindings #e1f5ff

package "Application Interfaces" #fff3e0 {
    component "Password Manager" as passwordMgr
    component "Secrets Manager" as secretsMgr
}

package "Features" #f3e5f5 {
    component "Auth" as auth
    component "Vault" as vault
    component "Send" as send
    component "Generators" as generators
    component "Exporters" as export
}

component "Core" as core #e8f5e9

bindings --> passwordMgr
bindings --> secretsMgr
bindings --> core

passwordMgr --> auth
passwordMgr --> vault
passwordMgr --> send
passwordMgr --> generators
passwordMgr --> export
passwordMgr --> core

secretsMgr --> core

auth --> core
vault --> core
send --> core
generators --> core
export --> core

@enduml
```

## Bindings

Binding crates compile the SDK into platform-specific artifacts. They translate Rust types and
functions into interfaces that non-Rust consumers can call. The two binding strategies are:

- **WASM** — targets web clients via `wasm-bindgen`, producing a WebAssembly module consumed as an
  NPM package
- **UniFFI** — targets mobile clients, generating Kotlin and Swift bindings from Rust definitions

Bindings depend on the application interface crates and selectively re-export their public API. See
[Language bindings](language-bindings.md) for details on each strategy.

## Application interfaces

An application interface crate collects the features relevant to a Bitwarden product and presents
them through a single, cohesive client. For example, the Password Manager client exposes auth,
vault, send, generators, and exporters, while the Secrets Manager client exposes a narrower surface
focused on secret storage and retrieval.

These clients are the primary entry points for SDK consumers. The binding layer wraps them so that
callers on each platform interact with a consistent, product-scoped API rather than reaching into
individual feature crates directly.

## Core and utility

The `bitwarden-core` crate provides the shared runtime that every other crate builds on. This
includes client initialization, authentication state management, HTTP request handling, and common
error types. The companion `bitwarden-crypto` crate owns all cryptographic primitives — encryption,
decryption, key derivation, and key management.

Feature crates depend on core for their runtime but should not embed functionality that could be
shared. See the
[crate documentation](https://github.com/bitwarden/sdk-internal/tree/main/crates/bitwarden-core) for
specifics.

## Features and domains

Feature crates contain the business logic for a specific domain such as vault management,
authentication, or password generation. Each crate extends the `Client` struct with domain-specific
methods, keeping feature code isolated from unrelated domains.

Extracting features into their own crates keeps `bitwarden-core` lean and brings practical benefits:
faster incremental compile times, clearer code ownership, and the ability to evolve a domain without
touching shared infrastructure. <Bitwarden>These crates are usually owned and maintained by
individual teams.</Bitwarden>
