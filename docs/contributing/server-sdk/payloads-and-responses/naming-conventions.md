---
sidebar_position: 3
---

# Naming conventions

**Audience:** engineers writing a Bitwarden service, and its API, with the server SDK.

Every name a caller sees comes from a name in your C#: members, records, enumeration members,
methods and handler parameters. Name them well and the wire follows. `[ResourceType]` overrides a
resource's `type` when the record's name isn't the one you want.

## Name a resource's members

Each member's comment is its name on the wire:

```csharp
using System.ComponentModel.DataAnnotations;
using Bitwarden.Server.Sdk.Data;
using Bitwarden.Server.Sdk.Resources;

public sealed record Widget : Resource
{
    // name
    [StringLength(100)]
    public required string Name { get; init; }

    // notes
    [Encrypted(MaxLength = 10_000)]
    public string? Notes { get; init; }

    // active, not isActive
    public bool Active { get; init; }

    // expirationDate: a date ends in Date
    public DateTimeOffset? ExpirationDate { get; init; }

    // organizationId: another resource's identifier ends in Id
    public Guid? OrganizationId { get; init; }

    // finish: PAINTED or BRUSHED_STEEL
    public WidgetFinish? Finish { get; init; }
}

public enum WidgetFinish
{
    Painted,
    BrushedSteel,
}
```

- Every member is written and read in camel case: `ExpirationDate` is `expirationDate`. Filter, sort
  and sparse fieldset names use the same names.
- Enumeration members are written in upper snake case: `BrushedSteel` is `BRUSHED_STEEL`, in the
  JSON and in the OpenAPI document.
- Nothing checks the names themselves. Follow these when you choose them:
  - End a date's name in `Date`: `ExpirationDate`.
  - Don't start a boolean with `Is`: `Active`, not `IsActive`.
  - End a reference to another resource in `Id`: `OrganizationId`.
- The inherited audit members don't end in `Date`; see [Standard fields](standard-fields.md).

## Name a resource's type

A resource's `type` is the record's name in kebab case, singular: `Widget` is `widget`, `ApiKey` is
`api-key`, and a run of capitals stays one word, so `HTTPServer` is `http-server`. When the record's
name isn't the resource's name, `[ResourceType]` says what it is:

```csharp
/// <summary>
/// A widget template. The record's name would make its type "widget-template-resource".
/// </summary>
[ResourceType("widget-template")]
public sealed record WidgetTemplateResource : Resource
{
    [StringLength(100)]
    public required string Name { get; init; }

    // shared
    public bool Shared { get; init; }
}
```

- A `[ResourceType]` value is used exactly as written and not checked. Write it in lowercase kebab
  case and singular, as the derived ones are.

## Other names the package derives

- **An action** is the method's name in kebab case, or the name passed to `[StandardAction]`, also
  kebab-cased: `SendReminder` is `actions/send-reminder`.
- **A filter** is the handler parameter's name: `Filter<Guid>? organizationId` is
  `filter[organizationId]`.
- **A sparse fieldset** is keyed by the resource's `type`: `fields[widget]`.
- **The service** is the identifier you pass to `Service`, such as `widget-service`. It must be
  lowercase letters, digits and hyphens, or the constructor throws and the service doesn't start.

## Things to know

- **Avoid `[JsonPropertyName]`.** The JSON follows the new name, but a validation error still points
  at the C# name: a `Caption` written as `label` that is too long is reported at
  `/data/attributes/caption`, as "The field Caption ...". Give the C# member the name you want on
  the wire instead.
- **Enumeration member names are part of your contract.** They become the values callers send, so
  renaming one is a breaking change. Keep them ASCII.
- **Review the OpenAPI document.** It shows every name as callers see it, and nothing else warns you
  about a poor one.

## See also

- [Payload shape](payload-shape.md): where `type` and the attributes appear.
- [JSON](json.md): how enumeration values are read.
- [Standard fields](standard-fields.md): the names every resource inherits.
- [API paths](../contracts/api-paths.md): naming collections and paths.
