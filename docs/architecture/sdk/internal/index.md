# Internal SDK

The Internal SDK is designed for internal use within Bitwarden and supports key functionality for
managing encrypted data, vault access, and user authentication. Written in Rust, the SDK is
versatile and provides bindings for a variety of platforms, including mobile clients (Kotlin and
Swift) and web clients (JavaScript/TypeScript).

This section will provide guidance on developing with the SDK in a way that ensures compatibility
across both mobile and web platforms. It will cover best practices for structuring code, addressing
platform-specific challenges, and ensuring that your implementation works seamlessly across
Bitwarden’s mobile and web applications.

## Architecture

The internal SDK is structured as a single
[Git repository](https://github.com/bitwarden/sdk-internal) with multiple internal crates. This
document describes the general structure of the project. Please review the `README` in the
repository for information about the specific crates or implementation details.

Crates in the project fall into one of these categories.

- Bindings
- Application Interfaces
- Features
- Core and Utility

We generally strive towards extracting features into separate crates to keep the `bitwarden-core`
crate as lean as possible. This has multiple benefits such as faster compile-time and clear
ownership of features.

This hierarchy winds up producing a structure that looks like:

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

component "Core Runtime" as core #e8f5e9

package "Back-End API Interfaces" #ffebee {
  component "API Client" as api_client
  component "Identity Client" as identity_client
  component "API Client Base" as api_base
}

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

auth --> core : Extends
vault --> core : Extends
send --> core : Extends
generators --> core : Extends
export --> core : Extends

core --> api_client : Manages
core --> identity_client : Manages

api_base --> api_client : Provides shared functionality for
api_base --> identity_client : Provides shared functionality for

@enduml
```

### Bindings

Bindings are those crates whose purpose is to provide bindings for other projects by targeting
`wasm`, iOS, and Android. The two mobile targets are built using UniFFI. See
[below](#language-bindings) for more information.

### Application Interfaces

An application interface collects the various features relevant for a given Bitwarden product, e.g.
Password Manager, or Secrets Manager, into a single easy-to-use client for that particular product.

These clients, exposed through an external binding layer, are how consumers of the SDK will interact
with it.

### Features and Domains

Feature and domain crates constitute the application business logic. Feature crates depend on
`bitwarden-core` for their runtime and provide extensions to the `Client` struct to implement
specific domains. <Bitwarden>These crates are usually owned and maintained by individual
teams.</Bitwarden>

The each feature or domain crate exposes its extended `Client` struct(s), which can be further
grouped into application interfaces for consumption. See the
[`VaultClient`](https://github.com/bitwarden/sdk-internal/blob/main/crates/bitwarden-vault/src/vault_client.rs)
as as example.

### Core

The `bitwarden-core` crate contains the core runtime of the SDK. See the
[crate documentation](https://github.com/bitwarden/sdk-internal/tree/main/crates/bitwarden-core) for
more details.

### Server API interfaces

The `bitwarden-core` runtime includes the management and persistence of `ApiClient`s to manage HTTP
requests to our server back-end. This includes requests to our API and our Identity services. These
clients are defined in the `bitwarden-api-*` crates, such as `bitwarden-api-api` and
`bitwarden-api-identity`, which manage the API and Identity clients, respectively. These crates also
manage the request and response model bindings for the contracts with our server endpoints. For more
detail on our bindings, see the `sdk-internal`
[`README`](https://github.com/bitwarden/sdk-internal#server-api-bindings).

## Language bindings

The internal SDK supports mobile and web platforms and uses UniFFI and `wasm-bindgen` to generate
bindings for those targets.

### Mobile bindings

We use [UniFFI](https://github.com/mozilla/uniffi-rs/) to generate bindings for the mobile
platforms, more specifically we publish Android and iOS libraries with Kotlin and Swift bindings,
respectively. While UniFFI supports additional languages they typically lag a few releases behind
the UniFFI core library.

The Android bindings are currently published on
[GitHub Packages](https://github.com/bitwarden/sdk/packages/) in the `sdk_internal` repository. The
Swift package is published in the [`sdk-swift` repository](https://github.com/bitwarden/sdk-swift).

### Web bindings

For the web bindings we use [`wasm-bindgen`](https://github.com/rustwasm/wasm-bindgen) to generate a
WebAssembly module that can be used in JavaScript / TypeScript. To ensure compatibility with
browsers that do not support WebAssembly, we also generate a JavaScript module from the WebAssembly
that can be used as a fallback.

The WebAssembly module is published on [npm](https://www.npmjs.com/package/@bitwarden/sdk-internal).

<Bitwarden>
## Adding New Functionality

### Adding new feature and domain crates

Teams are encouraged to add their own feature or domain crates as they build additional
functionality in the SDK.

Adding the crate and referencing it from the appropriate application interface clients should be
done as a separate pull request from adding any functionality in the crate itself.

This will ensure that the scope of the initial setup pull request is small and focused, as our
Platform team will be responsible for reviewing additions to the application clients.

### How do I decide what to move to the internal SDK?

Considering adding to or moving code into the SDK? Review these questions to help come to a
decision.

- Does the functionality or service depend on other functionality that is not currently part of the
  SDK?
  - Moving that functionality to the SDK is not recommended at this time, but asking the team
    responsible for the other functionality to migrate that to the SDK _is_ recommended.
- Does the functionality require authenticated requests?
  - The autogenerated bindings can help with that. See [`bitwarden-vault`][vault-crate] as an
    example.
- Does this functionality require persistent state?
  - Review the docs for [`bitwarden-state`][state-crate] and see [`bitwarden-vault`][vault-crate] as
    an example.
- Is the functionality only relevant for a single client?
  - There is likely not much chance of reusing that functionality, but it may still be added to the
    SDK.
- Does the functionality need the SDK to produce an observable or reactive value?
  - The SDK does not support reactivity at this time. However we still encourage migrating the
    relevant business logic to the SDK and then building reactivity with that logic in TypeScript.

</Bitwarden>

[state-crate]: https://github.com/bitwarden/sdk-internal/tree/main/crates/bitwarden-state
[vault-crate]: https://github.com/bitwarden/sdk-internal/tree/main/crates/bitwarden-vault
