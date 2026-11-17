---
sidebar_position: 2
---

# Creating resources

**Audience:** engineers writing a Bitwarden service, and its API, with the server SDK.

To create a resource, declare it as a `Resource` record and write a handler that takes a
`ResourceDocument<T>`, carries `[StandardCreate]` and returns `CreateResponse(...)`.

## Declare the resource

Derive from `Resource` and put validation attributes on the members:

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

- `Resource` gives the record its `Id`, its `Type` (`widget`, from the record's name), its `Version`
  and the read-only audit members (`createdAt`, `createdBy`, `updatedAt`, `updatedBy`, `deletedAt`,
  `deletedBy`).
- Each attribute is checked before your handler runs: a name over 100 characters is refused with
  `422`.
- `[Encrypted]` marks a value encrypted on the person's device. The package checks only its length;
  store it as it came. See [Request validation](../payloads-and-responses/request-validation.md).

## Create a resource

Map the handler at the collection with `MapPost`, and hand the bound resource to your store:

```csharp
using Bitwarden.Server.Sdk.Resources;
using static Bitwarden.Server.Sdk.Resources.StandardResponses;

public static class WidgetsEndpoints
{
    public const string Collection = "api/v1/widgets";

    public static void Map(IEndpointRouteBuilder endpoints)
    {
        var widgets = endpoints.MapGroup(Collection).WithStandards();
        widgets.MapPost("", CreateWidget);
    }

    /// <summary>
    /// Create a widget
    /// </summary>
    [StandardCreate]
    public static async Task<ResourceDocument<Widget>> CreateWidget(
        ResourceDocument<Widget> request, IWidgetStore store, CancellationToken cancellationToken)
    {
        // request.Data is bound and validated, and its read-only members (createdAt and the
        // rest) were dropped. The store assigns the identifier, whatever id the caller sent.
        var created = await store.AddAsync(request.Data, cancellationToken);

        // 201, with Location derived from the request path and created.Id.
        return CreateResponse(created);
    }
}
```

What the package does for you:

- **Binds and checks the body.** A missing `data`, a missing required attribute or an attribute of
  the wrong JSON type is refused with `422`, and malformed JSON with `400`. A document whose `type`
  isn't `widget` is refused with `422`. None of these reach your handler. See
  [Request validation](../payloads-and-responses/request-validation.md).
- **Drops read-only members.** `createdAt`, `updatedBy` and the other read-only members, any member
  marked `[ReadOnly]`, and attributes the resource doesn't declare never reach the handler.
- **Answers `201` with `Location`.** `CreateResponse` builds the response, and the package sets
  `Location` from the request path and the resource's `Id`. Pass `CreateResponse` a `location` when
  the new resource is read somewhere else.
- **Answers `204` when the handler returns nothing** (`Task` or `void`).
- **Documents the operation.** The OpenAPI document shows the `201` response with your handler's
  return type, and the operation identifier comes from the method name (`createWidget`).

## Things to know

- **The caller's `id` reaches your handler.** The package passes an `id` sent in the body through to
  `request.Data.Id`. Assign your own identifier in the store and don't use the one sent.
- **You fill the audit fields.** The package drops the caller's `createdAt` and `createdBy` but
  doesn't set them. Set them in the store; `IContext.UserId` names the acting user.
- **There is no response for a create that is scheduled.** The package has no job response for a
  single create. To answer `202`, return an `IResult` of your own, which is written as it is. See
  [Jobs](../bulk-and-asynchronous-work/jobs.md).
- **Never decrypt.** Store an `[Encrypted]` member exactly as it came, and don't log it.

## See also

- [Verbs](verbs.md)
- [Payload shape](../payloads-and-responses/payload-shape.md) and
  [Standard responses](../payloads-and-responses/standard-responses.md)
- [Bulk creates](../bulk-and-asynchronous-work/bulk-operations/bulk-creates.md)
