---
sidebar_position: 4
---

# Web Clients Architecture

The Web based clients, henceforth referenced simply as clients, are the _Web Vault_, _Browser
Extension_, _Desktop Application_ (Electron based) and the _CLI_. They all share a common codebase
and a single [Git repository](https://github.com/bitwarden/clients).

The mono-repository root directory contains three main folders.

- `apps`: Our different application specific code, consists of `web`, `browser`, `desktop` and
  `cli`.
- `bitwarden_license`: Bitwarden Licensed version of the web vault.
- `libs`: Shared code between the different applications.

## Libs

Historically, much of the feature logic of Bitwarden has existed within the `apps/` directories,
only being moved to `libs/` (usually `libs/common/` or `libs/angular/`) if it needed to be shared
between multiple clients.

We are attempting to move to a more modular architecture by creating additional libs that are more
feature-focused and which more accurately convey team code ownership.

- `common`: Common code shared between all the clients including CLI
- `angular`: Low-level Angular utilities used by all the visual clients
- `node`: Used to be shared code for CLI and Directory Connector CLI, but since directory connector
  no longer uses the same version of libs this module is deprecated
- `admin-console`: Code owned by the Admin Console team
- `auth`: Code owned by the Auth team
- `billing`: Code owned by the Billing team
- `components`: Angular implementation of the Bitwarden design system
  [See more.](https://components.bitwarden.com/)
- `exporter`: Code related to exporting; owned by the Tools team
- `importer`: Code related to importing; owned by the Tools team
- `platform`: Code owned by the Platform team
- `vault`: Code owned by the Vault team

### Background

More on this approach can be found in the
[Nx documentation](https://nx.dev/concepts/more-concepts/applications-and-libraries):

> place 80% of your logic into the `libs/` folder and 20% into `apps/`

We are doing the opposite of this right now. The code that remains in `apps/` should be primarily
concerned with bootstrapping the application and consuming and configuring code exported from
`libs/`. Over time, code not meeting this criteria should be moved from `apps/` to `libs/`.

Any code in the `apps/` that doesn't have a tight coupling with the client can be moved into a lib:
if an exported member is wholly dependent on other libs but not `apps/`, it can likely be moved to a
lib itself. (More concretely, this bars components that rely on global client-specific CSS — but not
components built with Tailwind and the CL — from being included in a lib)

> Having a dedicated library project is a much stronger boundary compared to just separating code
> into folders, though. Each library has a so-called "public API", represented by an index.ts barrel
> file. This forces developers into an "API thinking" of what should be exposed and thus be made
> available for others to consume, and what on the others side should remain private within the
> library itself.

An existing example of this pattern is `@bitwarden/components`:

- It is consumed by multiple apps and other libs
- It manages a clear public and private API boundary through its barrel file
- Code ownership is clear — the CL team only owns the files within `libs/components`
- The CL team can make independent decisions around internal folder structure and code style

As part of this process, we are also investigating utilizing additional tooling (such as Nx) to make
creating new libs on the fly easier.

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
