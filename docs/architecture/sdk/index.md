---
sidebar_position: 3
---

# SDK Architecture

The Bitwarden SDK is designed for internal use within Bitwarden and provides shared functionality
across all Bitwarden clients. It serves as the single source of truth for core business logic.
Written in Rust, the SDK is versatile and provides bindings for a variety of platforms, including
mobile clients (Kotlin and Swift) and web clients (JavaScript/TypeScript). The general aspiration is
to write as much code as possible once in the SDK and have it consumed by all clients, ensuring
feature parity and reducing duplication.

<Bitwarden>We have compiled a list of resources for learning Rust in a
[Confluence page](https://bitwarden.atlassian.net/wiki/spaces/DEV/pages/517898288/Rust+Learning+Resources).</Bitwarden>
For API documentation view the latest
[API documentation](https://sdk-api-docs.bitwarden.com/bitwarden/index.html) that also includes
internal private items.

## Architecture Overview

```kroki type=plantuml
@startuml
skinparam packageStyle rectangle
skinparam componentStyle rectangle
skinparam linetype ortho
skinparam shadowing false
skinparam defaultTextAlignment center

skinparam package {
  BackgroundColor<<clients>> #E3F2FD
  BorderColor<<clients>> #1976D2
  BackgroundColor<<bindings>> #FFF3E0
  BorderColor<<bindings>> #F57C00
  BackgroundColor<<sdk>> #E8F5E9
  BorderColor<<sdk>> #388E3C
}

skinparam component {
  BackgroundColor<<sdk>> #E8F5E9
  BorderColor<<sdk>> #388E3C
}

skinparam component {
  BackgroundColor #FFFFFF
  BorderColor #424242
  FontSize 12
}

package "Client Applications" <<clients>> {
  package "TypeScript" {
    [Web vault] as web
    [Desktop] as desktop
    [Browser extension] as browser
    [CLI] as cli
  }
  package "Mobile" {
    [iOS\n(Swift)] as ios
    [Android\n(Kotlin)] as android
  }
}

package "Binding Layer" <<bindings>> as bindings {
  [WASM] as wasm
  [UniFFI] as uniffi
}

package "Rust SDK" <<sdk>> as sdk {
  package "Application Interfaces" {
    [Password Manager] as pm
    [Secrets Manager] as sm
  }
  package "Features" {
    [Send] as send
    [Generators] as generators
    [Exporters] as exporters
    [Auth] as auth
    [Vault] as vault
  }
  [Core Runtime] as core
}

TypeScript --> wasm
web -[hidden]> wasm
desktop -[hidden]> wasm
browser -[hidden]> wasm
cli -[hidden]> wasm
Mobile --> uniffi
ios -[hidden]> uniffi
android -[hidden]> uniffi

bindings --> pm
bindings --> sm

[Application Interfaces] --> [Features]
[Application Interfaces] --> core
[Features] --> core : extends

@enduml
```

## What Belongs in the SDK

**The guiding principle: everything except presentational logic belongs in the SDK.**

The SDK should own all business logic that would otherwise be duplicated across clients. Client code
should be limited to UI rendering, platform-specific integrations, and calling SDK methods.

### SDK Responsibility

| Layer             | Owned By | Examples                                     |
| ----------------- | -------- | -------------------------------------------- |
| Presentation      | Client   | UI components, navigation, platform gestures |
| Business Logic    | **SDK**  | Validation, transformations, calculations    |
| State Management  | **SDK**  | User state, vault data, sync coordination    |
| API Communication | **SDK**  | Request/response handling, serialization     |
| Cryptography      | **SDK**  | Encryption, decryption, key derivation       |
| Data Models       | **SDK**  | Domain objects, view models                  |

### Decision Checklist

When implementing a feature, ask:

**Put it in the SDK if:**

- The logic will be used across multiple clients (web, mobile, desktop)
- It involves cryptographic operations or sensitive data handling
- It's business logic that should behave identically everywhere
- It doesn't depend on platform-specific UI frameworks

**Keep it in application code if:**

- It's purely presentational (rendering, animations, gestures)
- It requires platform-specific APIs with no cross-platform abstraction

## In this section

- [Crate structure](crate-structure.md) — how the SDK repository and crates are organized
- [Client patterns](client-patterns.md) — structuring Rust client types
- [Data models](data-models.md) — public and internal data model conventions
- [Language bindings](language-bindings.md) — UniFFI (mobile) and `wasm-bindgen` (web)
- [Dependencies](dependencies.md) — dependency management policy
- [Versioning](versioning.md) — backward compatibility and changelog
- [Secrets Manager SDK](secrets-manager.md) — the external-facing Secrets Manager SDK
- [Web](web/index.md) — web-specific guidance and interoperability
