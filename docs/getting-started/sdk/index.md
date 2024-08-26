---
sidebar_position: 5
---

# SDK

Bitwarden provides a public Software Development Kit (SDK) for [Secrets Manager][sm] and an internal
SDK for the Bitwarden [Password Manager][pm]. The SDK is written in Rust and provides bindings for
multiple languages.

## Requirements

- [Rust](https://www.rust-lang.org/tools/install) latest stable version - (preferably installed via
  [rustup](https://rustup.rs/))
- NodeJS and NPM.

See the [Tools and Libraries](../tools/index.md) page for more information.

## Setup instructions

1.  Clone the repository:

    ```bash
    git clone https://github.com/bitwarden/sdk.git
    cd sdk
    ```

2.  Install the dependencies:

    ```bash
    npm ci
    ```

## Building the SDK

To build the SDK, run the following command:

```bash
cargo build
```

For more information on how to use the SDK, see the [repository](https://github.com/bitwarden/sdk).

[sm]: https://bitwarden.com/products/secrets-manager/
[pm]: https://bitwarden.com/
