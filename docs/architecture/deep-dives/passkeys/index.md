# FIDO2 and Passkeys

:::info

For more information on how Bitwarden implements FIDO2, see [Implementations](./implementations).

:::

## What are passkeys?

Passkeys are another name given to the credentials defined by the two specifications:

- [World Wide Web Consortium’s (W3C) Web Authentication (WebAuthn)](https://www.w3.org/TR/webauthn-3/)
- [FIDO Alliance’s Client-to-Authenticator Protocol v2 (CTAP2)](https://fidoalliance.org/specs/fido-v2.1-ps-20210615/fido-client-to-authenticator-protocol-v2.1-ps-20210615.html)

which together make up what is usually referred to as the FIDO2 standard.

At its core, FIDO2 is based on public-key cryptography, where each passkey contains a unique
public/private key-pair. The public key is given to an application during the initial credential
creation operation, while the private key is never shared. The private key is then used in all
subsequent requests to sign challenges from the application to prove ownership of the key.

## Architecture

FIDO2 can be broken down into two main components: WebAuthn and CTAP2. WebAuthn is a web standard
that allows for the creation and use of passkeys through a well-defined JavaScript interface, and
CTAP2 is a protocol for communicating with external authenticators (also know as roaming
authenticators), such as hardware security keys (e.g. YubiKeys).

The interaction between these two components can vary depending on the use case:

- When using platform credentials, the interaction is always between the browser and the platform
  authenticator (i.e. the operating system) using native APIs.
- When using roaming authenticators, the interaction can be either:
  - Mediated by the platform, or
  - Directly between the browser and the authenticator using e.g. USB/HID or BLE protocols.

### Diagram

The following diagram shows a generic overview of the FIDO2 architecture. The diagram is a
high-level overview and does not include any specific details about how Bitwarden implements FIDO2.

:::info

The `JavaScript Application` is part of the `Relying Party` but executed on the client platform by
the browser.

:::

```mermaid
---
title: FIDO2 Overview
---
flowchart TB
    subgraph rp ["Relying Party"]
        subgraph serverApp ["Server Application"]
            httpsApi["HTTPS API"]
            app["App"]
            fido2Lib["FIDO2 Library"]
            db[("Database")]
        end
        rpJsApp["JavaScript Application"]
    end
    subgraph clientPlatform ["Client platform"]
        subgraph browser ["Browser"]
            clientJsApp["JavaScript Application"]
            subgraph userAgent ["User Agent"]
                webauthnApi["WebAuthn API"]
                webauthnClient["WebAuthn Client"]
            end
        end
        subgraph os ["Operating System"]
            platformAuthApi["Platform Auth API"]
            platformAuthClient["Platform Auth Client"]
            subgraph platformAuthenticator ["Platform Authenticator"]
                platformAuthenticatorIcon@{ icon: "bw:chip" }
            end
        end
    end
    subgraph roamingAuth ["Roaming Authenticator"]
        roamingAuthIcon@{ icon: "bw:usb" }
    end

    httpsApi --> app
    app --> fido2Lib
    app --> db
    webauthnApi --- webauthnClient
    clientJsApp --> webauthnApi
    platformAuthApi --- platformAuthClient
    platformAuthClient --> platformAuthenticator
    webauthnClient -->|CTAP2| roamingAuth
    webauthnClient --> platformAuthApi
    platformAuthClient -->|CTAP2| roamingAuth
    rpJsApp --- clientJsApp
    rpJsApp --> httpsApi

    style clientJsApp stroke-dasharray: 5 5
    classDef sgStyle fill:#ececff,stroke:#9370db,stroke-width:1px,color:#111827;
    class platformAuthenticator sgStyle;
    class roamingAuth sgStyle;
```
