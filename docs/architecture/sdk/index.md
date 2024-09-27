---
sidebar_position: 3
---

# SDK Architecture

Bitwarden provides a public Software Development Kit (SDK) for [Secrets Manager][sm] and an internal
SDK for the Bitwarden [Password Manager][pm]. The SDK is written in Rust and provides bindings for
multiple languages. The general end goal of the SDK is to own everything up to the presentational
layers. This includes but is not limited to: API calls, data models, encryption, and business logic.

<Bitwarden>We have compiled a list of resources for learning Rust in a
[Confluence page](https://bitwarden.atlassian.net/wiki/spaces/DEV/pages/517898288/Rust+Learning+Resources).</Bitwarden>
For API documentation view the latest
[API documentation](https://sdk-api-docs.bitwarden.com/bitwarden/index.html) that also includes
internal private items.

## Architecture

The Bitwarden SDK is structured as a single [Git repository](https://github.com/bitwarden/sdk) with
multiple internal crates. Please review the `README` in the repository for up to date information
about the different crates.

We generally strive towards extracting features into separate crates to keep the `bitwarden-core`
crate as lean as possible. This has multiple benefits such as faster compile-time and clear
ownership of features.

### `bitwarden` crate

The `bitwarden` crate represents the entry point for consumers of the SDK and is responsible for
providing a cohesive interface. The crate re-exports functionality of the internal crates and
contains very little logic itself.

### `bitwarden-core` crate

The `bitwarden-core` crate contains the underlying functionality of the SDK. This includes a
`Client` struct. Other crates in the SDK depend on `bitwarden-core` and provide extensions to the
`Client` struct to implement specific domains.

## Client struct

The `Client` struct is the main entry point for the SDK and represents a single account instance.
Any action that needs to be performed on the account is generally done through the `Client` struct.
This allows the internal to be hidden from the consumer and provides a clear API.

We can extend the `Client` struct using extension traits in feature crates. This allow the
underlying implementation to be internal to the crate with only the public API exposed through the
`Client` struct. Below is an example of a generator extension for the `Client` struct.

```rust
pub struct ClientGenerator<'a> {
    client: &'a Client,
}

impl<'a> ClientGenerator<'a> {
    fn new(client: &'a Client) -> Self {
        Self { client }
    }

    pub fn password(&self, input: PasswordGeneratorRequest) -> Result<String, PasswordError> {
        password(input)
    }

}

// Extension which exposes `generator` method on the `Client` struct.
pub trait ClientGeneratorExt<'a> {
    fn generator(&'a self) -> ClientGenerator<'a>;
}

impl<'a> ClientGeneratorExt<'a> for Client {
    fn generator(&'a self) -> ClientGenerator<'a> {
        ClientGenerator::new(self)
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

The WebAssembly module is published on [npm](https://www.npmjs.com/package/@bitwarden/sdk-wasm) and
prerelease builds are published on
[GitHub Packages](https://github.com/bitwarden/sdk/pkgs/npm/sdk-wasm).

### C bindings

Many language bindings utilize the `bitwarden-c` crate that exposes a C API. This is then combined
with hand written bindings for the specific language. Since manually writing FFI bindings is time
consuming and difficult we generally provide a JSON based API through the `bitwarden-json` crate
which allows the language bindings to just contain three FFI functions, `init`, `run_command` and
`free_memory`.

[sm]: https://bitwarden.com/products/secrets-manager/
[pm]: https://bitwarden.com/
