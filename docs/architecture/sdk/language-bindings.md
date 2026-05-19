---
sidebar_position: 5
---

# Language bindings

The internal SDK supports mobile and web platforms and uses UniFFI and `wasm-bindgen` to generate
bindings for those targets.

## Mobile bindings

We use [UniFFI](https://github.com/mozilla/uniffi-rs/) to generate bindings for the mobile
platforms, more specifically we publish Android and iOS libraries with Kotlin and Swift bindings,
respectively. While UniFFI supports additional languages they typically lag a few releases behind
the UniFFI core library.

The Android bindings are currently published on
[GitHub Packages](https://github.com/bitwarden/sdk/packages/) in the `sdk_internal` repository. The
Swift package is published in the [`sdk-swift` repository](https://github.com/bitwarden/sdk-swift).

## Web bindings

For the web bindings we use [`wasm-bindgen`](https://github.com/rustwasm/wasm-bindgen) to generate a
WebAssembly module that can be used in JavaScript / TypeScript. To ensure compatibility with
browsers that do not support WebAssembly, we also generate a JavaScript module from the WebAssembly
that can be used as a fallback.

The WebAssembly module is published on [npm](https://www.npmjs.com/package/@bitwarden/sdk-internal).

For detailed guidance on choosing between `wasm-bindgen` and `tsify` for web interoperability, see
[Web interoperability](web/interoperability.md).
