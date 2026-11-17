---
sidebar_position: 4
---

# Updating resources

**Audience:** engineers writing a Bitwarden service, and its API, with the server SDK.

To replace a resource, write a handler with `[StandardUpdate]` that takes the `{id}` and a
`ResourceDocument<T>`, and returns `UpdateResponse(...)`. The same attribute serves a `PUT` that
creates the resource when it doesn't exist.

## Replace a resource

Map the handler at `{id}` with `MapPut`. Check that the body's `id` matches the path, then replace:

```csharp
using Bitwarden.Server.Sdk.Errors;
using Bitwarden.Server.Sdk.Resources;
using static Bitwarden.Server.Sdk.Resources.StandardResponses;

public static class WidgetsEndpoints
{
    public const string Collection = "api/v1/widgets";

    public static void Map(IEndpointRouteBuilder endpoints)
    {
        var widgets = endpoints.MapGroup(Collection).WithStandards();
        widgets.MapPut("{id}", UpdateWidget);
    }

    /// <summary>
    /// Replace a widget
    /// </summary>
    [StandardUpdate]
    public static async Task<ResourceDocument<Widget>> UpdateWidget(
        string id, ResourceDocument<Widget> request, IWidgetStore store, CancellationToken cancellationToken)
    {
        // The platform checks the type; the id in the body is the service's to check.
        if (request.Data.Id is { } sent && sent != id)
        {
            throw new InvalidRequestException(
                $"The resource's id '{sent}' is not the one in the path.", "/data/id", ErrorCodes.InvalidValue);
        }

        var replaced = await store.ReplaceAsync(id, request.Data, cancellationToken)
            ?? throw new NotFoundException("widget", id);

        return UpdateResponse(replaced);
    }
}
```

- **The body is validated like a create's.** Every required attribute must be present, and a
  document whose `type` isn't `widget` is refused with `422` before your handler runs.
- **It is a full replace.** Read-only members and undeclared attributes are dropped. An attribute
  the caller leaves out is absent from `request.Data`, so replacing with it clears the stored value.
  For changing some members only, see [Partial updates](partial-updates.md).
- **`UpdateResponse` answers `200`** with the resource as it now stands. A handler that returns
  nothing answers `204`.
- **Throw `NotFoundException`** when there is no such resource, for `404`.

## Create or update

To let a caller create a resource at an identifier it chooses, use the same `PUT`. Set `201`
yourself when the resource was created, and pass the `Location`:

```csharp
/// <summary>
/// Create or replace a widget
/// </summary>
[StandardUpdate]
public static async Task<ResourceDocument<Widget>> PutWidget(
    string id, ResourceDocument<Widget> request, IWidgetStore store, HttpContext http, CancellationToken cancellationToken)
{
    var (widget, created) = await store.UpsertAsync(id, request.Data, cancellationToken);

    if (!created)
    {
        return UpdateResponse(widget);
    }

    // A status the handler sets is kept. Pass the location: the one the platform derives for a
    // 201 is the request path followed by the id, which suits a POST to the collection only.
    http.Response.StatusCode = StatusCodes.Status201Created;
    return CreateResponse(widget, location: http.Request.PathBase.Add(http.Request.Path).Value);
}
```

- A status your handler sets is kept, so a `PUT` that creates answers `201`.
- Always pass `location`. The one the package derives for a `201` is the request path followed by
  the `id`, which suits only a create on the collection; `PUT /api/v1/widgets/new-one` would get
  `/api/v1/widgets/new-one/new-one`.
- The OpenAPI document shows only the `200` response for this operation.

## Things to know

- **The package doesn't compare the body's `id` with the path's.** The body's `id` reaches your
  handler as `request.Data.Id`. Refuse a mismatch yourself, as `UpdateWidget` does, with
  `InvalidRequestException` and `ErrorCodes.InvalidValue`, which answers `422`.
- **You fill `UpdatedAt` and `UpdatedBy`.** The package drops what a caller sends for them and
  doesn't set them. Set them in the store; `IContext.UserId` names the acting user.
- **Conflicting updates aren't detected for you.** See
  [Optimistic concurrency](optimistic-concurrency.md).
- **There is no response for an update that is scheduled.** To answer `202`, return an `IResult` of
  your own. See [Jobs](../bulk-and-asynchronous-work/jobs.md).
- **Never decrypt.** Replace an `[Encrypted]` member with the ciphertext the caller sent.

## See also

- [Partial updates](partial-updates.md) and [Acting upon resources](acting-upon-resources.md)
- [Standard fields](../payloads-and-responses/standard-fields.md)
- [Bulk updates](../bulk-and-asynchronous-work/bulk-operations/bulk-updates.md) and
  [Bulk replaces](../bulk-and-asynchronous-work/bulk-operations/bulk-replaces.md)
