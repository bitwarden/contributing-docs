---
sidebar_position: 30
---

# Server Architecture

## CQRS ([ADR-0008](../adr/0008-server-CQRS-pattern.md))

We are currently transitioning the server to use a Command and Query Responsibility Segregation
(CQRS) pattern.

The main goal of this pattern is to break up large services focused on a single entity (e.g.
`CipherService`) and move towards smaller, reusable classes based on actions or tasks (e.g.
`CreateCipher`). In the future, this may enable other benefits such as enqueuing commands for
execution, but for now the focus is on having smaller, reusable chunks of code.

### Commands vs. Queries

**Commands** are write operations, e.g. `RotateOrganizationApiKeyCommand`. They should never read
from the database.

**Queries** are read operations, e.g. `GetOrganizationApiKeyQuery`. They should never write to the
database.

The database is the most common data source we deal with, but others are possible. For example, a
query could also get data from a remote server.

Each query or command should have a single responsibility. For example: delete a user, get a license
file, rotate an api key. They are designed around verbs or actions (e.g.
`RotateOrganizationApiKeyCommand`), not domains or entities (e.g. `ApiKeyService`).

### Writing commands or queries

A simple query may just be a repository call to fetch data from the database. (We already use
repositories, and this is not what we're concerned about here.) However, more complex queries can
require additional logic around the repository call, which will require their own class. Commands
always need their own class.

The class, interface and public method should be named after the action. For example:

```c#
namespace Bit.Core.OrganizationFeatures.OrganizationApiKeys;

public class RotateOrganizationApiKeyCommand : IRotateOrganizationApiKeyCommand
{
  public async Task<OrganizationApiKey> RotateApiKeyAsync(OrganizationApiKey organizationApiKey)
  {
    ...
  }
}
```

The query/command should only expose public methods that run the complete action. It should not have
public helper methods.

The directory structure and namespaces should be organized by feature. Interfaces should be stored
in a separate sub-folder. For example:

```text
  Core/
    └── OrganizationFeatures/
        └── OrganizationApiKeys/
            ├── Interfaces/
            │   └── IRotateOrganizationApiKeyCommand.cs
            └── RotateOrganizationApiKeyCommand.cs
```

### Maintaining the command/query distinction

By separating read and write operations, CQRS encourages us to maintain loose coupling between
classes. There are two golden rules to follow when using CQRS in our codebase:

- **Commands should never read and queries should never write**
- **Commands and queries should never call eachother**

Both of these lead to tight coupling between classes, reduce opportunities for code re-use, and
conflate the command/query distinction.

You can generally avoid these problems by:

- writing your commands so that they receive all the data they need in their arguments, rather than
  fetching the data themselves
- calling queries and commands sequentially (one after the other), passing the results along the
  call chain

For example, if we need to update an API key for an organization, it might be tempting to have an
`UpdateApiKeyCommand` which fetches the current API key and then updates it. However, we can break
this down into two separate queries/commands, which are called separately:

```c#
var currentApiKey = await _getOrganizationApiKeyQuery.GetOrganizationApiKeyAsync(orgId);
await _rotateOrganizationApiKeyCommand.RotateApiKeyAsync(currentApiKey);
```

This has unit testing benefits as well - instead of having lengthy "arrange" phases where you mock
query results, you can simply supply different argument values using the `Autodata` attribute.

### Avoid Primitive Obsession

Where practical, your commands and queries should take and return whole objects (e.g. `User`) rather
than individual properties (e.g. `userId`).
[Read more about Primitive Obsession](https://refactoring.guru/smells/primitive-obsession).

### Avoid excessive optional parameters

Lots of optional parameters can quickly become difficult to work with. Instead, consider using
method overloading to provide different entry points into your command or query.

### Transition plan

We are gradually transitioning to a CQRS pattern over time. If you're making changes that use or
affect a service method, consider whether it can be extracted to a query/command, and include it in
your work as tech debt.

However, you may need to draw a line somewhere. Our current domain services are large and
inter-dependent and we cannot break them up all at once. It's okay to refactor "one level deep" and
then leave other methods where they are. This may result in your new query/command still being
somewhat coupled with other service methods. This is acceptable for now while we transition, but we
should be removing those interdependencies over time.
