---
sidebar_position: 7
---

# Bulk creates

**Audience:** engineers writing a Bitwarden service, and its API, with the server SDK.

A bulk create creates each resource in `data` and answers with the created resources, so the caller
learns the identifiers it didn't choose. Declare it with `[StandardBulkCreate(collection)]`, take a
`BulkCreate<T>`, and return a `BulkCreatedDocument<T>`.

## Create many resources

The single create's rule (a widget's name is unique) is applied to every item, including against
earlier items in the same request, before anything is created:

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
        endpoints.MapPost($"{Collection}:bulk-create", CreateWidgets).WithStandards();

    /// <summary>
    /// Create widgets
    /// </summary>
    /// <remarks>
    /// At most 100 widgets, each as a single create takes it, with an optional `lid`.
    /// All-or-nothing. Responds synchronously.
    /// </remarks>
    [StandardBulkCreate(Collection)]
    public static async Task<BulkCreatedDocument<Widget>> CreateWidgets(
        BulkCreate<Widget> request, IContext context, IWidgetStore store, CancellationToken cancellationToken)
    {
        BulkRequests.RequireAtMost(request.Data.Count, 100, "/data");

        // The single create's business rule, applied to every item: a name is unique.
        var failures = new List<Error>();
        for (var index = 0; index < request.Data.Count; index++)
        {
            var name = request.Data[index].Name;
            var takenEarlier = request.Data.Take(index).Any(earlier => earlier.Name == name);

            if (takenEarlier || await store.NameTakenAsync(context, name, cancellationToken))
            {
                failures.Add(BulkFailure.At(
                    new InvalidRequestException($"A widget named '{name}' already exists.", code: "name-in-use"),
                    $"/data/{index}/attributes/name"));
            }
        }

        if (failures.Count > 0)
        {
            throw new BulkRefusedException(failures);
        }

        var created = await store.AddAllAsync(context, request.Data, cancellationToken);

        // Echoes each item's lid beside the created widget's id, in request order.
        return BulkCreatedDocument<Widget>.For(request, created);
    }
}
```

What the package does for you:

- **Maps `POST {collection}:bulk-create`.** `Supports` sets the atomicity modes, all-or-nothing by
  default.
- **Reads each item as the single create reads it.** `request.Data` holds the resources. An item of
  another `type` is refused with `422` at `/data/{n}/type`, and each item is bound and validated as
  the single create's resource is.
- **Reads `lid`.** Each item may carry a local identifier, `lid`. One that isn't a non-empty string,
  or that two items share, is refused with `422` at `/data/{n}/lid`. The rest are in `request.Lids`,
  and `request.LidAt(index)` reads one.
- **`BulkCreatedDocument<T>.For(request, created)`** answers with the created resources in request
  order, each item's `lid` beside the created resource's `id`, and the count. It throws
  `ArgumentException` unless there is exactly one created resource for each item.

What you do:

- Enforce the maximum with `BulkRequests.RequireAtMost`, and document it in `<remarks>`.
- Apply the single create's business rules to every item, and report failures with `BulkFailure.At`
  at `/data/{n}` or deeper (`/data/{n}/attributes/name`).

## Things to know

- **Protected Data passes through untouched.** An `[Encrypted]` member such as `notes` is ciphertext
  the person's device produced. The service stores and returns it as sent and never reads it.
- **Best-effort creates can't return the created resources.** `BulkCreatedDocument<T>` has no
  `errors` and needs one created resource per item. A best-effort create can return
  `BulkResult.BestEffort(created, failures)`, which reports each failure but not the identifiers.
  Prefer all-or-nothing where the caller needs the identifiers.

## See also

- [Bulk operations](index.md)
- [Bulk responses](bulk-responses.md)
- [Per-resource rules](per-resource-rules.md)
- [Creating resources](../../operations/creating-resources.md)
