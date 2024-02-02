# Browser Extension

Bitwarden supports passkeys in all browser by implementing the WebAuthn API. The browser does not
need to support WebAuthn natively, the extension will polyfill if necessary, effectively adding
support for passkeys to any browser.

## Compatibility

There are currently no browser APIs that allow extensions to provide passkeys alongside the
browser's native implementation. This means that the only way an extension can provide passkeys is
by completely replacing the native implementation with its own. This is done by injecting a script
into the page that replaces the native implementation with the extension's implementation. In
practice this is done by reassigning the `navigator.credentials.create` and
`navigator.credentials.get` methods.

To avoid implementing support for the entire FIDO2 ecosystem (hardware keys, CaBLE, etc.), the
extension retains the ability to trigger the native implementation (usually referred to as a
"fallback"), if the user chooses to not proceed with Bitwarden. In practice this is done by storing
references to the native functions in separate variables before reassigning.

## Architecture

Bitwarden implements a simplified version of the FIDO2 architecture based solely on the WebAuthn API
specification. This is because the embedded `FIDO2 Authenticator` will never be used in a standalone
context and does therefore not need to support the full CTAP2 protocol.

:::info

`FIDO2 Client` is analogous to `WebAuthn Client` in the [FIDO2 Overview](../../overview#diagram),
but is named differently due to naming conflicts with the RP-side of the codebase. See
[Naming Convention](../../naming-convention) for more information.

:::

```kroki type=plantuml
@startuml
skinparam BackgroundColor transparent
skinparam componentStyle rectangle

title Browser extension FIDO2 architecture overview

component "Browser" {
    component "Web page" {
        component "JavaScript Application"
        component "Page Script" <<Injected>> {
            component "WebAuthn API"
            component "Messenger" as pageScriptMessenger

            [WebAuthn API] -> [pageScriptMessenger]
        }

        component "Content Script" {
            component "Messenger" as contentScriptMessenger
        }

        component "User Agent WebAuthn API" <<Native>>

        [JavaScript Application] -> [WebAuthn API]
        [WebAuthn API] --> [User Agent WebAuthn API]
    }

    component "Extension" {
        component "Background Script"
        component "FIDO2 Client"
        component "FIDO2 Authenticator"
        component "FIDO2 User Interface"
        database "Vault"

        [FIDO2 Client] -> [FIDO2 Authenticator]
        [FIDO2 Authenticator] -> [Vault]
        [FIDO2 Authenticator] --> [FIDO2 User Interface]
    }

    [pageScriptMessenger] <--> [contentScriptMessenger]
    [contentScriptMessenger] --> [Background Script]
    [Background Script] -> [FIDO2 Client]
}
@enduml
```
