---
sidebar_position: 5
---

# Internal SDK

For more in-depth documentation please review the [SDK Architecture](../../architecture/sdk) and the
Internal SDK project's [`README`](https://github.com/bitwarden/sdk-internal).

## Requirements

- [Rust](https://www.rust-lang.org/tools/install) latest stable version - (preferably installed via
  [rustup](https://rustup.rs/))
- NodeJS and NPM.

See the [Tools and Libraries](../tools/index.md) page for more information.

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
npm link ../sdk-internal/languages/js/sdk-internal
```

:::warning

Running `npm ci` or `npm install` will replace the linked packages with the published version.

:::

### Mobile

#### Android

1. Build and publish the SDK to the local Maven repository:

   ```bash
   ../sdk-internal/languages/kotlin/publish-local.sh
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
