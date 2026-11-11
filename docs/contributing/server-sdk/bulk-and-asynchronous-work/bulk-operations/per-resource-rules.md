---
sidebar_position: 3
---

# Per-resource rules

**Audience:** engineers writing a Bitwarden service, and its API, with the server SDK.

A bulk operation does to each resource what the single-resource API would: the same authorization,
validation, business rules and side effects. The package checks the request as a whole; applying
these rules to each resource is your handler's job, and `BulkFailure.At` reports each failure as the
single-resource API would.

## Share one set of rules between the single and bulk operation

Put the rules in one class that both the single-resource action and its bulk form call. The
endpoints stay thin:

```csharp
using Bitwarden.Server.Sdk.Context;
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

        endpoints.MapPost($"{Collection}:bulk-archive", ArchiveWidgets).WithStandards();
    }

    /// <summary>
    /// Archive a widget
    /// </summary>
    [StandardAction("archive")]
    public static Task ArchiveWidget(
        string id, IContext context, WidgetArchiving archiving, CancellationToken cancellationToken) =>
        archiving.ArchiveAsync(context, id, cancellationToken);

    /// <summary>
    /// Archive widgets
    /// </summary>
    [StandardBulkAction(Collection, "archive", Targeting = Targeting.Ids)]
    public static async Task<BulkResult> ArchiveWidgets(
        BulkAction<Widget> request, IContext context, WidgetArchiving archiving, CancellationToken cancellationToken)
    {
        var ids = request.Ids ?? [];
        BulkRequests.RequireAtMost(ids.Count, 100, "/ids");
        BulkRequests.RequireDistinct(ids);

        return await archiving.ArchiveAllAsync(context, ids, cancellationToken);
    }
}
```

`WidgetArchiving` applies the same check, the same change and the same event whether it is given one
widget or many:

```csharp
using Bitwarden.Server.Sdk.Context;
using Bitwarden.Server.Sdk.Errors;
using Bitwarden.Server.Sdk.Resources.Querying;

/// <summary>
/// Archives widgets, one or many, under one set of rules.
/// </summary>
public sealed class WidgetArchiving(IWidgetStore store, IWidgetEvents events)
{
    public async Task ArchiveAsync(IContext context, string id, CancellationToken cancellationToken)
    {
        var widget = await store.FindVisibleAsync(context, id, cancellationToken)
            ?? throw new NotFoundException("widget", id);

        Check(widget);
        widget.Archived = true;
        await store.SaveAsync([widget], cancellationToken);
        await events.ArchivedAsync(widget.Id, cancellationToken);
    }

    public async Task<BulkResult> ArchiveAllAsync(
        IContext context, IReadOnlyList<string> ids, CancellationToken cancellationToken)
    {
        var failures = new List<Bitwarden.Server.Sdk.Errors.Error>();
        var archived = new List<WidgetRow>();

        for (var index = 0; index < ids.Count; index++)
        {
            var widget = await store.FindVisibleAsync(context, ids[index], cancellationToken);

            try
            {
                // The same rules, in the same order, as the single-resource action.
                Check(widget ?? throw new NotFoundException("widget", ids[index]));
                widget.Archived = true;
                archived.Add(widget);
            }
            catch (Exception failure) when (failure is NotFoundException or InvalidRequestException)
            {
                failures.Add(BulkFailure.At(failure, $"/ids/{index}"));
            }
        }

        // All-or-nothing: report every failure, change nothing.
        if (failures.Count > 0)
        {
            throw new BulkRefusedException(failures);
        }

        await store.SaveAsync(archived, cancellationToken);

        // The same side effect for each widget that changed.
        foreach (var widget in archived)
        {
            await events.ArchivedAsync(widget.Id, cancellationToken);
        }

        return BulkResult.Affected(archived.Count);
    }

    private static void Check(WidgetRow widget)
    {
        if (widget.Archived)
        {
            throw new InvalidRequestException("The widget is already archived.", code: "already-archived");
        }
    }
}
```

- **`BulkFailure.At(exception, pointer)`** turns the exception the single action would throw into an
  error with the same status, code and detail, using the same mapping as the exception handler.
  Point it at the resource's position, such as `/ids/1`.
- **`BulkRefusedException(failures)`** refuses an all-or-nothing request with every failure.
- **The operation's own authorization** (its scope and context, set by the attribute) is checked
  once for the request. Each resource's authorization is yours.

## Things to know

- **Set-based writes are fine** as long as the outcome, including which resources fail and why,
  matches applying the rules one resource at a time. Check the rules against the loaded rows first,
  then write the changes together.
- **Rules that depend on state,** such as which transitions are allowed, are checked against each
  resource as it is. For a bulk update, check each resource both as it is and as it would be after
  the change.
- **Side effects.** Raise the same events, notifications and audit records for each changed resource
  as the single-resource API does. The package raises none. Where that is costly, make the
  operation's maximum smaller.

## See also

- [Bulk operations](index.md)
- [Targeting](targeting.md)
- [All-or-nothing and best-effort](all-or-nothing-and-best-effort.md)
- [Bulk actions](bulk-actions.md)
- [Errors](../../payloads-and-responses/errors.md)
