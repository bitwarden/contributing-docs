# Browser extension provider

Bitwarden supports passkeys in all browser by implementing the WebAuthn API. The browser does not
need to support WebAuthn natively, the extension will polyfill if necessary, effectively adding
support for passkeys to any browser.

## How it works

Browsers do not currently provide an API for extensions to provide passkeys alongside the native
implementation. This means that the extension must replace the native implementation with its own.
This is done by injecting a script into the page that replaces the native implementation with the
extension's implementation. In practice this is done by replacing the `navigator.credentials.create`
and `navigator.credentials.get` methods.

To avoid re-implementing the entire WebAuthn API logic, the extension has the ability fall back to
the native implementation, if the user chooses to not proceed with the Bitwarden extension. This
allows the extension to add support for passkeys without breaking support for other authenticators.
In practice this is done by storing the native implementation in a separate variable before
replacing it with the extension's implementation.
