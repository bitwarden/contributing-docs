---
sidebar_position: 11
---

# Bulk actions

**Audience:** engineers writing a Bitwarden service, and its API, with the server SDK.

A bulk action invokes a single-resource action (`{collection}/{id}/actions/{action}`) on every
targeted resource, at `{collection}:bulk-{action}`. Declare it with
`[StandardBulkAction(collection, action)]` and take a `BulkAction<T>`, or a `BulkAction<T, TInput>`
when the action takes a body.

## Act on many resources

`BulkInput<TInput>.At(index)` returns the shared body, or the one in the same position as the
resource, so one loop handles both shapes:

```csharp
using Bitwarden.Server.Sdk.Errors;
using Bitwarden.Server.Sdk.Resources;
using Bitwarden.Server.Sdk.Resources.Querying;
using static Bitwarden.Server.Sdk.Resources.StandardResponses;

[ApiTag(Description = "Widgets, which a person keeps.")]
public static class WidgetsEndpoints
{
    public const string Collection = "api/v1/widgets";

    public static void Map(IEndpointRouteBuilder endpoints)
    {
        var widgets = endpoints.MapGroup(Collection).WithStandards();
        widgets.MapPost("{id}/actions/polish", Polish);

        endpoints.MapPost($"{Collection}:bulk-polish", BulkPolish).WithStandards();
    }

    /// <summary>
    /// Polish a widget
    /// </summary>
    [StandardAction]
    public static async Task<ResourceDocument<Widget>> Polish(
        string id, PolishWidget request, IWidgetStore store, CancellationToken cancellationToken) =>
        ActionResponse(await store.PolishAsync(id, request.Shine, cancellationToken));

    /// <summary>
    /// Polish widgets
    /// </summary>
    /// <remarks>
    /// Names the widgets by `ids`, at most 100. `data` is one polish for every widget, or an
    /// array of one per widget in the order `ids` names them. Best-effort. Responds synchronously.
    /// </remarks>
    [StandardBulkAction(Collection, "polish", Targeting = Targeting.Ids, Supports = Atomicity.BestEffort)]
    public static async Task<BulkResult> BulkPolish(
        BulkAction<Widget, PolishWidget> request, IWidgetStore store, CancellationToken cancellationToken)
    {
        var ids = request.Ids ?? [];
        BulkRequests.RequireAtMost(ids.Count, 100, "/ids");
        BulkRequests.RequireDistinct(ids);

        if (request.Data is not { } data)
        {
            throw new InvalidRequestException("Say how much to polish.", "/data");
        }

        var failures = new List<Error>();
        var polished = 0;

        for (var index = 0; index < ids.Count; index++)
        {
            // The same body for every widget, or the one in the same position as its id.
            var shine = data.At(index)?.Shine ?? 0;

            try
            {
                await store.PolishAsync(ids[index], shine, cancellationToken);
                polished++;
            }
            catch (NotFoundException failure)
            {
                failures.Add(BulkFailure.At(failure, $"/ids/{index}"));
            }
        }

        return BulkResult.BestEffort(polished, failures);
    }
}

public sealed record PolishWidget(int Shine);
```

What the package does for you:

- **Maps the route.** The action's name is kebab-cased. Left out, it is the method's name, so name
  the method after the action or pass the name.
- **Reserves the other operations' names.** A bulk action named `create`, `update`, `replace` or
  `delete` stops the service from starting.
- **Reads `data`.** `request.Data` is a `BulkInput<TInput>`. A JSON object is one body for every
  resource (`Every`). A JSON array is one body per resource, paired by position with `ids`.
- **Refuses mismatched bodies with `422`.** An array with a `filter`, or of a different length from
  `ids`, is refused at `/data`. An array with no `ids` is refused at `/ids`.

`Targeting` picks `ids` or `filter`, and `Supports` sets the atomicity modes.

## Things to know

- **Per-resource bodies pair with `ids` by position.** The package doesn't read `data` items that
  carry their own `id` and `body`. To give each resource its own body, send `ids` and a `data` array
  of the same length, and point failures at `/ids/{n}`.
- **`data` is optional.** If the action needs it, refuse its absence yourself, as above.
- **One body or one per resource.** Per-resource bodies are for input the server can't compute, such
  as a key the client wraps for each user: the server never holds the key, so only the client can
  produce one per resource. Everything else takes one body for all.
- **The same rules as the single action.** Each resource goes through the single action's
  authorization, transition rules and side effects. Share one implementation between the two, as on
  [Per-resource rules](per-resource-rules.md).

## See also

- [Bulk operations](index.md)
- [Per-resource rules](per-resource-rules.md)
- [Bulk updates](bulk-updates.md)
- [Acting upon resources](../../operations/acting-upon-resources.md)
