---
sidebar_position: 1
---

# Bulk operations

**Audience:** engineers writing a Bitwarden service, and its API, with the server SDK.

A bulk operation lets a caller create, update, replace, delete or act on many resources in one
request. You declare each one with a bulk attribute and take its request type in the handler; the
package checks the request's targeting and atomicity before your handler runs.

## Declare bulk operations

Each bulk operation is a `POST` to a suffix on the collection, such as `api/v1/widgets:bulk-delete`.
The attributes are in `Bitwarden.Server.Sdk.Resources`; the request and result types are in
`Bitwarden.Server.Sdk.Resources.Querying`.

| Operation                        | Attribute                                    | Request type                               | Route                        |
| -------------------------------- | -------------------------------------------- | ------------------------------------------ | ---------------------------- |
| [Bulk create](bulk-creates.md)   | `[StandardBulkCreate(collection)]`           | `BulkCreate<T>`                            | `{collection}:bulk-create`   |
| [Bulk update](bulk-updates.md)   | `[StandardBulkUpdate(collection)]`           | `BulkUpdate<T>`                            | `{collection}:bulk-update`   |
| [Bulk replace](bulk-replaces.md) | `[StandardBulkReplace(collection)]`          | `BulkReplace<T>`                           | `{collection}:bulk-replace`  |
| [Bulk delete](bulk-deletes.md)   | `[StandardBulkDelete(collection)]`           | `BulkDelete<T>`                            | `{collection}:bulk-delete`   |
| [Bulk action](bulk-actions.md)   | `[StandardBulkAction(collection, "action")]` | `BulkAction<T>` or `BulkAction<T, TInput>` | `{collection}:bulk-{action}` |

A route group can only join with a slash, so a suffix can't hang off a group. Declare the
collection's path as a constant, pass it to each bulk attribute, and map each bulk endpoint on the
route builder itself with `WithStandards()`:

```csharp
using Bitwarden.Server.Sdk.Resources;
using Bitwarden.Server.Sdk.Resources.Querying;

[ApiTag(Description = "Widgets, which a person keeps.")]
public static class WidgetsEndpoints
{
    public const string Collection = "api/v1/widgets";

    public static void Map(IEndpointRouteBuilder endpoints)
    {
        var widgets = endpoints.MapGroup(Collection).WithStandards();
        widgets.MapPost("{id}/actions/archive", ArchiveWidget);

        // Bulk operations are a suffix on the collection, so they are mapped on the route
        // builder itself rather than on the group.
        endpoints.MapPost($"{Collection}:bulk-create", CreateWidgets).WithStandards();
        endpoints.MapPost($"{Collection}:bulk-update", UpdateWidgets).WithStandards();
        endpoints.MapPost($"{Collection}:bulk-replace", ReplaceWidgets).WithStandards();
        endpoints.MapPost($"{Collection}:bulk-delete", DeleteWidgets).WithStandards();
        endpoints.MapPost($"{Collection}:bulk-archive", ArchiveWidgets).WithStandards();
    }

    /// <summary>
    /// Archive a widget
    /// </summary>
    [StandardAction("archive")]
    public static Task ArchiveWidget(string id, IWidgetStore store, CancellationToken cancellationToken) =>
        store.ArchiveAsync([id], cancellationToken);

    /// <summary>
    /// Create widgets
    /// </summary>
    [StandardBulkCreate(Collection)]
    public static async Task<BulkCreatedDocument<Widget>> CreateWidgets(
        BulkCreate<Widget> request, IWidgetStore store, CancellationToken cancellationToken)
    {
        BulkRequests.RequireAtMost(request.Data.Count, 100, "/data");
        return BulkCreatedDocument<Widget>.For(request, await store.AddAllAsync(request.Data, cancellationToken));
    }

    /// <summary>
    /// Update widgets
    /// </summary>
    [StandardBulkUpdate(Collection, Targeting = Targeting.Filter)]
    public static async Task<BulkResult> UpdateWidgets(
        BulkUpdate<Widget> request, IWidgetStore store, CancellationToken cancellationToken) =>
        BulkResult.Affected(await store.UpdateMatchingAsync(request.Filter!, request.Update, cancellationToken));

    /// <summary>
    /// Replace widgets
    /// </summary>
    [StandardBulkReplace(Collection)]
    public static async Task<BulkResult> ReplaceWidgets(
        BulkReplace<Widget> request, IWidgetStore store, CancellationToken cancellationToken)
    {
        BulkRequests.RequireAtMost(request.Data.Count, 100, "/data");
        return BulkResult.Affected(await store.ReplaceAllAsync(request.Data, cancellationToken));
    }

    /// <summary>
    /// Delete widgets
    /// </summary>
    [StandardBulkDelete(Collection, Targeting = Targeting.Ids, Supports = Atomicity.AllOrNothing | Atomicity.BestEffort)]
    public static async Task<BulkResult> DeleteWidgets(
        BulkDelete<Widget> request, IWidgetStore store, CancellationToken cancellationToken)
    {
        var ids = request.Ids ?? [];
        BulkRequests.RequireAtMost(ids.Count, 500, "/ids");
        BulkRequests.RequireDistinct(ids);
        return await store.DeleteAllAsync(ids, request.Atomicity, cancellationToken);
    }

    /// <summary>
    /// Archive widgets
    /// </summary>
    [StandardBulkAction(Collection, "archive", Targeting = Targeting.Ids)]
    public static async Task<BulkResult> ArchiveWidgets(
        BulkAction<Widget> request, IWidgetStore store, CancellationToken cancellationToken)
    {
        var ids = request.Ids ?? [];
        BulkRequests.RequireAtMost(ids.Count, 500, "/ids");
        BulkRequests.RequireDistinct(ids);
        return BulkResult.Affected(await store.ArchiveAsync(ids, cancellationToken));
    }
}
```

- **Targeting.** `Targeting` on the update, delete and action attributes picks `Targeting.Ids`,
  `Targeting.Filter` or `Targeting.Either` (the default). Creates and replaces take `data`. See
  [Targeting](targeting.md).
- **Atomicity.** `Supports` on every bulk attribute picks `Atomicity.AllOrNothing` (the default),
  `Atomicity.BestEffort`, or both. The caller's choice reaches you as `request.Atomicity`. See
  [All-or-nothing and best-effort](all-or-nothing-and-best-effort.md).
- **The result.** Return a `BulkResult`, or a `BulkCreatedDocument<T>` from a bulk create, and the
  operation answers `200`. Return nothing (`Task`) and it answers `204`. See
  [Bulk responses](bulk-responses.md).
- **The maximum.** Call `BulkRequests.RequireAtMost(count, maximum, pointer)` before touching any
  resource. The package has no default maximum.

## What the package checks for you

Before your handler runs, the package refuses with `422`:

- a request with both `ids` and `filter`, with neither, or with a form the attribute's `Targeting`
  excludes;
- a `filter` that is empty, uses an operator the expression language doesn't have, or names a field
  the resource doesn't mark `[Filterable]`;
- an `atomic` value the operation doesn't support, or one that is neither `true` nor `false`.

It also publishes the `atomic` query parameter, with its default, in the OpenAPI document, and
describes the request body with the targeting it accepts.

## When the service refuses to start

- A bulk endpoint's `Map` route disagrees with its attribute's route.
- A handler takes `BulkUpdate<T>`, `BulkDelete<T>`, `BulkAction<T>` or `Search<T>` without the
  matching attribute. Its filter would otherwise reach the handler unchecked.
- A bulk action is named `create`, `update`, `replace` or `delete`.

## Things to know

- **Per-resource rules are yours.** The package checks the request as a whole. Holding each resource
  to the single-resource API's authorization, validation, business rules and side effects is your
  handler's job. See [Per-resource rules](per-resource-rules.md).
- **Say how the operation behaves.** The package doesn't document the maximum or that the operation
  responds synchronously. Write both in the handler's XML documentation `<remarks>`.
- **Every bulk operation is synchronous.** The package has no asynchronous execution and no job
  resource. See [Synchronous and asynchronous](synchronous-and-asynchronous.md).
- **Choosing a mode.** Offer all-or-nothing when a partial result would leave related resources
  inconsistent, and best-effort when each resource stands alone, as in an import.

## See also

- [Targeting](targeting.md), [Per-resource rules](per-resource-rules.md),
  [All-or-nothing and best-effort](all-or-nothing-and-best-effort.md),
  [Synchronous and asynchronous](synchronous-and-asynchronous.md) and
  [Bulk responses](bulk-responses.md)
- [Bulk creates](bulk-creates.md), [Bulk updates](bulk-updates.md),
  [Bulk replaces](bulk-replaces.md), [Bulk deletes](bulk-deletes.md) and
  [Bulk actions](bulk-actions.md)
- [Jobs](../jobs.md)
- [Advanced queries](../../querying/advanced-queries.md), for the filter expressions and for
  `[StandardSearch]`, which shares them
