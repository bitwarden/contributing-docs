---
sidebar_position: 2
---

# Web Clients Architecture

The Web based clients, henceforth referenced simply as clients, are the _Web Vault_, _Browser
Extension_, _Desktop Application_ (Electron based) and the _CLI_. They all share a common codebase
and a single [Git repository](https://github.com/bitwarden/clients).

The mono-repository root directory contains three main folders.

- `apps` - Our different application specific code, consists of `web`, `browser`, `desktop` and
  `cli`.
- `bitwarden_license` - Bitwarden Licensed version of the web vault.
- `libs` - Shared code between the different applications.

`libs` contains the following projects.

- `Common` - Common code shared between all the clients including CLI.
- `Angular` - Angular specific code used by all the visual clients.
- `Components` - Angular Components Library.
- `Node` - Used to be shared code for CLI and Directory Connector CLI, but since directory connector
  no longer uses the same version of libs this module is deprecated.

## Package Diagram

Below is a simplified package diagram of the clients repository.

:::note

For readability, ubiquitous app dependencies to `common` are hidden.

:::

```kroki type=plantuml
@startuml
skinparam BackgroundColor transparent
skinparam componentStyle rectangle
skinparam linetype ortho

title Simplified Package Diagram

component "Bitwarden License" {
  component "Bit Web"
}

component apps {
  component "Web Vault"
  component "Desktop"
  component "Browser Extension"
  component "CLI"
}

component libs {
  component "Common"
  component "Angular"
  component "Node"
}

[Bit Web] --> [Web Vault]
[Bit Web] --[norank]> [Angular]

[Web Vault] --> [Angular]

[Browser Extension] --> [Angular]

[CLI] --> [Node]

[Angular] --> [Common]

[Desktop] --> [Angular]

[Node] --> [Common]
@enduml
```
