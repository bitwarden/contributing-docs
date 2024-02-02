# Browser extension provider

Bitwarden supports passkeys in all browser by implementing the WebAuthn API. The browser does not
need to support WebAuthn natively, the extension will polyfill if necessary, effectively adding
support for passkeys to any browser.

## How the interface works

Browsers do not currently provide an API for extensions to provide passkeys alongside the native
implementation. This means that the extension must replace the native implementation with its own.
This is done by injecting a script into the page that replaces the native implementation with the
extension's implementation. In practice this is done by replacing the `navigator.credentials.create`
and `navigator.credentials.get` methods.

To avoid re-implementing the support for the entire FIDO2 ecosystem (hardware keys, CaBLE, etc.),
the extension has the ability to trigger the native implementation (usually referred to as a
"fallback"), if the user chooses to not proceed with Bitwarden. In practice this is done by storing
references to the native implementation functions in separate variable before replacing them.
