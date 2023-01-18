---
sidebar_position: 30
---

# Server Architecture

## CQRS ([ADR-0008](../../adr/0008-server-CQRS-pattern))

We are currently transitioning the server to a CQRS pattern.

CQRS can be implemented differently depending on the codebase and the objectives behind adopting the
pattern.

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
