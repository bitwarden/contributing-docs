---
sidebar_position: 5
---

# Internal SDK

For more in-depth documentation please review the [SDK Architecture](../../../architecture/sdk) and
the Internal SDK project's [`README`](https://github.com/bitwarden/sdk-internal).

## Requirements

- [Rust](https://www.rust-lang.org/tools/install) latest stable version - (preferably installed via
  [rustup](https://rustup.rs/))
- NodeJS and NPM.

See the [Tools and Libraries](../../tools/index.md) page for more information.

## Setup instructions

1.  Clone the repository:

    ```bash
    git clone https://github.com/bitwarden/sdk-internal.git
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

### Web clients

The SDK is integrated into the web clients as a WebAssembly module. To build the SDK for the web
clients, run the following command:

```bash
cd crates/bitwarden-wasm-internal
./build.sh
```

If you encounter any issues make sure that you have you have the required dependencies installed.
See `crates/bitwarden-wasm-internal/README.md` for more information.

### Mobile clients

The SDK is integrated into the mobile clients as a shared library using the UniFFI framework. The
SDK is built for each platform separately.

#### Android

The SDK is integrated into the Android client as a Maven dependency. The commands for building the
Android library differ depending on which CPU architecture you are targeting. For more information,
see the `crates/bitwarden-uniffi/kotlin/README.md` file.

#### iOS

The SDK is integrated into the iOS client as a Swift package. To build the SDK for iOS, run the
following command:

```bash
cd crates/bitwarden-uniffi/swift
./build.sh
```

If you encounter any issues make sure that you have you have the required dependencies installed.
See `crates/bitwarden-uniffi/swift/README.md` for more information.

## Linking the SDK to clients

After modifying the SDK, it can be beneficial to test the changes in the client applications. To do
so you will need to update the SDK reference in the client applications.

These instructions assumes you have a directory structure similar to:

```text
sdk/
clients/
ios/
android/
```

### Web clients

The web clients uses NPM to install the SDK as a dependency. NPM offers a dedicated command
[`link`][npm-link] which can be used to temporarily replace the packages with a local version.

```bash
npm link ../sdk-internal/crates/bitwarden-wasm-internal/npm
```

:::warning

Running `npm ci` or `npm install` will replace the linked packages with the published version.

:::

### Mobile

#### Android

1. Build and publish the SDK to the local Maven repository:

   ```bash
   ../sdk-internal/crates/bitwarden-uniffi/kotlin/publish-local.sh
   ```

2. Set the user property `localSdk=true` in the `user.properties` file.

#### iOS

Run the bootstrap script with the `LOCAL_SDK` environment variable set to true in order to use the
local SDK build:

```bash
LOCAL_SDK=true ./Scripts/bootstrap.sh
```

[npm-link]: https://docs.npmjs.com/cli/v9/commands/npm-link
[sm]: https://bitwarden.com/products/secrets-manager/
[pm]: https://bitwarden.com/
