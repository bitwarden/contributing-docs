---
sidebar_position: 7
---

# Request validation

**Audience:** engineers writing a Bitwarden service, and its API, with the server SDK.

The package binds and validates every request before your handler runs. It reads the rules from your
parameter types, their nullability and their DataAnnotations attributes, and refuses a request that
fails with `422` (or `400` for a resource document that isn't JSON). Your handler checks only what
needs data.

## Declare the rules on a resource

A resource with constraints on its own members, on a nested object, and across members:

```csharp
using System.ComponentModel.DataAnnotations;
using Bitwarden.Server.Sdk.Data;
using Bitwarden.Server.Sdk.Resources;
using Bitwarden.Server.Sdk.Resources.Querying;

public sealed record Widget : Resource, IValidatableObject
{
    // Required, being non-nullable, and at most 100 characters.
    [StringLength(100)]
    public required string Name { get; init; }

    // Ciphertext: only its length is checked.
    [Encrypted(MaxLength = 10_000)]
    public string? Notes { get; init; }

    // Optional, and held to the 255-character default.
    public string? Color { get; init; }

    [Range(1, 500)]
    public int? Size { get; init; }

    // Its own members are validated too.
    public WidgetPart? Part { get; init; }

    public DateTimeOffset? AvailableDate { get; init; }

    public DateTimeOffset? ExpirationDate { get; init; }

    // A rule across members, checked once every member passes its own.
    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (AvailableDate is { } available && ExpirationDate is { } expiration && expiration <= available)
        {
            yield return new ValidationResult(
                "A widget must expire after it becomes available.", [nameof(ExpirationDate)]);
        }
    }
}

public sealed record WidgetPart
{
    [StringLength(20)]
    public string? Label { get; init; }

    [RegularExpression("^[A-Z]{3}$")]
    public string? Code { get; init; }
}
```

What the package does with these:

- **Required.** A non-nullable member is required: a resource's attributes, a plain body's
  reference-typed members, and members of nested objects. A resource attribute that is `null`, `""`
  or blank counts as absent. A non-nullable route, query or header parameter is required too.
- **Type.** A resource attribute of the wrong JSON kind is refused `invalid-type`. A route, query or
  header value that doesn't convert is refused.
- **Bounds.** Every DataAnnotations attribute runs (`[Range]`, `[StringLength]`,
  `[RegularExpression]`, `[EmailAddress]` and the rest), on nested objects and list items too.
- **Default length.** A resource's own string attributes are limited to 255 characters unless they
  declare `[StringLength]`, `[MaxLength]` or `[Encrypted(MaxLength = ...)]`.
- **Protected Data.** `[Encrypted(MaxLength = ...)]` (`Bitwarden.Server.Sdk.Data`) checks the
  ciphertext's length. Add `WellFormed = true` to also refuse a value that isn't shaped like an
  encrypted string (its type, pieces and base64), as "Notes is not a valid encrypted string.". The
  value is never decrypted. Ciphertext is longer than the text it hides, so give it a larger bound
  than you would the text.
- **Cross-member rules.** `IValidatableObject.Validate` runs once every member passes its own rules.
- **Errors.** Each points at what failed: `source.pointer` into the body
  (`/data/attributes/part/code`), or `source.parameter` for a query parameter. Up to 200 are
  returned at once. See [Errors](errors.md).

A resource document is checked a level at a time: its shape, then each attribute's presence and
kind, then the declared rules, then each object's `IValidatableObject`. A request that fails one
level is not checked at the next, so an absent `name` is reported without the over-long `color`
beside it.

The same rules apply to `[FromForm]` and `[AsParameters]` models.

## Check what needs data, and validate a plain body

What only the service can know, it checks in the handler, after everything declared has passed. An
action's plain body is validated the same way:

```csharp
using System.ComponentModel.DataAnnotations;
using Bitwarden.Server.Sdk.Errors;
using Bitwarden.Server.Sdk.Resources;
using Bitwarden.Server.Sdk.Resources.Querying;
using static Bitwarden.Server.Sdk.Resources.StandardResponses;

/// <summary>
/// The arguments of the polish action.
/// </summary>
/// <param name="Shine">How hard to polish, from 1 to 10.</param>
/// <remarks>
/// Nullable and [Required], so a body without it is refused rather than read as 0.
/// </remarks>
public sealed record PolishWidget([property: Required, Range(1, 10)] int? Shine);

[ApiTag(Description = "Widgets, which a person keeps.")]
public static class WidgetsEndpoints
{
    public const string Collection = "api/v1/widgets";

    public static void Map(IEndpointRouteBuilder endpoints)
    {
        var widgets = endpoints.MapGroup(Collection).WithStandards();
        widgets.MapPost("", CreateWidget);
        widgets.MapPost("{id}/actions/polish", Polish);
    }

    /// <summary>
    /// Create a widget
    /// </summary>
    [StandardCreate]
    public static async Task<ResourceDocument<Widget>> CreateWidget(
        ResourceDocument<Widget> request, IWidgetStore store, CancellationToken cancellationToken)
    {
        // Everything declared has been checked. What needs the store is the service's to check.
        if (await store.NameTakenAsync(request.Data.Name, cancellationToken))
        {
            throw new InvalidRequestException(
                $"A widget called '{request.Data.Name}' already exists.", "/data/attributes/name",
                ErrorCodes.AlreadyExists);
        }

        return CreateResponse(await store.AddAsync(request.Data, cancellationToken));
    }

    /// <summary>
    /// Polish a widget
    /// </summary>
    [StandardAction]
    public static async Task<ResourceDocument<Widget>> Polish(
        string id, PolishWidget request, IWidgetStore store, CancellationToken cancellationToken) =>
        ActionResponse(await store.PolishAsync(id, request.Shine!.Value, cancellationToken));
}
```

- For a rule that needs data (a name already taken, a reference that doesn't resolve, a state change
  that isn't allowed), throw `InvalidRequestException` with a pointer. Add a code such as
  `ErrorCodes.AlreadyExists` where a caller branches on it.
- In a plain body, an absent number or flag reads as `0` or `false`. Make one that must be sent
  nullable and `[Required]`, as `PolishWidget` does. A body of `{}` is then refused `422` at
  `/shine` before `Polish` runs.
- A plain body that doesn't deserialize is refused `422` with the serializer's message.
- The package checks a body's `type` but not its `id`. Compare the `id` with the path yourself; see
  [Payload shape](payload-shape.md).

## Keep a route that answers bad requests its own way

`[AcceptsInvalidRequests]`, on a handler or its class, runs the handler even when binding or
validation failed. Use it only for a route whose existing clients expect their own shape of answer:

```csharp
using Bitwarden.Server.Sdk.Resources;

/// <summary>
/// The body an existing client sends to the legacy route.
/// </summary>
public sealed record LegacyWidgetRename(string NewName);

/// <summary>
/// The answer the existing client expects.
/// </summary>
public sealed record LegacyAnswer(bool Ok, string? Message);

[ApiTag(Description = "Routes kept in the shape existing clients expect.")]
[AcceptsInvalidRequests]
public static class LegacyWidgetsEndpoints
{
    public static void Map(IEndpointRouteBuilder endpoints)
    {
        var legacy = endpoints.MapGroup("api/legacy/widgets").WithStandards();
        legacy.MapPost("{id}/rename", Rename);
    }

    /// <summary>
    /// Rename a widget, as existing clients do
    /// </summary>
    public static IResult Rename(string id, LegacyWidgetRename? request, HttpContext http)
    {
        // Not readable: the handler still runs, and answers in the shape its clients know.
        if (request is null)
        {
            var sent = http.Features.Get<UnreadableRequestBody>()?.Body.Length ?? 0;
            return Results.BadRequest(new LegacyAnswer(false, $"Could not read the {sent} bytes sent."));
        }

        return Results.Ok(new LegacyAnswer(true, null));
    }
}
```

- A body the package can't read binds as `null`, and its bytes are in the request's
  `UnreadableRequestBody` feature.
- A body that isn't JSON is still refused `415`, and a route, query or header value that doesn't
  convert is still refused `400`.
- The handler validates everything else itself.

## Nested members

A member of a nested object is refused at its own pointer, such as `/data/attributes/part/label`.
One declared with C#'s `required` keyword and left out is refused `422` `field-required`, and one
holding a value its type can't, such as a string for an `int`, `422` `invalid-value`. A member
declared non-nullable without `required`, or nullable, is validated like any other:

```csharp
public sealed record WidgetPart
{
    // Non-nullable without `required`: an absent label is refused 422 at its pointer.
    [StringLength(20)]
    public string Label { get; init; } = null!;

    [RegularExpression("^[A-Z]{3}$")]
    public string? Code { get; init; }
}
```

## Things to know

- **Bound every string.** The 255-character default applies only to a resource's top-level string
  attributes. Give strings in nested objects and plain bodies a `[StringLength]` yourself.
- **`""` outside a resource's attributes.** In a nested object or plain body, `""` passes the
  implied required rule. Declare `[Required]` to refuse it.
- **`[Encrypted]` needs a positive `MaxLength`.** Without one, the service still starts, but
  validating the resource and writing the OpenAPI document both fail with `500`.
- **Enumerations are read unevenly.** See [JSON](json.md#read-enumerations-in-any-case).
- **Query parameters.** `sort` and `fields` are checked against real fields; see
  [Sorting](../querying/sorting.md) and [Sparse fieldsets](../querying/sparse-fieldsets.md).

## See also

- [Errors](errors.md): the error document and `InvalidRequestException`.
- [JSON](json.md): trimming, empty strings and enumerations.
- [Unrecognized fields, query parameters, and headers](../contracts/unrecognized-fields-query-parameters-and-headers.md):
  what is dropped rather than refused.
- [Filtering](../querying/filtering.md): how filter values are checked.
