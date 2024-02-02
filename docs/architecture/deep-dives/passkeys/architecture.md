---
title: Architecture
---

# FIDO2 Architecture

FIDO2 can be broken down into two main components: WebAuthn and CTAP. WebAuthn is a web standard
that allows for the creation and use of passkeys through a well defined JavaScript interface, and
CTAP is a protocol for communicating with external authenticators, such as hardware security keys
(e.g. YubiKeys).

The interaction between these two components can vary depending on the use case:

- When using platform credentials, the interaction is always between the browser and the platform
  authenticator (i.e. the operating system) using native APIs.
- When using roaming authenticators, the interaction can be either:
  - Mediated by the platform
  - Directly between the browser and the authenticator using e.g. USB/HID or BLE protocols.

## Overview diagram

:::note

The JavaScript Application is also part of the RP, even if the diagram does not reflect this.

:::

```kroki type=plantuml
@startuml
skinparam BackgroundColor transparent
skinparam componentStyle rectangle

title FIDO2 Overview

component "Relying Party" {
    component "Server Application" {
        component "HTTPS API"
        component "Core"
        component "FIDO2 Library"

        database "Database"


        [HTTPS API] --> [Core]
        [Core] --> [FIDO2 Library]
        [Core] -> [Database]
    }
}

component "Client platform" {
    component "Browser" {
        component "JavaScript Application"

        component "User Agent" {
            component "WebAuthn API"
            component "WebAuthn Client"
        }

        [WebAuthn API] - [WebAuthn Client]
        [JavaScript Application] --> [WebAuthn API]
    }

    component "Operating System" {
        component "Platform Auth API"
        component "Platform Auth Client"
        component "Platform Authenticator" <<$chip{scale=0.1}>>

        [Platform Auth API] - [Platform Auth Client]
        [Platform Auth Client] --> [Platform Authenticator]
    }
}

component "Roaming Authenticator" <<$usb{scale=0.1}>>

[WebAuthn Client] --> [Roaming Authenticator] : CTAP
[WebAuthn Client] --> [Platform Auth API]
[Platform Auth Client] --> [Roaming Authenticator] : CTAP

[JavaScript Application] -> [HTTPS API]

sprite $chip <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 426 550"><path d="M416 176.619c5.523 0 10-4.477 10-10s-4.477-10-10-10h-49.152v-26.381H416c5.523 0 10-4.477 10-10s-4.477-10-10-10h-49.152V69.152c0-5.523-4.477-10-10-10h-41.086V10c0-5.523-4.477-10-10-10s-10 4.477-10 10v49.152H269.38V10c0-5.523-4.477-10-10-10s-10 4.477-10 10v49.152H223V10c0-5.523-4.477-10-10-10s-10 4.477-10 10v49.152h-26.381V10c0-5.523-4.477-10-10-10s-10 4.477-10 10v49.152h-26.381V10c0-5.523-4.477-10-10-10s-10 4.477-10 10v49.152H69.152c-5.523 0-10 4.477-10 10v41.086H10c-5.523 0-10 4.477-10 10s4.477 10 10 10h49.152v26.381H10c-5.523 0-10 4.477-10 10s4.477 10 10 10h49.152V203H10c-5.523 0-10 4.477-10 10s4.477 10 10 10h49.152v26.381H10c-5.523 0-10 4.477-10 10s4.477 10 10 10h49.152v26.381H10c-5.523 0-10 4.477-10 10s4.477 10 10 10h49.152v41.086c0 5.523 4.477 10 10 10h41.086V416c0 5.523 4.477 10 10 10s10-4.477 10-10v-49.152h26.381V416c0 5.523 4.477 10 10 10s10-4.477 10-10v-49.152H203V416c0 5.523 4.477 10 10 10s10-4.477 10-10v-49.152h26.38V416c0 5.523 4.477 10 10 10s10-4.477 10-10v-49.152h26.381V416c0 5.523 4.477 10 10 10s10-4.477 10-10v-49.152h41.086c5.523 0 10-4.477 10-10v-41.086H416c5.523 0 10-4.477 10-10s-4.477-10-10-10h-49.152v-26.381H416c5.523 0 10-4.477 10-10s-4.477-10-10-10h-49.152V223H416c5.523 0 10-4.477 10-10s-4.477-10-10-10h-49.152v-26.381H416zM346.848 203h-8.821c-5.523 0-10 4.477-10 10s4.477 10 10 10h8.821v26.381h-8.821c-5.523 0-10 4.477-10 10s4.477 10 10 10h8.821v26.381h-8.821c-5.523 0-10 4.477-10 10s4.477 10 10 10h8.821v31.086h-31.086v-8.821c0-5.523-4.477-10-10-10s-10 4.477-10 10v8.821H269.38v-8.821c0-5.523-4.477-10-10-10s-10 4.477-10 10v8.821H223v-8.821c0-5.523-4.477-10-10-10s-10 4.477-10 10v8.821h-26.381v-8.821c0-5.523-4.477-10-10-10s-10 4.477-10 10v8.821h-26.381v-8.821c0-5.523-4.477-10-10-10s-10 4.477-10 10v8.821H79.152v-31.086h8.821c5.523 0 10-4.477 10-10s-4.477-10-10-10h-8.821v-26.381h8.821c5.523 0 10-4.477 10-10s-4.477-10-10-10h-8.821V223h8.821c5.523 0 10-4.477 10-10s-4.477-10-10-10h-8.821v-26.381h8.821c5.523 0 10-4.477 10-10s-4.477-10-10-10h-8.821v-26.381h8.821c5.523 0 10-4.477 10-10s-4.477-10-10-10h-8.821V79.152h31.086v8.821c0 5.523 4.477 10 10 10s10-4.477 10-10v-8.821h26.381v8.821c0 5.523 4.477 10 10 10s10-4.477 10-10v-8.821H203v8.821c0 5.523 4.477 10 10 10s10-4.477 10-10v-8.821h26.38v8.821c0 5.523 4.477 10 10 10s10-4.477 10-10v-8.821h26.381v8.821c0 5.523 4.477 10 10 10s10-4.477 10-10v-8.821h31.086v31.086h-8.821c-5.523 0-10 4.477-10 10s4.477 10 10 10h8.821v26.381h-8.821c-5.523 0-10 4.477-10 10s4.477 10 10 10h8.821V203z"/><path d="M266.774 149.225H159.225c-5.523 0-10 4.477-10 10v107.55c0 5.523 4.477 10 10 10h107.549c5.523 0 10-4.477 10-10v-107.55c0-5.523-4.477-10-10-10zm-10 107.55h-87.549v-87.55h87.549v87.55z"/></svg>

sprite $usb <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 125 465 500"><path d="M454.037 160.145h-84.631v-20.937c0-5.523-4.478-10-10-10H102.811C46.12 129.208 0 175.328 0 232.019S46.12 334.83 102.811 334.83h256.596c5.522 0 10-4.477 10-10v-20.937h84.631c5.522 0 10-4.477 10-10V170.145c-.001-5.523-4.478-10-10.001-10zM349.406 314.829H102.811c-45.663 0-82.811-37.148-82.811-82.81s37.148-82.811 82.811-82.811h246.596v165.621zm94.63-30.937h-74.631V180.145h74.631v103.747z"/><path d="M391.76 202.609h29.923v20H391.76zM391.76 241.428h29.923v20H391.76zM315.849 173.018h-137c-32.532 0-59 26.467-59 59 0 32.532 26.468 59 59 59h137c5.522 0 10-4.477 10-10v-98c0-5.523-4.478-10-10-10zm-10 98h-127c-21.505 0-39-17.495-39-39s17.495-39 39-39h127v78z"/></svg>
@enduml
```
