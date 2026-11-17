---
sidebar_position: 4
---

# Sparse fieldsets

**Audience:** engineers writing a Bitwarden service, and its API, with the server SDK.

A caller can ask for only some of a resource's attributes. You opt an operation in with a
`Fields<T>` parameter, read as `fields[{type}]`, and pass it to the response, which leaves the other
attributes out. `id` and `type` are always returned.

## Offer a fieldset on a read and a list

Add `Fields<T> fields = default` and pass it to `ReadOneResponse` or `ReadManyResponse`. Check
`fields.Includes` to skip work the caller didn't ask for. Here a read counts a widget's gadgets only
when the caller wants the count, with Entity Framework Core:

```csharp
using System.ComponentModel.DataAnnotations;
using Bitwarden.Server.Sdk.Data;
using Bitwarden.Server.Sdk.Errors;
using Bitwarden.Server.Sdk.Resources;
using Bitwarden.Server.Sdk.Resources.Querying;
using Microsoft.EntityFrameworkCore;
using static Bitwarden.Server.Sdk.Resources.StandardResponses;

[Sortable(nameof(CreatedAt), Default = true, Descending = true)]
public sealed record Widget : Resource
{
    /// <summary>
    /// What the widget is called.
    /// </summary>
    [Sortable]
    [StringLength(100)]
    public required string Name { get; init; }

    /// <summary>
    /// The person's notes, encrypted on their device.
    /// </summary>
    [Encrypted(MaxLength = 10_000)]
    public string? Notes { get; init; }

    /// <summary>
    /// How many gadgets use the widget. Counted when read.
    /// </summary>
    [ReadOnly]
    public int? GadgetCount { get; init; }
}

public static class WidgetsEndpoints
{
    public const string Collection = "api/v1/widgets";

    public static void Map(IEndpointRouteBuilder endpoints)
    {
        var widgets = endpoints.MapGroup(Collection).WithStandards();
        widgets.MapGet("", ListWidgets);
        widgets.MapGet("{id}", GetWidget);
    }

    /// <summary>
    /// Get a widget
    /// </summary>
    [StandardReadOne]
    public static async Task<ResourceDocument<Widget>> GetWidget(
        Guid id,
        WidgetDatabase database,
        Fields<Widget> fields = default,
        CancellationToken cancellationToken = default)
    {
        var entity = await database.Widgets.AsNoTracking()
            .SingleOrDefaultAsync(widget => widget.Id == id, cancellationToken)
            ?? throw new NotFoundException("widget", id.ToString());

        // Only count the gadgets when the caller wants the count.
        int? gadgets = fields.Includes("gadgetCount")
            ? await database.Gadgets.CountAsync(gadget => gadget.WidgetId == id, cancellationToken)
            : null;

        return ReadOneResponse(ToResource(entity, gadgets), fields);
    }

    /// <summary>
    /// List widgets
    /// </summary>
    [StandardReadMany]
    public static async Task<PagedResourceListDocument<Widget>> ListWidgets(
        WidgetDatabase database,
        Fields<Widget> fields = default,
        PageNumber pageNumber = default,
        PageSize pageSize = default,
        CancellationToken cancellationToken = default)
    {
        var page = new Page { Number = pageNumber, Size = pageSize };
        var widgets = database.Widgets.AsNoTracking();

        var rows = await widgets
            .SortedBy(Sort.Default<Widget>(), widget => widget.Id)
            .Page(page)
            .ToListAsync(cancellationToken);

        return ReadManyResponse(
            await rows.ToPagedAsync(page, row => ToResource(row, gadgets: null), widgets.CountAsync, cancellationToken),
            page,
            fields);
    }

    private static Widget ToResource(WidgetEntity entity, int? gadgets) =>
        new()
        {
            Id = entity.Id.ToString(),
            Name = entity.Name,
            Notes = entity.Notes,
            CreatedAt = entity.CreatedAt,
            GadgetCount = gadgets,
        };
}
```

- For a `Widget`, the parameter is `fields[widget]`, a comma-delimited list of attribute names. The
  OpenAPI document publishes it with the names it accepts.
- Every published attribute may be named, including inherited ones such as `createdAt` and
  `version`. A name that isn't an attribute is refused with `422` at the parameter.
- No fieldset means every attribute. `default`, and a request without the parameter, return the full
  resource, so adding `Fields<T>` never changes what an existing caller gets.
- An empty fieldset returns `id`, `type` and no attributes.
- `fields.Includes("name")` is true when the caller asked for the attribute, or sent no fieldset.
- The response leaves out the attributes outside the fieldset when it is written, so the same code
  serves resources built in memory. Page links carry the fieldset.
- `[ReadOnly]` here is `Bitwarden.Server.Sdk.Resources.ReadOnlyAttribute`: a caller reads the count
  but never sets it.

## Things to know

- **Offer it where an attribute costs something to produce,** and check `fields.Includes` before
  producing it.
- **The parameter is `fields[{type}]` only.** A caller who sends a plain `fields` parameter gets
  every attribute back. There is no setting to accept the plain form.
- **Cursor-paged lists can't apply a fieldset.** `ReadManyResponse` for a cursor page takes none, so
  leave `Fields<T>` off those operations.

## See also

- [Filtering](filtering.md), [Paging](paging.md) and [Sorting](sorting.md): the other query
  parameters.
