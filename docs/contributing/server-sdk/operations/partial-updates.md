---
sidebar_position: 5
---

# Partial updates

**Audience:** engineers writing a Bitwarden service, and its API, with the server SDK.

The package has no attribute for `PATCH`. To change one member, give the change its own action with
`[StandardAction]`; to change several, replace the resource with `PUT`. If you must offer `PATCH`,
map it yourself and take the body as a `JsonObject`.

## Change one member with an action

Give the change a small request record and a `[StandardAction]` handler. Renaming a widget:

```csharp
using System.ComponentModel.DataAnnotations;
using Bitwarden.Server.Sdk.Errors;
using Bitwarden.Server.Sdk.Resources;
using static Bitwarden.Server.Sdk.Resources.StandardResponses;

public static class WidgetsEndpoints
{
    public const string Collection = "api/v1/widgets";

    public static void Map(IEndpointRouteBuilder endpoints)
    {
        var widgets = endpoints.MapGroup(Collection).WithStandards();
        widgets.MapPost("{id}/actions/rename", Rename);
    }

    /// <summary>
    /// Rename a widget
    /// </summary>
    [StandardAction]
    public static async Task<ResourceDocument<Widget>> Rename(
        string id, RenameWidget request, IWidgetStore store, CancellationToken cancellationToken) =>
        ActionResponse(await store.RenameAsync(id, request.Name, cancellationToken)
            ?? throw new NotFoundException("widget", id));
}

/// <summary>
/// A widget's new name.
/// </summary>
/// <param name="Name">What the widget is to be called.</param>
public sealed record RenameWidget([property: StringLength(100)] string Name);
```

- The request record is bound and validated before your handler runs: a name over 100 characters is
  refused with `422`.
- `ActionResponse` answers `200` with the widget as it now stands.
- See [Acting upon resources](acting-upon-resources.md) for actions in general, and
  [Updating resources](updating-resources.md) for replacing the whole resource with `PUT`.

## Offer `PATCH` yourself

The package doesn't support partial updates, and a `ResourceDocument<T>` can't tell a member sent as
`null` from one left out: binding drops both, and drops a blank string too. To offer `PATCH`, map it
with `MapPatch`, take the body as a `JsonObject` so an absent member and an explicit `null` look
different, and do the checks a resource document would have done:

```csharp
using System.Text.Json;
using System.Text.Json.Nodes;
using Bitwarden.Server.Sdk.Errors;
using Bitwarden.Server.Sdk.Resources;
using static Bitwarden.Server.Sdk.Resources.StandardResponses;

public static class PatchedWidgetsEndpoints
{
    public static void Map(IEndpointRouteBuilder endpoints)
    {
        var widgets = endpoints.MapGroup(WidgetsEndpoints.Collection).WithStandards();

        // No standard attribute describes a PATCH, so name the operation here.
        widgets.MapPatch("{id}", PatchWidget).WithName("patchWidget");
    }

    /// <summary>
    /// Change some of a widget's fields
    /// </summary>
    public static async Task<ResourceDocument<Widget>> PatchWidget(
        string id, JsonObject request, IWidgetStore store, CancellationToken cancellationToken)
    {
        // A plain body, so the service sees an absent member and an explicit null apart. Checking
        // the document's type, id and every value is the service's own work.
        if (request["data"] is not JsonObject { } data
            || data["type"] is not JsonValue type || type.GetValueKind() != JsonValueKind.String
            || type.GetValue<string>() != "widget")
        {
            throw new InvalidRequestException("A resource of type 'widget' was expected.", "/data/type", "invalid-resource-type");
        }

        if (data["id"] is JsonValue sent && (sent.GetValueKind() != JsonValueKind.String || sent.GetValue<string>() != id))
        {
            throw new InvalidRequestException("The resource's id is not the one in the path.", "/data/id");
        }

        var attributes = data["attributes"] as JsonObject ?? [];
        var widget = await store.FindAsync(id, cancellationToken) ?? throw new NotFoundException("widget", id);

        // Absent or an empty string: unchanged. Null: cleared.
        if (attributes.TryGetPropertyValue("notes", out var notes) && !IsEmptyString(notes))
        {
            widget = widget with { Notes = notes is null ? null : Text(notes, "notes", 10_000) };
        }

        if (attributes.TryGetPropertyValue("name", out var name) && !IsEmptyString(name))
        {
            // Name is required, so it can be changed but not cleared.
            widget = widget with { Name = name is null ? throw Required("name") : Text(name, "name", 100) };
        }

        return UpdateResponse(await store.ReplaceAsync(id, widget, cancellationToken));
    }

    private static bool IsEmptyString(JsonNode? value) =>
        value is JsonValue text && text.GetValueKind() == JsonValueKind.String && text.GetValue<string>().Length == 0;

    private static string Text(JsonNode value, string field, int maxLength) =>
        value is JsonValue text && text.GetValueKind() == JsonValueKind.String && text.GetValue<string>().Length <= maxLength
            ? text.GetValue<string>()
            : throw new InvalidRequestException(
                $"The '{field}' field must be a string of at most {maxLength} characters.", $"/data/attributes/{field}");

    private static InvalidRequestException Required(string field) =>
        new($"The '{field}' field is required.", $"/data/attributes/{field}", "field-required");
}
```

- A member left out, or sent as an empty string, is unchanged. A member sent as `null` is cleared,
  unless it is required, which is refused.
- `MapPatch` works in a group mapped with `WithStandards()`. The endpoint gets the standard error
  document, a plain body's binding and validation (a body that isn't JSON is refused with `422`
  before your handler runs), and the service's write scope.
- It doesn't get an operation identifier (name it with `WithName`), a `type` or `id` check, or a
  documented resource schema. The handler does those checks itself.

## Things to know

- **Every check on a `PATCH` body is yours.** Type, `id`, each value's JSON type and bounds, which
  members may be cleared, and that nothing read-only changes. The sample checks two members; a real
  resource needs one check per member it accepts.
- **The OpenAPI document describes the `PATCH` body as a free-form object.** Describe the members in
  the operation's XML comments.
- **`PATCH` usually means two endpoints doing the same thing,** since a service that offers it still
  needs `PUT`. Prefer `PUT` and actions.
- **A verb nothing is mapped for answers `405`,** so a `PATCH` to a resource without one is refused.
- **Never decrypt.** An `[Encrypted]` member is replaced or cleared as a whole, never read.

## See also

- [Updating resources](updating-resources.md) and [Acting upon resources](acting-upon-resources.md)
- [Bulk updates](../bulk-and-asynchronous-work/bulk-operations/bulk-updates.md)
