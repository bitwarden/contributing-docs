---
sidebar_position: 4
---

# Standard fields

**Audience:** engineers writing a Bitwarden service, and its API, with the server SDK.

Every resource inherits members from `Resource` for its identifier, its version, and who created,
changed or deleted it and when. Two attributes say how a caller may use a member you declare:
`[ReadOnly]` and `[Verbatim]`.

## Know the inherited members

The package stores nothing. You set these members from your own data, and each is left out of a
response while it is `null`.

| Inherited member | On the wire | A caller may set it | Notes                                                                               |
| ---------------- | ----------- | ------------------- | ----------------------------------------------------------------------------------- |
| `Id`             | `id`        | Yes                 | A `string?`. See [Payload shape](payload-shape.md).                                 |
| `Type`           | `type`      | Yes, and checked    | Set by the constructor from the record's name.                                      |
| `Version`        | `version`   | Yes                 | A `string?`. See [Optimistic concurrency](../operations/optimistic-concurrency.md). |
| `CreatedBy`      | `createdBy` | No                  |                                                                                     |
| `CreatedAt`      | `createdAt` | No                  |                                                                                     |
| `UpdatedBy`      | `updatedBy` | No                  |                                                                                     |
| `UpdatedAt`      | `updatedAt` | No                  |                                                                                     |
| `DeletedBy`      | `deletedBy` | No                  | See [Deleting resources](../operations/deleting-resources.md).                      |
| `DeletedAt`      | `deletedAt` | No                  |                                                                                     |

## Mark members read-only or verbatim

A resource with a member only the service sets, and one whose spaces matter:

```csharp
using System.ComponentModel.DataAnnotations;
using Bitwarden.Server.Sdk.Data;
using Bitwarden.Server.Sdk.Resources;

public sealed record Widget : Resource
{
    [StringLength(100)]
    public required string Name { get; init; }

    [Encrypted(MaxLength = 10_000)]
    public string? Notes { get; init; }

    /// <summary>
    /// How many times the widget has been polished. The service counts; a caller only reads it.
    /// </summary>
    [ReadOnly]
    public int PolishCount { get; init; }

    /// <summary>
    /// The text engraved on the widget, spaces and all.
    /// </summary>
    [Verbatim]
    [StringLength(40)]
    public string? Engraving { get; init; }
}
```

Both attributes are in `Bitwarden.Server.Sdk.Resources`.

- **`[ReadOnly]`** marks a member a caller reads but never sets. The inherited audit members carry
  it. A read-only member in a request is dropped before validation, not refused, so a caller can
  send back what it read. The OpenAPI document marks it `readOnly`.
- **`[Verbatim]`** keeps a string as the caller sent it: not trimmed, and a blank value kept rather
  than read as absent. An absent or `null` value is still absent. Its validation still runs, so
  spaces count towards its length.
- Mark every member only the service sets `[ReadOnly]`. Without it, a caller's value reaches your
  handler.
- If a file also imports `System.ComponentModel`, which has its own `ReadOnlyAttribute`, the
  compiler asks you to qualify the name.

## Fill in the inherited members

The service fills in the inherited members from what it stores, checks the caller's `version`, and
records who made the change:

```csharp
using Bitwarden.Server.Sdk.Authorization;
using Bitwarden.Server.Sdk.Errors;
using Bitwarden.Server.Sdk.Resources;
using Bitwarden.Server.Sdk.Resources.Querying;
using static Bitwarden.Server.Sdk.Resources.StandardResponses;

/// <summary>
/// Replace a widget
/// </summary>
[Authorization(User = ContextRequirement.Required)]
[StandardUpdate]
public static async Task<ResourceDocument<Widget>> UpdateWidget(
    string id, ResourceDocument<Widget> request, Person person, WidgetDatabase database,
    CancellationToken cancellationToken)
{
    var entity = await database.FindAsync(id, cancellationToken)
        ?? throw new NotFoundException("widget", id);

    // 409 when the caller sent a version that is no longer the stored one.
    Concurrency.Require(request.Data.Version, entity.Version);

    entity.Name = request.Data.Name;
    entity.Notes = request.Data.Notes;
    entity.Engraving = request.Data.Engraving;
    entity.UpdatedAt = DateTimeOffset.UtcNow;
    entity.UpdatedBy = person.Id;
    entity.Version++;
    await database.SaveAsync(entity, cancellationToken);

    return UpdateResponse(ToResource(entity));
}

// The service fills in the inherited members from what it stores.
private static Widget ToResource(WidgetEntity entity) => new()
{
    Id = entity.Id.ToString(),
    Version = entity.Version.ToString(System.Globalization.CultureInfo.InvariantCulture),
    Name = entity.Name,
    Notes = entity.Notes,
    Engraving = entity.Engraving,
    PolishCount = entity.PolishCount,
    CreatedAt = entity.CreatedAt,
    CreatedBy = entity.CreatedBy.ToString(),
    UpdatedAt = entity.UpdatedAt,
    UpdatedBy = entity.UpdatedBy?.ToString(),
};
```

- A `polishCount` or `updatedAt` in the request is dropped, so the caller can't set either. The
  `engraving` reaches the handler with its spaces.
- `Notes` is Protected Data, encrypted on the client. The handler copies it to storage as it came.
- Set only the members your resource records, as `ToResource` does, and leave the rest `null`.
- `Concurrency.Require` compares the caller's `version` string with a stored `int`, and answers
  `409` when they differ. If you version some other way, compare it yourself and throw
  `ConflictException`.
- `createdBy` and `updatedBy` name the acting user, from `Person` or `IContext.UserId`. A change
  made by a service with no person behind it has no user to record.

## Use other names for the audit dates

The package names the audit dates `createdAt`, `updatedAt` and `deletedAt`. To use `creationDate`,
`revisionDate` and `deletedDate` instead, declare them yourself and leave the inherited ones unset,
so they are left out:

```csharp
public sealed record Widget : Resource
{
    [StringLength(100)]
    public required string Name { get; init; }

    [Encrypted(MaxLength = 10_000)]
    public string? Notes { get; init; }

    // Leave CreatedAt, UpdatedAt and DeletedAt unset, and they are left out.
    [ReadOnly]
    public DateTimeOffset? CreationDate { get; init; }

    [ReadOnly]
    public DateTimeOffset? RevisionDate { get; init; }

    [ReadOnly]
    public DateTimeOffset? DeletedDate { get; init; }
}
```

## Things to know

- **Nothing is filled in for you.** The inherited members are plain properties. A resource that
  doesn't record something says nothing about it.
- **`version` is optional.** `Version` is a `string?`, and `Concurrency.Require` passes a caller
  that sends none. See [Optimistic concurrency](../operations/optimistic-concurrency.md) for how to
  require it.

## See also

- [Optimistic concurrency](../operations/optimistic-concurrency.md): `version` and `409`.
- [Deleting resources](../operations/deleting-resources.md): soft deletes and `deletedAt`.
- [JSON](json.md): how strings are trimmed, and how dates are written.
- [Naming conventions](naming-conventions.md): how member names appear on the wire.
