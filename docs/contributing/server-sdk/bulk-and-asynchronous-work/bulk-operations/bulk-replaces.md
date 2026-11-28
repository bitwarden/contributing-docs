---
sidebar_position: 9
---

# Bulk replaces

**Audience:** engineers writing a Bitwarden service, and its API, with the server SDK.

A bulk replace replaces each resource in `data`, as a single `PUT` would: each item carries its
`id`, and a field left out is cleared. Declare it with `[StandardBulkReplace(collection)]` and take
a `BulkReplace<T>`; checking the `id`s and versions and applying the replace is your handler's job.

## Replace many resources

This replace supports both modes. Request-level problems refuse the whole request; a missing or
changed widget fails on its own:

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
        endpoints.MapPost($"{Collection}:bulk-replace", ReplaceWidgets).WithStandards();

    /// <summary>
    /// Replace widgets
    /// </summary>
    /// <remarks>
    /// At most 100 widgets, each carrying its `id` and, optionally, the `version` it was read
    /// at. All-or-nothing by default, or best-effort with `atomic=false`. Responds synchronously.
    /// </remarks>
    [StandardBulkReplace(Collection, Supports = Atomicity.AllOrNothing | Atomicity.BestEffort)]
    public static async Task<BulkResult> ReplaceWidgets(
        BulkReplace<Widget> request, IContext context, IWidgetStore store, CancellationToken cancellationToken)
    {
        // Request-level checks: too many items, an item without an id, or one named twice.
        BulkRequests.RequireAtMost(request.Data.Count, 100, "/data");
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        for (var index = 0; index < request.Data.Count; index++)
        {
            var id = request.Data[index].Id;
            if (string.IsNullOrEmpty(id) || !seen.Add(id))
            {
                throw new InvalidRequestException("Each item carries its own id, once.", $"/data/{index}/id");
            }
        }

        var failures = new List<Error>();
        var replaced = new List<WidgetRow>();

        for (var index = 0; index < request.Data.Count; index++)
        {
            var item = request.Data[index];

            try
            {
                var widget = await store.FindVisibleAsync(context, item.Id!, cancellationToken)
                    ?? throw new NotFoundException("widget", item.Id!);

                // 409 when the caller read an older version; a caller who sent none accepts any.
                Concurrency.Require(item.Version, widget.Version);

                // Replace semantics: a field left out is cleared.
                widget.Name = item.Name;
                widget.Notes = item.Notes;
                widget.Version++;
                replaced.Add(widget);
            }
            catch (Exception failure) when (failure is NotFoundException or ConflictException)
            {
                failures.Add(BulkFailure.At(failure, $"/data/{index}"));
            }
        }

        if (request.Atomicity == Atomicity.AllOrNothing && failures.Count > 0)
        {
            // 409 when every failure is a conflict, 422 otherwise: see the bulk responses page.
            throw BulkRefusals.For(failures);
        }

        await store.SaveAsync(replaced, cancellationToken);

        return request.Atomicity == Atomicity.AllOrNothing
            ? BulkResult.Affected(replaced.Count)
            : BulkResult.BestEffort(replaced.Count, failures);
    }
}
```

What the package does for you:

- **Maps `POST {collection}:bulk-replace`.** `Supports` sets the atomicity modes.
- **Reads each item as the single replace reads it.** `request.Data` holds the resources. An item of
  another `type` is refused with `422` at `/data/{n}/type`.
- **`Concurrency.Require(sent, stored)`** throws `ConflictException` when the caller sent a
  `version` that no longer matches, and passes a caller who sent none. `BulkFailure.At` turns it
  into a `409` failure.

What you do:

- **Check each item's `id`.** The package doesn't check that each item carries one or that none
  repeats, and `BulkRequests.RequireDistinct` points at `/ids/{n}`, so it can't be used on `data`.
  Check them yourself with a `HashSet` and refuse with `422` at `/data/{n}/id`, as above.
- **Answer `409` for an all-or-nothing failure made only of conflicts.** `BulkRefusedException`
  always answers `422`. `BulkRefusals.For`, the helper on [Bulk responses](bulk-responses.md),
  answers `409` when every failure is a conflict and `422` otherwise.
- **Increment the version** of every widget you replace.

## Things to know

- **A missing resource is a `404` failure of that item,** unless the single `PUT` creates resources.
  Then the bulk replace may too; the package leaves that to you.
- **Where a failure points.** The example points at the item (`/data/{n}`). A validation failure of
  one attribute can point deeper (`/data/{n}/attributes/name`).
- **Protected Data passes through untouched.** `notes` is stored as sent and never read.

## See also

- [Bulk operations](index.md)
- [Bulk updates](bulk-updates.md), which change some fields rather than replacing all of them
- [Bulk responses](bulk-responses.md)
- [Updating resources](../../operations/updating-resources.md) and
  [Optimistic concurrency](../../operations/optimistic-concurrency.md)
