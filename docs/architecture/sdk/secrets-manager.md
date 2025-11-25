# Secrets Manager

The Secrets Manager SDK is designed for external use. The SDK is written in Rust and provides
bindings for multiple languages.

## `bitwarden` crate

The `bitwarden` crate represents the entry point for consumers of the SDK and is responsible for
providing a cohesive interface. The crate re-exports functionality of the internal crates and
contains very little logic itself.

## Bindings

The Secrets Manager SDK provides bindings for multiple languages. Currently we utilize a mix of hand
written bindings for a C API, and generated bindings.

Many language bindings utilize the `bitwarden-c` crate that exposes a C API. This is then combined
with hand written bindings for the specific language. Since manually writing FFI bindings is time
consuming and difficult, a JSON-based API is provided by the `bitwarden-json` crate. This allows the
language bindings to simply contain three FFI functions, `init`, `run_command` and `free_memory`.
