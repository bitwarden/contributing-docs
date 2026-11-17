---
sidebar_position: 4
---

# All-or-nothing and best-effort

**Audience:** engineers writing a Bitwarden service, and its API, with the server SDK.

When some targeted resources fail, an all-or-nothing operation changes nothing and reports every
failure, and a best-effort operation lets each resource succeed or fail on its own. You choose which
modes an operation offers with `Supports` on its attribute, and read the caller's choice from
`request.Atomicity`.

## Offer one mode or both

Set `Supports` on any bulk attribute to `Atomicity.AllOrNothing` (the default),
`Atomicity.BestEffort`, or both (`Atomicity.AllOrNothing | Atomicity.BestEffort`). The caller picks
with the `atomic` query parameter: `true` for all-or-nothing, `false` for best-effort.

- With no `atomic`, the operation is all-or-nothing where it supports that, and its only mode
  otherwise.
- An `atomic` the operation doesn't support, or a value other than `true` or `false`, is refused
  with `422` before your handler runs.
- `request.Atomicity` holds the checked mode on every bulk request type.
- The `atomic` parameter and its default are published in the OpenAPI document.

## Handle both modes in one handler

This bulk delete supports both modes. The request-level checks come first; then each widget is
looked at, and the outcome depends on the mode:

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
    [StandardBulkDelete(Collection, Targeting = Targeting.Ids, Supports = Atomicity.AllOrNothing | Atomicity.BestEffort)]
    public static async Task<BulkResult> DeleteWidgets(
        BulkDelete<Widget> request, IContext context, IWidgetStore store, CancellationToken cancellationToken)
    {
        // Problems with the request itself refuse it whole, in either mode.
        var ids = request.Ids ?? [];
        BulkRequests.RequireAtMost(ids.Count, 500, "/ids");
        BulkRequests.RequireDistinct(ids);

        var failures = new List<Error>();
        var deletable = new List<string>();

        for (var index = 0; index < ids.Count; index++)
        {
            try
            {
                var widget = await store.FindVisibleAsync(context, ids[index], cancellationToken)
                    ?? throw new NotFoundException("widget", ids[index]);
                deletable.Add(widget.Id);
            }
            catch (NotFoundException failure)
            {
                failures.Add(BulkFailure.At(failure, $"/ids/{index}"));
            }
        }

        // request.Atomicity is the caller's atomic parameter, already checked against Supports.
        if (request.Atomicity == Atomicity.AllOrNothing)
        {
            if (failures.Count > 0)
            {
                throw new BulkRefusedException(failures);
            }

            return BulkResult.Affected(await store.DeleteAsync(deletable, cancellationToken));
        }

        // Best-effort: each widget stands alone, and one failure undoes nothing else.
        return BulkResult.BestEffort(await store.DeleteAsync(deletable, cancellationToken), failures);
    }
}
```

- **Request-level problems refuse the whole request** in either mode. `RequireAtMost`,
  `RequireDistinct` and the platform's targeting checks all throw before any resource is touched.
- **All-or-nothing:** collect every failure and throw `BulkRefusedException(failures)`. The caller
  gets `422` with one error per failure, and nothing changes.
- **Best-effort:** return `BulkResult.BestEffort(affected, failures)`. The caller gets `200` with
  the counts and one error per failure.

## Things to know

- **The package doesn't open a transaction.** To make all-or-nothing hold, check every resource
  before writing any, and write the changes in one transaction, so a failure part way through leaves
  nothing changed.
- **`BulkRefusedException` always answers `422`.** To answer `409` when every failure is a version
  conflict, use the `BulkRefusals.For` helper on [Bulk responses](bulk-responses.md).
- **Catch only per-resource failures.** Pass the exceptions your rules throw (`NotFoundException`,
  `ConflictException`, `InvalidRequestException` and so on) to `BulkFailure.At`. Let anything else
  propagate: `BulkFailure.At` describes an unrecognized exception as a `500` without its message.
- **Choosing a mode.** All-or-nothing when a partial result would leave related resources
  inconsistent, or the caller treats the set as one. Best-effort when each resource stands alone and
  the caller can report or retry individual failures.

## See also

- [Bulk operations](index.md)
- [Bulk responses](bulk-responses.md)
- [Targeting](targeting.md)
