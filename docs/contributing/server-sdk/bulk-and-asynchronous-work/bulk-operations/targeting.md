---
sidebar_position: 2
---

# Targeting

**Audience:** engineers writing a Bitwarden service, and its API, with the server SDK.

A bulk request names its resources in exactly one way: `data` (each item carries its own content),
`ids`, or a `filter` expression. You choose which forms an operation accepts with `Targeting` on its
attribute, and read them from `request.Ids` and `request.Filter`.

## Choose which forms an operation accepts

`BulkUpdate<T>`, `BulkDelete<T>` and the `BulkAction` types derive from `BulkTargeting<T>`, which
carries `Ids` (`IReadOnlyList<string>?`) and `Filter` (`Query?`). Set `Targeting` on the attribute
to `Targeting.Ids`, `Targeting.Filter` or `Targeting.Either` (the default). `BulkCreate<T>` and
`BulkReplace<T>` carry `Data` instead.

- `ids` suits a caller that knows exactly which resources it means and wants each missing one
  reported.
- `filter` suits a set described by its properties.

## Handle both forms within the caller's reach

This bulk delete accepts either form. Both paths start from the widgets the caller may see, so a
filter can't match a widget outside them, and a named widget the caller may not see fails exactly as
a missing one does:

```csharp
using Bitwarden.Server.Sdk.Context;
using Bitwarden.Server.Sdk.Errors;
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
    /// Names the widgets by `ids`, at most 500, or describes them with a `filter`. All-or-nothing.
    /// Responds synchronously.
    /// </remarks>
    [StandardBulkDelete(Collection)]
    public static async Task<BulkResult> DeleteWidgets(
        BulkDelete<Widget> request, IContext context, IWidgetStore store, CancellationToken cancellationToken)
    {
        // Every lookup starts from what the caller may see, so targeting never widens their reach.
        var visible = store.Visible(context.OrganizationId, context.UserId);

        if (request.Ids is { } ids)
        {
            BulkRequests.RequireAtMost(ids.Count, 500, "/ids");
            BulkRequests.RequireDistinct(ids);

            var found = visible.Where(row => ids.Contains(row.Id)).Select(row => row.Id).ToHashSet();

            // A named widget that is missing, or that the caller may not see, is the same 404.
            var missing = ids
                .Select((id, index) => (id, index))
                .Where(item => !found.Contains(item.id))
                .Select(item => BulkFailure.At(new NotFoundException("widget", item.id), $"/ids/{item.index}"))
                .ToList();

            if (missing.Count > 0)
            {
                throw new BulkRefusedException(missing);
            }

            return BulkResult.Affected(await store.DeleteAsync(found, cancellationToken));
        }

        // A filter describes a set: whatever it matches within the caller's reach, and nothing else.
        var matched = visible.Matching(request.Filter!).Select(row => row.Id).ToHashSet();

        return BulkResult.Affected(await store.DeleteAsync(matched, cancellationToken));
    }
}
```

What the package does before your handler runs, each refused with `422`:

- Both `ids` and `filter`, or neither, is refused at `/ids`. A form the attribute's `Targeting`
  excludes is refused at `/ids` or `/filter`.
- A `filter` that is empty (`{}`) is refused. An expression may use only `var`, `==`, `!=`, `>`,
  `>=`, `<`, `<=`, `in`, `and`, `or` and `!`, hold at most 500 terms (`Query.MaxTerms`), and name
  only fields the resource marks `[Filterable]`. Anything else is refused at `/filter`.
- An empty `ids` list is accepted and reaches your handler. `BulkResult.Affected(0)` answers it.

What you call yourself:

- `BulkRequests.RequireAtMost(count, maximum, pointer)` refuses more items than your maximum with
  `422`. Call it before touching any resource.
- `BulkRequests.RequireDistinct(ids)` refuses a repeated identifier with `422` at its second
  position, compared without regard to case.
- `Matching` on `IQueryable<T>` turns a checked expression into a predicate. It maps each field to
  the entity property it is stored as; `[Filterable(MappedTo = ...)]` names the property when the
  names differ.

## Things to know

- **The caller's reach is yours.** The package doesn't stop targeting from reaching resources the
  caller couldn't reach one at a time. Start every lookup from what the caller may see, using
  `IContext` (`OrganizationId`, `UserId`, `ProviderId`), and report a hidden resource named by `ids`
  with the same `404` as a missing one.
- **Take expressions only through the request types.** `Matching` throws `InvalidOperationException`
  for an expression the platform never checked, such as one you deserialized yourself.
- **Mark only fields a server can compare.** An `[Encrypted]` member holds Protected Data,
  ciphertext the server can't read, so filtering on it would compare ciphertext. Never mark it
  `[Filterable]`.
- **A `filter` has no item count.** Bound its cost by what the operation does with each match, or
  offer `ids` only.
- **Repeated identifiers in `data`.** `RequireDistinct` always points at `/ids/{n}`, so check a bulk
  replace's `data` yourself. See [Bulk replaces](bulk-replaces.md). Two bulk-create items sharing a
  `lid` are refused by the platform.

## See also

- [Bulk operations](index.md)
- [All-or-nothing and best-effort](all-or-nothing-and-best-effort.md), for how failures are reported
- [Bulk responses](bulk-responses.md)
- [Filtering](../../querying/filtering.md) and
  [Advanced queries](../../querying/advanced-queries.md)
