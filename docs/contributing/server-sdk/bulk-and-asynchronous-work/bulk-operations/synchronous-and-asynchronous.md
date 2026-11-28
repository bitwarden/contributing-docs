---
sidebar_position: 5
---

# Synchronous and asynchronous

**Audience:** engineers writing a Bitwarden service, and its API, with the server SDK.

Every bulk operation the package provides is synchronous: it answers when the work is done, with
what your handler returns. The package has no asynchronous execution: no `202 Accepted`, no job, and
no handling of `Prefer: respond-async`.

## Keep a bulk operation bounded

To keep answering synchronously cheap, cap the work with `BulkRequests.RequireAtMost` and say in the
handler's documentation that the operation responds synchronously:

```csharp
using Bitwarden.Server.Sdk.Resources;
using Bitwarden.Server.Sdk.Resources.Querying;

[ApiTag(Description = "Widgets, which a person keeps.")]
public static class WidgetsEndpoints
{
    public const string Collection = "api/v1/widgets";

    // The largest request the operation processes while the caller waits.
    public const int MaxIds = 500;

    public static void Map(IEndpointRouteBuilder endpoints) =>
        endpoints.MapPost($"{Collection}:bulk-archive", ArchiveWidgets).WithStandards();

    /// <summary>
    /// Archive widgets
    /// </summary>
    /// <remarks>
    /// Names the widgets by `ids`, at most 500. All-or-nothing. Responds synchronously: the
    /// response carries the outcome, and a larger request is refused with 422.
    /// </remarks>
    [StandardBulkAction(Collection, "archive", Targeting = Targeting.Ids)]
    public static async Task<BulkResult> ArchiveWidgets(
        BulkAction<Widget> request, IWidgetStore store, CancellationToken cancellationToken)
    {
        var ids = request.Ids ?? [];
        BulkRequests.RequireAtMost(ids.Count, MaxIds, "/ids");
        BulkRequests.RequireDistinct(ids);

        return BulkResult.Affected(await store.ArchiveAsync(ids, cancellationToken));
    }
}
```

- A request over the maximum is refused with `422` before any widget is touched.
- A request carrying `Prefer: respond-async` is answered synchronously like any other.

## Things to know

- **Choose a maximum** that keeps the slowest request well inside the time a caller, and the
  infrastructure in front of the service, will wait. A resource that raises events or calls another
  service counts for more.
- **The package doesn't document execution.** Write "Responds synchronously" in the handler's
  `<remarks>`, as above.
- **For work you can't bound,** the package has no answer yet. Don't design an asynchronous
  operation of your own; see [Jobs](../jobs.md). Where the later work is another service reacting to
  a change, publish an event instead.

## See also

- [Bulk operations](index.md)
- [Bulk responses](bulk-responses.md)
- [Jobs](../jobs.md)
