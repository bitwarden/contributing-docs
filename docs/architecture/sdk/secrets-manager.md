# Secrets Manager

The Secrets Manager SDK is designed for external use. The SDK is written in Rust and provides
bindings for multiple languages.

### `bitwarden` crate

The `bitwarden` crate represents the entry point for consumers of the SDK and is responsible for
providing a cohesive interface. The crate re-exports functionality of the internal crates and
contains very little logic itself.
