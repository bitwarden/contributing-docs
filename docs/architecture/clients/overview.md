---
sidebar_position: 1
---

# Overview

The Applications are structured using a layered architecture. The layers are:

- State
- Services
- Presentation (Components or CLI Commands)

The different layers primarily use models described in the [Data Model](./data-model.md) when
communicating with each other.

## State

At the core of the application is the state layer. This layer is responsible for keeping track of
the state, state includes things like the current user, vault items and more. The state layer is
also responsible for persisting the state to disk, and loading it from disk.

Currently the state is primarily implemented in the aptly named `StateService`. Which acts as a god
class for all other services to access the state. _This is not ideal, and we are working on a better
solution._

We also have _Storage Services_ which are implementation specific services for persisting the state
to different storage medium. Which are primarily structured in three categories.

- Persisted storage.
- In memory storage.
- Secure persisted storage.

The _State Service_ itself should never be called from anything other than individual domain
services, and those should only access their own domain. Additionally only a single service should
access the specific domain in the _State Service_.

Below is an example how a _domain component_ and _domain service_ interacts with the _State
Service_.

```kroki type=plantuml
@startuml
skinparam BackgroundColor transparent
skinparam componentStyle rectangle

title State Service

component "Example Domain" {
  component "Components" as components

  component "Domain Service" as domain
}

component "State Service" as state

component "Storage Service" as storage
component "Secure Storage Service" as secure
component "Memory Storage Service" as memory

components -d-> domain : subscribe \n observable
domain -> state : retrieve state

state --> storage
state --> secure

state --> memory

@enduml
```

## Services

Above the State layer is the Services layer. This layer is primarily responsible for performing
business logic by interacting with the State layer and receiving commands from the Presentation
layer. In this layer we also have the API Services which communicate with the Server.

Services should primarily use observables for exposing data access, this encourages a reactive
presentation layer, which always shows the latest state. As we continue to break up components into
smaller pieces it also becomes important that they stay up to date, and interact with services for
business logic.

## Presentation

The presentational layer is either implemented using [Angular](./presentation/angular.md), or using
a [Command pattern](./presentation/cli.md) in the CLI. This layer should only focus on
presentational aspects and all business logic should, as previously mentioned be placed in
_Services_. This allows multiple components to provide the same functionality without needing
inheritance.
