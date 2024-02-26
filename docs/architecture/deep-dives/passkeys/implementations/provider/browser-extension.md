# Browser Extension

Bitwarden supports passkeys in all browser by implementing the WebAuthn API. The browser does not
need to support WebAuthn natively, the extension will polyfill if necessary, effectively adding
support for passkeys to any browser.

## Compatibility

There are currently no browser APIs that allow extensions to provide passkeys alongside the
browser's native implementation. This means that the only way an extension can provide passkeys is
by completely replacing the native implementation with its own. This is done by injecting a script
into the page that replaces the native implementation with the extension's implementation. In
practice, this is done by reassigning the `navigator.credentials.create` and
`navigator.credentials.get` methods.

To avoid implementing support for the entire FIDO2 ecosystem (hardware keys, CaBLE, etc.), the
extension retains the ability to trigger the native implementation (usually referred to as a
"fallback"), if the user chooses to not proceed with Bitwarden. In practice this is done by storing
references to the native functions in separate variables before reassigning.

## Architecture

Bitwarden implements a simplified version of the FIDO2 architecture based solely on the
[WebAuthn API specification](https://www.w3.org/TR/webauthn-3/). This is because the embedded
`FIDO2 Authenticator` will never be used in a standalone context and does not need to support the
full CTAP2 protocol.

:::info

`FIDO2 Client` is analogous to `WebAuthn Client` in the [FIDO2 Overview](../../overview#diagram),
but is named differently due to naming conflicts with the RP implementation also in the Bitwarden
codebase. See [Naming Convention](../../naming-convention) for more information.

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
            component "Custom WebAuthn API"
            component "Messenger" as pageScriptMessenger

            [Custom WebAuthn API] -> [pageScriptMessenger]
        }

        component "Content Script" {
            component "Messenger" as contentScriptMessenger
        }

        component "User Agent WebAuthn API" <<Native>>

        [JavaScript Application] -> [Custom WebAuthn API]
        [Custom WebAuthn API] --> [User Agent WebAuthn API]
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

## User Presence

To simplify the user experience and to avoid the need for multiple user presence checks, the
implementation of the browser extension authenticator deviates from the WebAuthn specification, by
terminating the process and triggering a fallback if no matching credentials are found. This is
justified by the fact that the native implementation will always require user presence, and the
extension will always trigger the native implementation if the user chooses to not proceed with
Bitwarden.

### Limitations and risks

This deviation from the specification is a risk, and allows an attacker to determine if a user has a
specific credential stored in their vault (i.e. credential enumeration). This is because the
extension will always trigger the native implementation if no matching credentials are found,
something that web pages are able to detect (see
[Credential existence checker](https://coroiu.github.io/webauthn-tools/security/existence-checker)).
However, this enumeration only works for credentials bound to the attacker's `rpId` (i.e. their own
website), and is only possible if the user has already unlocked their vault. This risk is accepted
as a trade-off for a better user experience.
