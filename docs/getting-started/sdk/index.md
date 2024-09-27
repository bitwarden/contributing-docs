---
sidebar_position: 5
---

# SDK

Bitwarden provides a public Software Development Kit (SDK) for [Secrets Manager][sm] and an internal
SDK for the Bitwarden [Password Manager][pm]. The SDK is written in Rust and provides bindings for
multiple languages.

For more in-depth documentation please review the [SDK Architecture](../../architecture/sdk) page
and the project's [`README`](https://github.com/bitwarden/sdk).

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
npm link ../sdk/languages/sdk-client ../sdk/languages/wasm
```

:::warning

Running `npm ci` or `npm install` will replace the linked packages with the published version.

:::

### Mobile

#### Android

1. Build and publish the SDK to the local Maven repository:

   ```bash
   ../sdk/languages/kotlin/publish-local.sh
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
