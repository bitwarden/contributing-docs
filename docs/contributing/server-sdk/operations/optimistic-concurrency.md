---
sidebar_position: 6
---

# Optimistic concurrency

**Audience:** engineers writing a Bitwarden service, and its API, with the server SDK.

Every `Resource` has a `Version`. To stop one caller overwriting another's change, return the
version in every response, compare the one the caller sends back with `Concurrency.Require`, and
have your store write only if the version is unchanged.

## Check the version on an update

Read the stored widget, check the sent version against it, then write conditionally:

```csharp
using System.Globalization;
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
        widgets.MapPut("{id}", UpdateWidget);
    }

    /// <summary>
    /// Replace a widget
    /// </summary>
    [StandardUpdate]
    public static async Task<ResourceDocument<Widget>> UpdateWidget(
        string id, ResourceDocument<Widget> request, IWidgetStore store, CancellationToken cancellationToken)
    {
        var stored = await store.FindAsync(id, cancellationToken) ?? throw new NotFoundException("widget", id);

        // 409 when the caller sent a version that is no longer the stored one.
        Concurrency.Require(request.Data.Version, stored.Version);

        // The store writes only if the row is still at stored.Version, and adds one to it.
        var replaced = await store.ReplaceAsync(id, request.Data, stored.Version, cancellationToken)
            ?? throw new ConflictException();

        return UpdateResponse(ToResource(replaced));
    }

    private static Widget ToResource(WidgetEntity entity) => new()
    {
        Id = entity.Id,
        Name = entity.Name,
        Notes = entity.Notes,
        Version = entity.Version.ToString(CultureInfo.InvariantCulture),
    };
}
```

- **`Concurrency.Require(sent, stored)`** (in `Bitwarden.Server.Sdk.Resources.Querying`) compares
  the sent string with an `int` stored version, formatted invariantly. A mismatch throws
  `ConflictException`, which answers `409` with the `conflict` code.
- **The store's conditional write** catches two callers who read the same version and write at once.
  With Entity Framework Core, mark the version as a concurrency token, or update
  `WHERE Version = @expected` and check the row count. Throw `ConflictException` when it fails.
- **Return the new version as a string.** Your store adds one to it on each write; the package
  doesn't.

## Require the version

`Concurrency.Require` passes a caller who sends no version. To make the version required, refuse an
update without one before the check:

```csharp
// Concurrency.Require passes a caller who sends no version. Refuse one here to make the
// version required.
if (request.Data.Version is null)
{
    throw new InvalidRequestException(
        ErrorDetails.FieldRequired("version"), "/data/attributes/version", ErrorCodes.FieldRequired);
}
```

- `ErrorDetails` and `ErrorCodes` are in `Bitwarden.Server.Sdk.Errors`. The caller gets `422` with
  the `field-required` code, pointing at `version`.
- The OpenAPI document still shows `version` as optional.

## Things to know

- **The package doesn't require `version`.** It is optional in binding and in the OpenAPI document,
  and an empty string is treated as absent, so it passes `Concurrency.Require` too. Refuse a missing
  one yourself, as above.
- **The package doesn't increment the version.** Store it as your own integer column, add one on
  each write, and return it as a string in every representation, including creates and reads, so
  callers have one to send back.
- **Bulk replaces need the same check.** Each resource in a bulk replace carries its own `version`;
  call `Concurrency.Require` for each.
- **`ETag` and `If-Match` aren't used.** The package sets no `ETag` and doesn't read `If-Match`.
- **Skip the check where it adds nothing,** such as a resource only ever replaced whole by its
  owner.

## See also

- [Updating resources](updating-resources.md)
- [Standard fields](../payloads-and-responses/standard-fields.md)
- [Errors](../payloads-and-responses/errors.md)
- [Bulk replaces](../bulk-and-asynchronous-work/bulk-operations/bulk-replaces.md)
