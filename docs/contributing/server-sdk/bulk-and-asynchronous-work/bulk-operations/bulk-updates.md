---
sidebar_position: 8
---

# Bulk updates

**Audience:** engineers writing a Bitwarden service, and its API, with the server SDK.

A bulk update applies one change, `update`, to every targeted resource. A field left out of `update`
is left alone, and an explicit `null` clears it. Declare it with `[StandardBulkUpdate(collection)]`
and take a `BulkUpdate<T>`; reading, validating and applying `update` is your handler's job.

## Apply one change to many resources

The endpoint reads the change first, so a bad `update` refuses the request before any widget is
looked at. Then it holds each matched widget to the single update's rules:

```csharp
using System.Text.Json;
using Bitwarden.Server.Sdk.Context;
using Bitwarden.Server.Sdk.Errors;
using Bitwarden.Server.Sdk.Resources;
using Bitwarden.Server.Sdk.Resources.Querying;

[ApiTag(Description = "Widgets, which a person keeps.")]
public static class WidgetsEndpoints
{
    public const string Collection = "api/v1/widgets";

    public static void Map(IEndpointRouteBuilder endpoints) =>
        endpoints.MapPost($"{Collection}:bulk-update", UpdateWidgets).WithStandards();

    /// <summary>
    /// Update widgets
    /// </summary>
    /// <remarks>
    /// Changes `name` or `notes` on every widget a `filter` matches. All-or-nothing. Responds
    /// synchronously.
    /// </remarks>
    [StandardBulkUpdate(Collection, Targeting = Targeting.Filter)]
    public static async Task<BulkResult> UpdateWidgets(
        BulkUpdate<Widget> request, IContext context, IWidgetStore store, CancellationToken cancellationToken)
    {
        // The update is a request-level check: a bad one refuses the request before any widget.
        var change = WidgetChange.From(request.Update);

        var widgets = await store.ListAsync(
            store.Visible(context.OrganizationId, context.UserId).Matching(request.Filter!), cancellationToken);

        var failures = new List<Error>();
        foreach (var widget in widgets)
        {
            // The single update's rules, held against the widget as it is.
            if (widget.Archived)
            {
                failures.Add(BulkFailure.At(
                    new InvalidRequestException("An archived widget cannot be changed.", code: "archived"),
                    "/filter") with
                {
                    Source = null,
                    Meta = new Dictionary<string, object?> { ["resource"] = new FailedResource("widget", widget.Id) },
                });
                continue;
            }

            change.ApplyTo(widget);

            // No version check, but every widget that changes moves to a new version.
            widget.Version++;
        }

        if (failures.Count > 0)
        {
            throw new BulkRefusedException(failures);
        }

        await store.SaveAsync(widgets, cancellationToken);

        return BulkResult.Affected(widgets.Count);
    }
}
```

What the package does for you:

- **Maps `POST {collection}:bulk-update`.** `Targeting` picks `ids` or `filter`, and `Supports` the
  atomicity modes. See [Targeting](targeting.md).
- **Requires `update`.** A request without it is refused with `422`.
- **Hands you `update` as sent.** `request.Update` is an `IReadOnlyDictionary<string, JsonElement>`
  keyed by the fields' published names. An absent field is absent from it, and an explicit `null` is
  a `JsonValueKind.Null` value.

## Read and validate the change

The package applies none of the single update's rules to `update`. It doesn't refuse read-only
fields or `version`, it doesn't apply the resource's annotations (`[StringLength]`,
`[Encrypted(MaxLength = ...)]`), and it doesn't increment the version. `WidgetChange` does all of
that: it accepts only the fields a single update may change, checks each value as the resource's
annotations would, and keeps the difference between an absent field and a `null`:

```csharp
/// <summary>
/// The fields a bulk update may change, read from its <c>update</c> member.
/// </summary>
public sealed class WidgetChange
{
    private bool _setsName;
    private string _name = "";
    private bool _setsNotes;
    private string? _notes;

    public static WidgetChange From(IReadOnlyDictionary<string, JsonElement> update)
    {
        var change = new WidgetChange();

        foreach (var (field, value) in update)
        {
            var pointer = $"/update/{field}";

            switch (field)
            {
                case "name":
                    // Required on the resource, so it can be changed but never cleared.
                    if (value.ValueKind != JsonValueKind.String || value.GetString() is not { Length: > 0 and <= 100 } name)
                    {
                        throw new InvalidRequestException("'name' is a string of 1 to 100 characters.", pointer);
                    }

                    (change._setsName, change._name) = (true, name);
                    break;

                case "notes":
                    // Protected Data: an explicit null clears it, and a string is stored as sent.
                    // Only its length is checked, as [Encrypted] would on a single update.
                    if (value.ValueKind == JsonValueKind.Null)
                    {
                        (change._setsNotes, change._notes) = (true, null);
                    }
                    else if (value.ValueKind == JsonValueKind.String && value.GetString() is { Length: <= 10_000 } notes)
                    {
                        (change._setsNotes, change._notes) = (true, notes);
                    }
                    else
                    {
                        throw new InvalidRequestException("'notes' is an encrypted string of at most 10000 characters.", pointer);
                    }

                    break;

                default:
                    // version, id, createdAt and the rest are read-only, or not fields at all.
                    throw new InvalidRequestException($"'{field}' cannot be changed by a bulk update.", pointer);
            }
        }

        return change;
    }

    public void ApplyTo(WidgetRow widget)
    {
        if (_setsName)
        {
            widget.Name = _name;
        }

        if (_setsNotes)
        {
            widget.Notes = _notes;
        }
    }
}
```

- Refuse every field the single update doesn't accept, including `version`, `id` and `createdAt`,
  with `422` at `/update/{field}`.
- Increment the version of every resource that changes. A bulk update makes no version check.
- `notes` holds Protected Data, ciphertext the person's device produced. The service checks only its
  length, stores it as sent, and never decrypts or inspects it.

## Things to know

- **Fields that change through an action are read-only here.** Changing a status for many resources
  is a [bulk action](bulk-actions.md), such as `:bulk-archive`, not a bulk update.
- **Check each resource as it is and after the change.** Rules that depend on state apply to both.
- **A failure matched by a filter has no position.** Identify it by `meta.resource`, as above. See
  [Bulk responses](bulk-responses.md).
- **A large `filter` match is loaded and checked before it is written.** Cap what one request may
  change, or offer `ids` targeting only.

## See also

- [Bulk operations](index.md)
- [Targeting](targeting.md)
- [Bulk responses](bulk-responses.md)
- [Bulk actions](bulk-actions.md)
- [Partial updates](../../operations/partial-updates.md)
