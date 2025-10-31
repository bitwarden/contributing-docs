# Password Manager

The Password Manager SDK is designed for internal use within Bitwarden and supports key
functionality for managing encrypted data, vault access, and user authentication. Written in Rust,
the SDK is versatile and provides bindings for a variety of platforms, including mobile clients
(Kotlin and Swift) and web clients (JavaScript/TypeScript).

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

<details>
<summary>Prior to [bitwarden/sdk-internal#468][sdk-internal-468], the application interfaces had not been explicitly created.</summary>

```kroki type=plantuml
@startuml
skinparam componentStyle rectangle
skinparam defaultTextAlignment center

component "Bindings (WASM & UniFFI)" as bindings #lightblue

component "Core" as core #lightgreen

package "Features" {
    component "Auth" as auth #lavender
    component "Vault" as vault #lavender
    component "Exporters" as export #lavender
    component "Generators" as generators #lavender
    component "Send" as send #lavender
    component "Crypto" as crypto #lavender
}

bindings --> core
bindings --> auth
bindings --> vault
bindings --> export
bindings --> generators
bindings --> send

auth --> core
vault --> core
export --> core
generators --> core
send --> core
crypto --> core

@enduml
```

</details>

### Bindings

Application interfaces are those crates whose purpose is to provide bindings for other projects by
targeting `wasm`, iOS, and Android. The two mobile targets are built using UniFFI. See
[below](#language-bindings) for more information.

### Application Interfaces

A client aggregator collects the various features relevant for a given Bitwarden product, e.g.
Password Manager, or Secrets Manager, into a single easy-to-use crate for that particular product.

### Core and Utility

The `bitwarden-core` crate contains the underlying functionality of the SDK. This includes a
[`Client` struct](#client-struct).

### Features and Domains

Feature and domain crates constitute the application business logic. Feature crates depend on
`bitwarden-core` and provide extensions to the Client struct to implement specific domains.
<Bitwarden>These crates are usually owned and maintained by individual teams.</Bitwarden>

There are a number of utility crates that provide a very narrow scope of functionality and do not
necessarily correspond to a single domain, or may be shared across multiple domains. Examples
include UUID handling and cryptographic primitives.

## Client Struct

The `Client` struct is the main entry point for the SDK and represents a single account instance.
Any action that needs to be performed on the account is generally done through the `Client` struct.
This allows the internals to be hidden from the consumer and provides a clear API.

We can extend the `Client` struct using extension traits in feature crates. This allow the
underlying implementation to be internal to the crate with only the public API exposed through the
`Client` struct. Below is an example of a generator extension for the `Client` struct.

```rust
/// Generator extension for the Client struct
#[cfg_attr(feature = "wasm", wasm_bindgen)]
pub struct GeneratorClient {
    client: Client,
}

#[cfg_attr(feature = "wasm", wasm_bindgen)]
impl GeneratorClient {
    fn new(client: Client) -> Self {
        Self { client }
    }

    /// Generates a password based on the provided request.
    pub fn password(&self, input: PasswordGeneratorRequest) -> Result<String, PasswordError> {
        password(input)
    }
}

/// Extension which exposes `generator` method on the `Client` struct.
pub trait GeneratorClientExt {
    fn generator(&self) -> GeneratorClient;
}

impl GeneratorClientExt for Client {
    fn generator(&self) -> GeneratorClient {
        GeneratorClient::new(self.clone())
    }
}
```

## Language bindings

The SDK is currently exposed with multiple language bindings. Currently we utilize a mix of hand
written bindings for a C API, and programmatically generated bindings.

### Mobile bindings

We use [UniFFI](https://github.com/mozilla/uniffi-rs/) to generate bindings for the mobile
platforms, more specifically we publish Android and iOS libraries with Kotlin and Swift bindings,
respectively. While UniFFI supports additional languages they typically lag a few releases behind
the UniFFI core library.

The Android bindings are currently published on
[GitHub Packages](https://github.com/bitwarden/sdk/packages/1945788) in the SDK repository. The
swift package is published in the [`sdk-swift` repository](https://github.com/bitwarden/sdk-swift).

### Web bindings

For the web bindings we use [`wasm-bindgen`](https://github.com/rustwasm/wasm-bindgen) to generate a
WebAssembly module that can be used in JavaScript / TypeScript. To ensure compatibility with
browsers that do not support WebAssembly, we also generate a JavaScript module from the WebAssembly
that can be used as a fallback.

The WebAssembly module is published on [npm](https://www.npmjs.com/package/@bitwarden/sdk-internal).

### C bindings

Many language bindings utilize the `bitwarden-c` crate that exposes a C API. This is then combined
with hand written bindings for the specific language. Since manually writing FFI bindings is time
consuming and difficult we generally provide a JSON based API through the `bitwarden-json` crate
which allows the language bindings to just contain three FFI functions, `init`, `run_command` and
`free_memory`.

## Adding New Functionality

Considering adding to or moving code into the SDK? Review these questions to help come to a
decision.

- Does the functionality or service depend on other functionality that is not currently part of the
  SDK?
  - Moving that functionality to the SDK is not recommended at this time.
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

[sdk-internal-468]: https://github.com/bitwarden/sdk-internal/pull/468
[state-crate]: https://github.com/bitwarden/sdk-internal/tree/main/crates/bitwarden-state
[vault-crate]: https://github.com/bitwarden/sdk-internal/tree/main/crates/bitwarden-vault
