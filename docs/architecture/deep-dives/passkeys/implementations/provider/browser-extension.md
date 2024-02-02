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

`FIDO2 Client` is analogous to `WebAuthn Client` in the
[FIDO2 architecture](../architecture#overview-diagram), but is named differently due to naming
conflicts with the RP-side of the codebase. See [Naming Convention](../naming-convention) for more
information.

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

sprite $chip <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 426 550"><path d="M416 176.619c5.523 0 10-4.477 10-10s-4.477-10-10-10h-49.152v-26.381H416c5.523 0 10-4.477 10-10s-4.477-10-10-10h-49.152V69.152c0-5.523-4.477-10-10-10h-41.086V10c0-5.523-4.477-10-10-10s-10 4.477-10 10v49.152H269.38V10c0-5.523-4.477-10-10-10s-10 4.477-10 10v49.152H223V10c0-5.523-4.477-10-10-10s-10 4.477-10 10v49.152h-26.381V10c0-5.523-4.477-10-10-10s-10 4.477-10 10v49.152h-26.381V10c0-5.523-4.477-10-10-10s-10 4.477-10 10v49.152H69.152c-5.523 0-10 4.477-10 10v41.086H10c-5.523 0-10 4.477-10 10s4.477 10 10 10h49.152v26.381H10c-5.523 0-10 4.477-10 10s4.477 10 10 10h49.152V203H10c-5.523 0-10 4.477-10 10s4.477 10 10 10h49.152v26.381H10c-5.523 0-10 4.477-10 10s4.477 10 10 10h49.152v26.381H10c-5.523 0-10 4.477-10 10s4.477 10 10 10h49.152v41.086c0 5.523 4.477 10 10 10h41.086V416c0 5.523 4.477 10 10 10s10-4.477 10-10v-49.152h26.381V416c0 5.523 4.477 10 10 10s10-4.477 10-10v-49.152H203V416c0 5.523 4.477 10 10 10s10-4.477 10-10v-49.152h26.38V416c0 5.523 4.477 10 10 10s10-4.477 10-10v-49.152h26.381V416c0 5.523 4.477 10 10 10s10-4.477 10-10v-49.152h41.086c5.523 0 10-4.477 10-10v-41.086H416c5.523 0 10-4.477 10-10s-4.477-10-10-10h-49.152v-26.381H416c5.523 0 10-4.477 10-10s-4.477-10-10-10h-49.152V223H416c5.523 0 10-4.477 10-10s-4.477-10-10-10h-49.152v-26.381H416zM346.848 203h-8.821c-5.523 0-10 4.477-10 10s4.477 10 10 10h8.821v26.381h-8.821c-5.523 0-10 4.477-10 10s4.477 10 10 10h8.821v26.381h-8.821c-5.523 0-10 4.477-10 10s4.477 10 10 10h8.821v31.086h-31.086v-8.821c0-5.523-4.477-10-10-10s-10 4.477-10 10v8.821H269.38v-8.821c0-5.523-4.477-10-10-10s-10 4.477-10 10v8.821H223v-8.821c0-5.523-4.477-10-10-10s-10 4.477-10 10v8.821h-26.381v-8.821c0-5.523-4.477-10-10-10s-10 4.477-10 10v8.821h-26.381v-8.821c0-5.523-4.477-10-10-10s-10 4.477-10 10v8.821H79.152v-31.086h8.821c5.523 0 10-4.477 10-10s-4.477-10-10-10h-8.821v-26.381h8.821c5.523 0 10-4.477 10-10s-4.477-10-10-10h-8.821V223h8.821c5.523 0 10-4.477 10-10s-4.477-10-10-10h-8.821v-26.381h8.821c5.523 0 10-4.477 10-10s-4.477-10-10-10h-8.821v-26.381h8.821c5.523 0 10-4.477 10-10s-4.477-10-10-10h-8.821V79.152h31.086v8.821c0 5.523 4.477 10 10 10s10-4.477 10-10v-8.821h26.381v8.821c0 5.523 4.477 10 10 10s10-4.477 10-10v-8.821H203v8.821c0 5.523 4.477 10 10 10s10-4.477 10-10v-8.821h26.38v8.821c0 5.523 4.477 10 10 10s10-4.477 10-10v-8.821h26.381v8.821c0 5.523 4.477 10 10 10s10-4.477 10-10v-8.821h31.086v31.086h-8.821c-5.523 0-10 4.477-10 10s4.477 10 10 10h8.821v26.381h-8.821c-5.523 0-10 4.477-10 10s4.477 10 10 10h8.821V203z"/><path d="M266.774 149.225H159.225c-5.523 0-10 4.477-10 10v107.55c0 5.523 4.477 10 10 10h107.549c5.523 0 10-4.477 10-10v-107.55c0-5.523-4.477-10-10-10zm-10 107.55h-87.549v-87.55h87.549v87.55z"/></svg>

sprite $usb <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 125 465 500"><path d="M454.037 160.145h-84.631v-20.937c0-5.523-4.478-10-10-10H102.811C46.12 129.208 0 175.328 0 232.019S46.12 334.83 102.811 334.83h256.596c5.522 0 10-4.477 10-10v-20.937h84.631c5.522 0 10-4.477 10-10V170.145c-.001-5.523-4.478-10-10.001-10zM349.406 314.829H102.811c-45.663 0-82.811-37.148-82.811-82.81s37.148-82.811 82.811-82.811h246.596v165.621zm94.63-30.937h-74.631V180.145h74.631v103.747z"/><path d="M391.76 202.609h29.923v20H391.76zM391.76 241.428h29.923v20H391.76zM315.849 173.018h-137c-32.532 0-59 26.467-59 59 0 32.532 26.468 59 59 59h137c5.522 0 10-4.477 10-10v-98c0-5.523-4.478-10-10-10zm-10 98h-127c-21.505 0-39-17.495-39-39s17.495-39 39-39h127v78z"/></svg>
@enduml
```
