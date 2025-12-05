---
sidebar_position: 6
---

# Server Architecture

## Command Query Separation (CQS)

Our server architecture uses the Command Query Separation (CQS) pattern.

We adopted this pattern in order to break up large services focused on a single entity (e.g.
`CipherService`) into smaller classes based on discrete actions (e.g. `CreateCipherCommand`). This
results in smaller classes with fewer interdependencies that are easier to change and test.

### Commands vs. queries

**Commands** are write operations, e.g. `RotateOrganizationApiKeyCommand`. They change the state of
the system. They may have no return value, or may return the operation result only (e.g. the updated
object or an error message).

**Queries** are read operations, e.g. `GetOrganizationApiKeyQuery`. They should only return a value
and should never change the state of the system.

The database is the most common data source we deal with, but others are possible. For example, a
query could also get data from a remote server.

Each query or command should have a single responsibility. For example: delete a user, get a license
file, rotate an API key. They are designed around verbs or actions (e.g.
`RotateOrganizationApiKeyCommand`), not domains or entities (e.g. `ApiKeyService`).

Which you use will often follow the HTTP verb: a POST operation will generally call a command,
whereas a GET operation will generally call a query.

### Structure of a command

A command is just a class. The class, interface and public method should be named after the action.
For example:

```csharp
public class RotateOrganizationApiKeyCommand : IRotateOrganizationApiKeyCommand
{
  public async Task<OrganizationApiKey> RotateApiKeyAsync(OrganizationApiKey organizationApiKey)
  {
    ...
  }
}
```

The command should only expose public methods that run the complete action. It should not have
public helper methods.

A command will usually follow these steps:

1. Fetch additional data required to process the request (if required)
2. Validate the request
3. Perform the action (state change)
4. Perform any side effects (e.g. sending emails or push notifications)
5. Return information about the outcome to the user (e.g. an error message or the successfully
   created or updated object)

If you have complex validation logic, it can be useful to move it to a separate validator class.
This makes the validator and the command easier to understand, test and maintain.

Some teams have defined their own request and result objects to pass data to and from commands and
validators. This is optional but can be useful to avoid primitive obsession and have strongly typed
interfaces.

### Structure of a query

A simple query may not require its own class if it is appropriately encapsulated by a single
database call. In that case, the "query" is just a repository method.

However, more complex queries can require additional logic in addition to the repository call. In
this case, it is appropriate to define a separate query class.

A query is just a class. The class, interface and public method should be named after the data being
queried. For example:

```csharp
public interface IGetOrganizationApiKeyQuery
{
    Task<OrganizationApiKey> GetOrganizationApiKeyAsync(Guid organizationId, OrganizationApiKeyType organizationApiKeyType);
}
```

### Avoid [primitive obsession](https://refactoring.guru/smells/primitive-obsession)

Where practical, your commands and queries should take and return whole objects (e.g. `User`) rather
than individual properties (e.g. `userId`).

### Avoid excessive optional parameters

Lots of optional parameters can quickly become difficult to work with. Instead, consider using
method overloading to provide different entry points into your command or query.

## Further reading

- [ADR-0008: Server CQS Pattern](../adr/0008-server-CQRS-pattern.md) - Architectural decision to
  adopt CQS for breaking up large service classes
