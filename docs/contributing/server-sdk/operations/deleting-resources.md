---
sidebar_position: 7
---

# Deleting resources

**Audience:** engineers writing a Bitwarden service, and its API, with the server SDK.

To delete a resource, write a handler with `[StandardDelete]` that takes the `{id}` and returns
nothing. Every `Resource` also has `DeletedAt` and `DeletedBy` for a soft delete, which you build
with ordinary query parameters.

## Delete a resource

Map the handler at `{id}` with `MapDelete`:

```csharp
using Bitwarden.Server.Sdk.Errors;
using Bitwarden.Server.Sdk.Resources;

public static class WidgetsEndpoints
{
    public const string Collection = "api/v1/widgets";

    public static void Map(IEndpointRouteBuilder endpoints)
    {
        var widgets = endpoints.MapGroup(Collection).WithStandards();
        widgets.MapDelete("{id}", DeleteWidget);
    }

    /// <summary>
    /// Delete a widget
    /// </summary>
    [StandardDelete]
    public static async Task DeleteWidget(string id, IWidgetStore store, CancellationToken cancellationToken)
    {
        if (!await store.DeleteAsync(id, cancellationToken))
        {
            throw new NotFoundException("widget", id);
        }
    }
}
```

- A handler that returns nothing (`Task` or `void`) answers `204`.
- Throw `NotFoundException` when there is no such resource, for `404` in the standard error
  document.
- A delete demands the service's write scope.

## Soft deletes

A soft delete records when and by whom the resource was deleted, and reads leave it out unless the
caller asks. Give the delete a `permanent` flag and the reads an `includeDeleted` flag:

```csharp
using Bitwarden.Server.Sdk.Context;
using Bitwarden.Server.Sdk.Errors;
using Bitwarden.Server.Sdk.Resources;
using Bitwarden.Server.Sdk.Resources.Querying;
using Microsoft.AspNetCore.Mvc;
using static Bitwarden.Server.Sdk.Resources.StandardResponses;

public static class SoftDeletingWidgetsEndpoints
{
    public static void Map(IEndpointRouteBuilder endpoints)
    {
        var widgets = endpoints.MapGroup(WidgetsEndpoints.Collection).WithStandards();
        widgets.MapGet("", ListWidgets);
        widgets.MapGet("{id}", GetWidget);
        widgets.MapDelete("{id}", DeleteWidget);
    }

    /// <summary>
    /// Delete a widget
    /// </summary>
    /// <param name="id">The widget's identifier.</param>
    /// <param name="store">Where widgets are kept.</param>
    /// <param name="context">The request's scope.</param>
    /// <param name="permanent">Delete it for good rather than move it to the trash.</param>
    /// <param name="cancellationToken">Cancels the request.</param>
    [StandardDelete]
    public static async Task DeleteWidget(
        string id,
        IWidgetStore store,
        IContext context,
        [FromQuery] bool permanent = false,
        CancellationToken cancellationToken = default)
    {
        var deleted = permanent
            ? await store.DeleteAsync(id, cancellationToken)
            // Sets DeletedAt to now and DeletedBy to the acting user.
            : await store.TrashAsync(id, context.UserId, cancellationToken);

        if (!deleted)
        {
            throw new NotFoundException("widget", id);
        }
    }

    /// <summary>
    /// Get a widget
    /// </summary>
    /// <param name="id">The widget's identifier.</param>
    /// <param name="store">Where widgets are kept.</param>
    /// <param name="includeDeleted">Find it even when it is in the trash.</param>
    /// <param name="cancellationToken">Cancels the request.</param>
    [StandardReadOne]
    public static async Task<ResourceDocument<Widget>> GetWidget(
        string id,
        IWidgetStore store,
        [FromQuery] bool includeDeleted = false,
        CancellationToken cancellationToken = default)
    {
        var widget = await store.FindAsync(id, cancellationToken);

        // A widget in the trash is not found unless the caller asks for it.
        if (widget is null || (widget.DeletedAt is not null && !includeDeleted))
        {
            throw new NotFoundException("widget", id);
        }

        return ReadOneResponse(widget);
    }

    /// <summary>
    /// List widgets
    /// </summary>
    /// <param name="store">Where widgets are kept.</param>
    /// <param name="includeDeleted">Include widgets in the trash.</param>
    /// <param name="pageNumber">Which page to return.</param>
    /// <param name="pageSize">How many widgets a page holds.</param>
    /// <param name="cancellationToken">Cancels the request.</param>
    [StandardReadMany]
    public static async Task<PagedResourceListDocument<Widget>> ListWidgets(
        IWidgetStore store,
        [FromQuery] bool includeDeleted = false,
        PageNumber pageNumber = default,
        PageSize pageSize = default,
        CancellationToken cancellationToken = default)
    {
        var page = new Page { Number = pageNumber, Size = pageSize };

        return ReadManyResponse(await store.ListAsync(page, includeDeleted, cancellationToken), page);
    }
}
```

- **The flags are plain `bool` query parameters.** One that doesn't parse, such as
  `permanent=maybe`, is refused with `422`, naming the parameter.
- **Paging links keep `includeDeleted`,** so a caller following the next link stays in the same
  query.
- **A soft delete is the default** and `permanent=true` removes the resource for good. Reads leave
  out soft-deleted resources unless `includeDeleted=true`.
- **`IContext.UserId` names the acting user.** It is null for a call that names no person, and then
  `DeletedBy` stays empty.

## Things to know

- **The package doesn't soft delete for you.** The flags, the filter in your store and filling
  `DeletedAt` and `DeletedBy` are yours, as above. The package drops what a caller sends for those
  two members and doesn't set them.
- **`includeDeleted` and `permanent` are open to every caller with the write or read scope.** Refuse
  them, or give the operation a scope of its own, where a caller shouldn't have them. See
  [Authentication and authorization](../running-a-service/authentication-and-authorization.md).
- **Restore with an action.** An undelete changes a resource without being an update: make it an
  [action](acting-upon-resources.md), such as `POST /api/v1/widgets/{id}/actions/restore`.
- **There is no response for a delete that is scheduled.** To answer `202`, return an `IResult` of
  your own. See [Jobs](../bulk-and-asynchronous-work/jobs.md).
- **Encrypted data in the trash stays as the ciphertext it was.** Remove it for good on
  `permanent=true` or when your retention rule says so.

## See also

- [Reading resources](reading-resources.md)
- [Standard fields](../payloads-and-responses/standard-fields.md)
- [Bulk deletes](../bulk-and-asynchronous-work/bulk-operations/bulk-deletes.md)
