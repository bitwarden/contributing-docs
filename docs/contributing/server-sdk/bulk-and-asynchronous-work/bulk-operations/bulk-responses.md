---
sidebar_position: 6
---

# Bulk responses

**Audience:** engineers writing a Bitwarden service, and its API, with the server SDK.

A bulk handler returns what the caller learns: how many resources succeeded and, for best-effort,
which failed and why. The package gives you `BulkResult`, `BulkCreatedDocument<T>`, `BulkFailure`
and `BulkRefusedException` to build these.

## Return the outcome

| Return or throw                                | When                                     | The caller gets                                                                                |
| ---------------------------------------------- | ---------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `BulkResult.Affected(count)`                   | All-or-nothing success                   | `200` with `meta.affectedCount`                                                                |
| `BulkResult.BestEffort(affected, failures)`    | Best-effort                              | `200` with `meta.affectedCount`, `meta.failedCount` (even when `0`) and one error per failure  |
| `BulkCreatedDocument<T>.For(request, created)` | All-or-nothing bulk create               | `200` with the created resources in request order, each `lid` echoed, and `meta.affectedCount` |
| Nothing (`Task`)                               | All-or-nothing, when counts don't matter | `204`, and the OpenAPI document says so                                                        |
| `throw new BulkRefusedException(failures)`     | All-or-nothing failure                   | `422` with every failure                                                                       |

- **`BulkFailure.At(exception, pointer)`** builds one failure. It uses the same mapping as the
  exception handler: `404` for `NotFoundException`, `409` for `ConflictException`, `422` for
  `InvalidRequestException` (keeping its `code`), and a `500` without the message for anything else.
- **Give each business rule its own `code`.** `InvalidRequestException` takes a `code` argument
  (`name-in-use`, `archived`), so callers can tell failures apart.

## Identify a failed resource

A failed resource is identified by its position when the caller named it, and by `meta.resource`
when a filter matched it, since it has no position in the request:

```csharp
using Bitwarden.Server.Sdk.Errors;
using Bitwarden.Server.Sdk.Resources.Querying;

public static class WidgetBulkFailures
{
    /// <summary>
    /// A widget named in the request, by its position there.
    /// </summary>
    public static Error Named(Exception failure, int index) =>
        BulkFailure.At(failure, $"/ids/{index}");

    /// <summary>
    /// A widget a filter matched, which has no position in the request to point at.
    /// </summary>
    public static Error Matched(Exception failure, string id) =>
        BulkFailure.At(failure, "/filter") with
        {
            Source = null,
            Meta = new Dictionary<string, object?> { ["resource"] = new FailedResource("widget", id) },
        };
}
```

`FailedResource(type, id)` is in `Bitwarden.Server.Sdk.Errors`.

## Answer 409 when every failure is a version conflict

`BulkRefusedException` always answers `422`. To answer `409` when every failure is a version
conflict, as an all-or-nothing bulk replace using `Concurrency.Require` can produce, throw your own
`IProvideErrors` (`Bitwarden.Server.Sdk.Errors`). It chooses the status and carries many errors, and
the exception handler writes them as the usual error document:

```csharp
/// <summary>
/// An all-or-nothing refusal in which every failure is a version conflict: a 409.
/// </summary>
public sealed class BulkConflictException(IReadOnlyList<Error> errors)
    : Exception("The request was refused; nothing was changed."), IProvideErrors
{
    public int StatusCode => StatusCodes.Status409Conflict;

    public IReadOnlyList<Error> Errors { get; } = errors;
}

public static class BulkRefusals
{
    /// <summary>
    /// The refusal for an all-or-nothing failure: 409 when every failure is a conflict, 422 otherwise.
    /// </summary>
    public static Exception For(IReadOnlyList<Error> failures) =>
        failures.All(failure => failure.Status == "409")
            ? new BulkConflictException(failures)
            : new BulkRefusedException(failures);
}
```

Throw `BulkRefusals.For(failures)` where you would throw `BulkRefusedException`. See
[Bulk replaces](bulk-replaces.md) for it in use.

## Things to know

- **Updates and replaces return counts only.** The package has no document that carries both counts
  and resources, so return `BulkResult`.
- **Best-effort creates can't return the created resources.** `BulkCreatedDocument<T>` has no
  `errors` and needs one created resource per item. A best-effort create can return
  `BulkResult.BestEffort`, which reports failures but not identifiers. See
  [Bulk creates](bulk-creates.md).
- **Don't return nothing from a best-effort operation.** The package allows it, but the caller then
  never learns `failedCount`.
- **No `202 Accepted`.** See [Synchronous and asynchronous](synchronous-and-asynchronous.md).

## See also

- [Bulk operations](index.md)
- [All-or-nothing and best-effort](all-or-nothing-and-best-effort.md)
- [Bulk creates](bulk-creates.md)
- [Errors](../../payloads-and-responses/errors.md)
