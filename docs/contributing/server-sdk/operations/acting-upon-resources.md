---
sidebar_position: 8
---

# Acting upon resources

**Audience:** engineers writing a Bitwarden service, and its API, with the server SDK.

An operation that isn't a create, read, update or delete, such as a status change or sending an
email, is an action. Write a handler with `[StandardAction]`, give it a plain request type for any
arguments, and return `ActionResponse(...)` or nothing.

## Write an action

Three actions: one with arguments that returns the widget, one that returns nothing, and one on a
singleton:

```csharp
using System.ComponentModel.DataAnnotations;
using Bitwarden.Server.Sdk.Errors;
using Bitwarden.Server.Sdk.Resources;
using Bitwarden.Server.Sdk.Resources.Querying;
using static Bitwarden.Server.Sdk.Resources.StandardResponses;

public static class WidgetsEndpoints
{
    public const string Collection = "api/v1/widgets";

    public static void Map(IEndpointRouteBuilder endpoints)
    {
        var widgets = endpoints.MapGroup(Collection).WithStandards();
        widgets.MapPost("{id}/actions/polish", Polish);
        widgets.MapPost("{id}/actions/archive", ArchiveWidget);
        widgets.MapPost("current/actions/reset", Reset);
    }

    /// <summary>
    /// Polish a widget
    /// </summary>
    [StandardAction]
    public static async Task<ResourceDocument<Widget>> Polish(
        string id, PolishWidget request, IWidgetStore store, CancellationToken cancellationToken) =>
        ActionResponse(await store.PolishAsync(id, request.Shine, cancellationToken)
            ?? throw new NotFoundException("widget", id));

    /// <summary>
    /// Archive a widget
    /// </summary>
    [StandardAction("archive")]
    public static async Task ArchiveWidget(string id, IWidgetStore store, CancellationToken cancellationToken)
    {
        if (!await store.ArchiveAsync(id, cancellationToken))
        {
            throw new InvalidRequestException("Only an active widget can be archived.", code: "invalid-state");
        }
    }

    /// <summary>
    /// Reset the caller's widgets
    /// </summary>
    [StandardAction("reset", template: "current")]
    public static Task Reset(IWidgetStore store, CancellationToken cancellationToken) =>
        store.ResetAsync(cancellationToken);
}

/// <summary>
/// How to polish a widget.
/// </summary>
/// <param name="Shine">How much shine to add.</param>
public sealed record PolishWidget([property: Range(1, 10)] int Shine);
```

- **The route is built for you.** `[StandardAction]` maps to `{id}/actions/{action}`, and the
  `Map...` line must use that route and `MapPost`, or the service refuses to start.
- **The action's name is the method's, kebab-cased.** `Polish` is `polish` and `SendEmail` is
  `send-email`. A name you pass, such as `"archive"`, is kebab-cased too. An acronym stays one word:
  `VerifySsoToken` and `VerifySSOToken` are both `verify-sso-token`.
- **The operation identifier is the method's name in camel case** (`archiveWidget`), whatever the
  action is called.
- **`template` names the resource the action is on,** relative to the group. It defaults to `{id}`.
  For a singleton the caller's scope names, pass its literal: `template: "current"` gives
  `current/actions/reset`. The `actions/{action}` part is always added by the package.
- **The body is a plain JSON object** bound to your request type, with no `data` envelope. Its
  members are validated with data annotations: a `Shine` of 11 is refused with `422`, pointing at
  `/shine`. An action with no body parameter takes no body.
- **`ActionResponse` answers `200`** with the resource. A handler that returns nothing answers
  `204`.
- **An action demands the service's write scope** unless it declares a scope of its own. Give it its
  own `[Authorization]` where it needs a narrower permission than an update. See
  [Authentication and authorization](../running-a-service/authentication-and-authorization.md).

## Make a field that only actions change read-only

Mark the member `[ReadOnly]`. It is documented as read-only and dropped from creates and updates, so
only your actions change it:

```csharp
using System.ComponentModel.DataAnnotations;
using Bitwarden.Server.Sdk.Data;
using Bitwarden.Server.Sdk.Resources;

public sealed record Widget : Resource
{
    [StringLength(100)]
    public required string Name { get; init; }

    [Encrypted(MaxLength = 10_000)]
    public string? Notes { get; init; }

    /// <summary>
    /// Where the widget is in its life. Changed only by its actions.
    /// </summary>
    [ReadOnly]
    public WidgetStatus? Status { get; init; }
}

public enum WidgetStatus
{
    Active,
    Archived,
}
```

`[ReadOnly]` is `Bitwarden.Server.Sdk.Resources.ReadOnlyAttribute`, not the one in
`System.ComponentModel`.

## Things to know

- **Make anything with its own rules or permission an action,** such as a status transition, sending
  an email or adding one element to a collection. Don't model these as writes to a field.
- **Pick the error the caller can act on.** A transition that isn't allowed from the current state
  is the caller's mistake: throw `InvalidRequestException` with a code the caller can branch on, for
  `422`. A race with another write is `ConflictException`, for `409`.
- **There is no response for an action that is scheduled.** To answer `202`, return an `IResult` of
  your own. See [Jobs](../bulk-and-asynchronous-work/jobs.md).
- **Arguments that are Vault Data** are declared `[Encrypted]` on the request type and stored as
  they came. Never decrypt or log them.

## See also

- [Partial updates](partial-updates.md), where an action changes one member
- [Verbs](verbs.md)
- [Bulk actions](../bulk-and-asynchronous-work/bulk-operations/bulk-actions.md)
- [Authentication and authorization](../running-a-service/authentication-and-authorization.md)
