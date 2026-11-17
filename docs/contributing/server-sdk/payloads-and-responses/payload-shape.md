---
sidebar_position: 1
---

# Payload shape

**Audience:** engineers writing a Bitwarden service, and its API, with the server SDK.

You write a resource as a flat record that derives from `Resource`, and your handlers take and
return documents such as `ResourceDocument<T>`. The package wraps and unwraps the envelope (`data`,
`attributes`, `meta`, `errors`) for you, in both directions.

## Declare a resource

Derive a record from `Resource` and declare its members. Nothing in it mentions `data` or
`attributes`:

```csharp
using System.ComponentModel.DataAnnotations;
using Bitwarden.Server.Sdk.Data;
using Bitwarden.Server.Sdk.Resources;

public sealed record Widget : Resource
{
    /// <summary>
    /// What the widget is called.
    /// </summary>
    [StringLength(100)]
    public required string Name { get; init; }

    /// <summary>
    /// The person's notes, encrypted on their device.
    /// </summary>
    [Encrypted(MaxLength = 10_000)]
    public string? Notes { get; init; }
}
```

- `Resource` gives you `Id` and `Type`. Every other member goes under `attributes` on the wire, and
  `attributes` is always written, as `{}` when no member has a value.
- `Id` is a `string?`. If your store uses a `Guid` or a number, format it yourself. A null `Id` is
  left out of the response.
- `Type` is the record's name in kebab case (`widget`), or what `[ResourceType]` says. See
  [Naming conventions](naming-conventions.md).
- `Notes` holds Protected Data: the client encrypts it, and the service stores and returns it as it
  came. See [JSON](json.md).

## Take and return documents

Handlers take a `ResourceDocument<T>` and return one of the documents. The response helpers in
`StandardResponses` build them:

```csharp
using Bitwarden.Server.Sdk.Errors;
using Bitwarden.Server.Sdk.Resources;
using static Bitwarden.Server.Sdk.Resources.StandardResponses;

[ApiTag(Description = "Widgets, which a person keeps.")]
public static class WidgetsEndpoints
{
    public const string Collection = "api/v1/widgets";

    public static void Map(IEndpointRouteBuilder endpoints)
    {
        var widgets = endpoints.MapGroup(Collection).WithStandards();
        widgets.MapPost("", CreateWidget);
        widgets.MapPut("{id}", UpdateWidget);
        widgets.MapGet("", ListWidgets);
    }

    /// <summary>
    /// Create a widget
    /// </summary>
    [StandardCreate]
    public static async Task<ResourceDocument<Widget>> CreateWidget(
        ResourceDocument<Widget> request, IWidgetStore store, CancellationToken cancellationToken)
    {
        // The service assigns the identifier, so one the caller sent is refused.
        if (request.Data.Id is not null)
        {
            throw new InvalidRequestException("The service assigns a widget's id.", "/data/id");
        }

        return CreateResponse(await store.AddAsync(request.Data, cancellationToken));
    }

    /// <summary>
    /// Replace a widget
    /// </summary>
    [StandardUpdate]
    public static async Task<ResourceDocument<Widget>> UpdateWidget(
        string id, ResourceDocument<Widget> request, IWidgetStore store, CancellationToken cancellationToken)
    {
        // The platform checks the type; the id in the body must name the widget in the path.
        if (request.Data.Id is { } sent && sent != id)
        {
            throw new InvalidRequestException(
                $"The id '{sent}' is not the widget in the path, '{id}'.", "/data/id");
        }

        return UpdateResponse(await store.ReplaceAsync(id, request.Data, cancellationToken));
    }

    /// <summary>
    /// List a person's widgets
    /// </summary>
    [StandardReadMany]
    public static async Task<ResourceListDocument<Widget>> ListWidgets(
        IWidgetStore store, CancellationToken cancellationToken)
    {
        var widgets = await store.ListAsync(cancellationToken);

        // Anything about the response rather than a resource in it goes in meta.
        return ReadManyResponse(widgets, new Dictionary<string, object?> { ["totalCount"] = widgets.Count });
    }
}
```

- `ResourceDocument<T>` carries one resource. `ResourceListDocument<T>`,
  `PagedResourceListDocument<T>` and `CursorPagedResourceListDocument<T>` carry a list.
- Before your handler runs, the package checks the body's `type`. A missing `type` is refused `422`
  `field-required`, and another type `422` `invalid-resource-type`, both at `/data/type`.
- A body that isn't JSON is refused `400` `malformed-json`. A JSON value that isn't an object, or
  has no `data` object, is refused `422`.
- Attributes the resource doesn't declare, and read-only ones (see
  [Standard fields](standard-fields.md)), are dropped, not refused.
- `id` and `type` are read from beside `attributes` only, and every other member from inside it.
  Anything else beside `attributes`, and an `id` or `type` inside it, is dropped.

## Check the id yourself

The package checks `type` but never looks at the `id` in a body. Do it in the handler, as the
example does:

- **On an update or replace**, compare `request.Data.Id` with the path and throw
  `InvalidRequestException` at `/data/id` when they differ.
- **On a create**, decide whether a caller may name its own `id`. Refuse it, as `CreateWidget` does,
  or ignore it. The package passes it through either way.

## Add response metadata

Each document has a `Meta` dictionary, left out of the response when it is empty. Paged lists fill
in their paging fields for you. To add anything else about the response, such as a count on an
unpaged list, pass it as the response helper's `meta` argument, as `ListWidgets` does.

## Things to know

- **Each kind of resource needs its own `type`.** Nothing checks this, and the service still starts
  if two records share one. Two records with the same name in different namespaces, or the same
  `[ResourceType]` value, collide. Keep them unique within the service.
- **Other bodies have no envelope.** A handler parameter that isn't a resource document binds as
  plain JSON. An action's arguments, a bulk operation's targeting and a search use this; see
  [Acting upon resources](../operations/acting-upon-resources.md),
  [Bulk operations](../bulk-and-asynchronous-work/bulk-operations/index.md) and
  [Advanced queries](../querying/advanced-queries.md).

## See also

- [Standard fields](standard-fields.md): the members every resource inherits.
- [JSON](json.md): how values inside `attributes` are written and read.
- [Request validation](request-validation.md): everything checked before a handler runs.
- [Standard responses](standard-responses.md): the helpers that build each document.
- [Errors](errors.md): how a refusal reaches the caller.
