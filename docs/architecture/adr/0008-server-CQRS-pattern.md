---
parent: Decisions
nav_order: 8
adr: "0008"
status: In progress
date: 2022-07-15
tags: [server]
---

# Server: Adopt CQRS

## Context and Problem Statement

In Bitwarden Server, we currently use an `<<Entity>>Service` pattern to act on our entities. These
classes end up being dumping grounds for all actions involving the entity; leading
[bloaters](https://refactoring.guru/refactoring/smells/bloaters) and
[couplers](https://refactoring.guru/refactoring/smells/couplers). There are two facts which helped
guide us to the current design:

- We use an entity pattern to represent data stored in our databases and bind these entity classes
  automatically using either Dapper or Entity Framework.

- We use constructor-based Dependency Injection to deliver dependencies to objects.

The two above facts mean that our Entities cannot act without receiving all necessary state as
method parameters, which goes against our typical DI pattern.

## Considered Options

- **`<<Entity>>Services`** - Discussed above
- **Queries and Commands** - Fundamentally our problem is that the <<Entity>>Service name
  encapsulates absolutely anything you can do with that entity and excludes any code reuse across
  different entities. The CQRS pattern creates classes based on the action being taken on the
  entity. This naturally limits the classes scope and allows for reuse should two entities need to
  implement the same command behavior.
  https://docs.microsoft.com/en-us/azure/architecture/patterns/cqrs
- **Small Feature-based services** - This design would break `<<Entity>>Service` into
  `<<Feature>>Service`, but ultimately runs into the same problems. As a feature grows, this service
  would become bloated and tightly coupled to other services.

## Decision Outcome

Chosen option: **Queries and Commands**

Commands seem all-around the better decision to the incumbent. We gain code reuse and limit class
scope. In addition, we have an iterative path to a full-blown CQRS pipeline, with queued work.

Queries are already basically done through repositories and/or services, but would require some
restructuring to be obvious.

## Implementation

CQRS can be implemented differently depending on the codebase and the objectives behind adopting the
pattern. This section provides guidance for developers on how to use CQRS in our codebase.

### General

- each query/command should have a single responsibility. For example: delete a user, get a license
  file, rotate an api key. They are designed around verbs or actions (e.g.
  `RotateOrganizationApiKeyCommand`), not domains (e.g. `ApiKeyService`)
- if your query/command is very simple, it might already be encapsulated by the repository call. In
  that case, there is no need to add a query/command class, you can just call the respository
  directly when required. However, many operations are more complex than this (for example, you also
  need to validate or transform data). In this case, you create a query or command class which
  contains this logic and the repository call
- the class, interface and public method should be named after the action. For example:
  ```c#
  public class RotateOrganizationApiKeyCommand : IRotateOrganizationApiKeyCommand
  {
    public async Task<OrganizationApiKey> RotateApiKeyAsync(OrganizationApiKey organizationApiKey)
    {
      ...
    }
  }
  ```
- the directory structure and namespaces should be organized by feature. Interfaces should be stored
  in a separate sub-folder. For example:
  ```text
    Core/
      └── OrganizationFeatures/
          └── OrganizationApiKeys/
              ├── Interfaces/
              │   └── IRotateOrganizationApiKeyCommand.cs
              └── RotateOrganizationApiKeyCommand.cs
  ```
- the query/command should only expose public methods that run the action. It should not have public
  helper methods
- if your query/command can be called with different options, use multiple public methods with
  method overloading. Avoid using optional parameters
- queries and commands in `Core` should be general purpose and should not be tied to a specific
  request or response model
- queries and commands should not call other queries or commands. This leads to coupling between
  classes, which we are trying to avoid. Instead, they should be called sequentially at a higher
  level - usually in the controller
  - for example: to rotate an api key, the controller calls a query to get the api key, then calls a
    separate command to rotate it, passing in the query result as an argument

### Commands

- commands are write operations (usually writing to the database)
- commands should not call queries or otherwise get their own data. All data required should be
  fetched by the caller and passed in to the command. Similarly, commands should generally take
  whole models (e.g. `Organization`), not primitives (e.g. `organizationId`)

### Queries

- queries are read operations (usually reading from the database, but other sources are possible.
  e.g. a remote server)

### Transition plan

- we are gradually transitioning to a CQRS pattern over time. If you're making changes that use or
  affect a service method, consider whether it can be extracted to a query/command, and include it
  in your work
- however, you can draw a line somewhere. Our current domain services are large and inter-dependent
  and we cannot break them up all at once. It's okay to refactor "one level deep" and then leave
  other methods where they are. This may result in your new query/command still being somewhat
  coupled with other service methods. This is acceptable for now while we transition
