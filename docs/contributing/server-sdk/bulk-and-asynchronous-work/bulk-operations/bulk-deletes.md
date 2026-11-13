---
sidebar_position: 10
---

# Bulk deletes

**Audience:** engineers writing a Bitwarden service, and its API, with the server SDK.

A bulk delete deletes each targeted resource, named by `ids` or described by a `filter`. Declare it
with `[StandardBulkDelete(collection)]` and take a `BulkDelete<T>`; the delete itself, and any
`permanent` flag, are your handler's.

## Delete the resources a filter matches

This bulk delete takes a `filter`, keeps it within what the caller may see, and soft-deletes by
default:

```csharp
using Bitwarden.Server.Sdk.Context;
using Bitwarden.Server.Sdk.Resources;
using Bitwarden.Server.Sdk.Resources.Querying;

[ApiTag(Description = "Widgets, which a person keeps.")]
public static class WidgetsEndpoints
{
    public const string Collection = "api/v1/widgets";

    public static void Map(IEndpointRouteBuilder endpoints) =>
        endpoints.MapPost($"{Collection}:bulk-delete", DeleteWidgets).WithStandards();

    /// <summary>
    /// Delete widgets
    /// </summary>
    /// <remarks>
    /// Describes the widgets with a `filter`. Soft-deletes them, or removes them for good with
    /// `permanent=true`. All-or-nothing. Responds synchronously.
    /// </remarks>
    [StandardBulkDelete(Collection, Targeting = Targeting.Filter)]
    public static async Task<BulkResult> DeleteWidgets(
        BulkDelete<Widget> request,
        IContext context,
        IWidgetStore store,
        TimeProvider time,
        bool permanent = false,
        CancellationToken cancellationToken = default)
    {
        var matched = store.Visible(context.OrganizationId, context.UserId).Matching(request.Filter!);

        var affected = permanent
            ? await store.RemoveAsync(matched, cancellationToken)
            : await store.MarkDeletedAsync(matched, time.GetUtcNow(), cancellationToken);

        return BulkResult.Affected(affected);
    }
}
```

What the package does for you:

- **Maps `POST {collection}:bulk-delete`.** It is a `POST` because the targeting travels in the
  body. `Targeting` sets which forms it accepts (`Either` by default), and `Supports` the atomicity
  modes.
- **Checks the targeting.** `request.Ids` or `request.Filter`, exactly one, is checked as described
  in [Targeting](targeting.md). Here `ids` is refused with `422`, because the attribute accepts only
  a filter. A filter can't be empty, so a bulk delete never means "everything" by omission.

What you do:

- **`permanent`.** The package doesn't provide it. Declare it as a handler parameter, as above; it
  is bound from the query string and published in the OpenAPI document like any other.
- **Restrict the set to the caller's reach.** Start from what the caller may see before applying
  `Matching`.

## Things to know

- **Soft or hard follows the single delete.** If it soft-deletes, so does the bulk delete, and
  `permanent=true` removes for good.
- **`ids` or `filter`.** Accept `ids` when each missing resource should be reported back as a `404`,
  and `filter` when the caller describes a set. See [Targeting](targeting.md) for an operation
  accepting both.
- **Side effects.** Each deleted resource produces what the single delete would: events, audit
  records, cleanup of dependent data. A set-based delete must still produce them.

## See also

- [Bulk operations](index.md)
- [Targeting](targeting.md)
- [All-or-nothing and best-effort](all-or-nothing-and-best-effort.md)
- [Deleting resources](../../operations/deleting-resources.md)
