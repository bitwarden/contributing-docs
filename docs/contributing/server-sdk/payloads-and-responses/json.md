---
sidebar_position: 2
---

# JSON

**Audience:** engineers writing a Bitwarden service, and its API, with the server SDK.

`Service` configures the serializer every endpoint uses, and this package adds the converters for
its documents. You declare members with ordinary .NET types (`DateTimeOffset`, an `enum`, `string`,
`JsonElement`) and they are written and read in one consistent way. This page shows what it does
with each, and what it leaves to you.

## Declare dates, enumerations and free-form members

A resource with a date, an enumeration and a free-form member. `WidgetKind` needs nothing to be
written as `PLAIN` and `SPECIAL_EDITION`:

```csharp
using System.ComponentModel.DataAnnotations;
using System.Text.Json;
using Bitwarden.Server.Sdk.Data;
using Bitwarden.Server.Sdk.Resources;

/// <summary>
/// How a widget is made. Written as PLAIN and SPECIAL_EDITION.
/// </summary>
public enum WidgetKind
{
    Plain,
    SpecialEdition,
}

public sealed record Widget : Resource
{
    [StringLength(100)]
    public required string Name { get; init; }

    [Encrypted(MaxLength = 10_000)]
    public string? Notes { get; init; }

    /// <summary>
    /// How the widget is made.
    /// </summary>
    public WidgetKind Kind { get; init; }

    /// <summary>
    /// When the widget stops working, if it does.
    /// </summary>
    public DateTimeOffset? ExpirationDate { get; init; }

    /// <summary>
    /// Settings a client keeps for the widget, as a JSON object.
    /// </summary>
    public JsonElement? Settings { get; init; }
}
```

What the package does with these:

- **Dates.** `DateTimeOffset` and `DateTime` are written in UTC with a literal `Z`
  (`2027-03-01T07:30:00Z`), to the tick with trailing zeros left off. Any ISO 8601 offset is read,
  and a `DateTime` or `DateTimeOffset` without a zone is taken as UTC on any host, never as the
  host's local time. The offset a caller sent is not kept. Use `DateTimeOffset` for an instant.
- **Enumerations.** Members are written as their names in upper snake case (`SpecialEdition` is
  `SPECIAL_EDITION`), in the JSON and in the OpenAPI document. How they are read depends on where
  they arrive; see [Read enumerations in any case](#read-enumerations-in-any-case).
- **Strings in a resource.** A resource's string attributes are trimmed before validation. One that
  is `""` or blank is dropped, so a required one is refused `422` `field-required` and an optional
  one is `null`. Mark a string `[Verbatim]` to keep it exactly as sent (see
  [Standard fields](standard-fields.md)).
- **Absent members.** An absent member binds as `null`. A non-nullable member of a resource is
  required.
- **Nulls in responses.** Every response, error documents included, leaves out members whose value
  is `null`.
- **Field names.** Camel case. See [Naming conventions](naming-conventions.md).
- **Free-form members.** A `JsonElement` or a `JsonNode` takes any JSON value as sent: not trimmed,
  not type-checked, not validated.
- **Protected Data.** `Notes` is encrypted on the client. The service stores and returns it as it
  came and never reads it.

## Check free-form members, and write dates in messages

The handlers check the free-form member, filter by the enumeration, and write a date into a message
the way the JSON writes one, with `UtcDates.Text`:

```csharp
using System.Text.Json;
using Bitwarden.Server.Sdk.Errors;
using Bitwarden.Server.Sdk.Resources;
using Bitwarden.Server.Sdk.Resources.Querying;
using Bitwarden.Server.Sdk.Service;
using static Bitwarden.Server.Sdk.Resources.StandardResponses;

/// <summary>
/// The arguments of the expire action.
/// </summary>
public sealed record ExpireWidget(DateTimeOffset ExpirationDate);

[ApiTag(Description = "Widgets, which a person keeps.")]
public static class WidgetsEndpoints
{
    public const string Collection = "api/v1/widgets";

    public static void Map(IEndpointRouteBuilder endpoints)
    {
        var widgets = endpoints.MapGroup(Collection).WithStandards();
        widgets.MapPost("", CreateWidget);
        widgets.MapGet("", ListWidgets);
        widgets.MapPost("{id}/actions/expire", Expire);
    }

    /// <summary>
    /// Create a widget
    /// </summary>
    [StandardCreate]
    public static async Task<ResourceDocument<Widget>> CreateWidget(
        ResourceDocument<Widget> request, IWidgetStore store, CancellationToken cancellationToken)
    {
        // A free-form member takes any JSON value, so the service checks it itself.
        if (request.Data.Settings is { ValueKind: not JsonValueKind.Object })
        {
            throw new InvalidRequestException(
                "The 'settings' field must be an object.", "/data/attributes/settings");
        }

        return CreateResponse(await store.AddAsync(request.Data, cancellationToken));
    }

    /// <summary>
    /// List widgets
    /// </summary>
    /// <param name="kind">Only widgets made this way, such as SPECIAL_EDITION.</param>
    /// <param name="store">Where widgets are kept.</param>
    /// <param name="cancellationToken">Cancels the request.</param>
    [StandardReadMany]
    public static async Task<ResourceListDocument<Widget>> ListWidgets(
        Filter<WidgetKind>? kind, IWidgetStore store, CancellationToken cancellationToken) =>
        ReadManyResponse(await store.ListAsync(kind?.Value, cancellationToken));

    /// <summary>
    /// Expire a widget
    /// </summary>
    [StandardAction]
    public static async Task<ResourceDocument<Widget>> Expire(
        string id, ExpireWidget request, IWidgetStore store, CancellationToken cancellationToken)
    {
        var now = DateTimeOffset.UtcNow;

        if (request.ExpirationDate < now)
        {
            // UtcDates.Text writes a date in a message as the JSON does: UTC, with a Z.
            throw new InvalidRequestException(
                $"A widget can't expire before now ({UtcDates.Text(now)}).", "/expirationDate");
        }

        return ActionResponse(await store.ExpireAsync(id, request.ExpirationDate, cancellationToken));
    }
}
```

- Check the kind and shape of a `JsonElement` before you store it, as `CreateWidget` does, and throw
  `InvalidRequestException` at its pointer when it is wrong.
- Use `UtcDates.Text` whenever a date appears in text you write, so it matches the JSON.

## Read enumerations in any case

The package reads an enumeration value differently depending on where it arrives:

- **A `filter[...]` parameter (`Filter<T>`):** the upper snake case name, in any case. Anything else
  is refused `422`.
- **A resource attribute:** the upper snake case name, exactly. A name the enumeration doesn't have
  is refused `422` with the permitted values. The right name in another case passes that check and
  is then refused `422` `invalid-value`.
- **A plain JSON body:** the upper snake case name exactly, or any number, defined or not. Anything
  else is refused `422`.
- **A plain route, query or header parameter:** the C# member name exactly, or any number, as
  ASP.NET Core parses an enumeration. The upper snake case name is refused.

The package doesn't read every enumeration value in any case. To do it, use `Filter<T>` for a
filter. For any other parameter or plain-body member, take a `string` and read it with
`EnumValues.TryParse`, which matches the published names in any case:

```csharp
/// <summary>
/// The arguments of the reclassify action. The kind is a string, so any case is read.
/// </summary>
public sealed record ReclassifyWidget(string Kind);

public static class ReclassifyEndpoints
{
    /// <summary>
    /// Change how a widget is made
    /// </summary>
    [StandardAction]
    public static async Task<ResourceDocument<Widget>> Reclassify(
        string id, ReclassifyWidget request, IWidgetStore store, CancellationToken cancellationToken)
    {
        // EnumValues.TryParse matches the published names (PLAIN, SPECIAL_EDITION) in any case.
        if (!EnumValues.TryParse(typeof(WidgetKind), request.Kind, out var kind))
        {
            var permitted = string.Join(", ", EnumValues.Of(typeof(WidgetKind)));
            throw new InvalidRequestException($"The 'kind' field must be one of: {permitted}.", "/kind");
        }

        return ActionResponse(await store.ReclassifyAsync(id, (WidgetKind)kind!, cancellationToken));
    }
}
```

A resource attribute keeps its enumeration type. Tell callers to send its value in capitals.

## Things to know

- **Nested objects and plain bodies are not cleaned up.** Trimming and dropping `""` happen only on
  a resource's top-level string attributes. Strings inside a nested object, and in a body that isn't
  a resource document, keep `""` and padding. Trim them, and treat `""` as absent, in the handler. A
  declared `[Required]` refuses `""` and blank strings, where the implied one does not.
- **Absent value types in a plain body.** An absent `int` or `bool` binds as `0` or `false`. To
  refuse its absence, declare it nullable and `[Required]`.
- **Free-form members are yours to check.** Nothing about a `JsonElement` is validated.

## See also

- [Naming conventions](naming-conventions.md): field names and enumeration values.
- [Request validation](request-validation.md): what is refused, and how.
- [Standard fields](standard-fields.md): `[Verbatim]` and the inherited members.
- [Filtering](../querying/filtering.md): `Filter<T>` and ranges of dates.
