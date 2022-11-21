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

## Services

Above the State layer is the Services layer. This layer is primarily responsible for performing
business logic by interacting with the State layer and receiving commands from the Presentation
layer. In this layer we also have the API Services which communicate with the Server.

## Presentation

The presentational layer is either implemented using [Angular](./angular.md), or using a
[Command pattern in the CLI](./cli.md).
