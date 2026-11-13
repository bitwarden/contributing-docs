---
sidebar_position: 3
---

# Sorting

**Audience:** engineers writing a Bitwarden service, and its API, with the server SDK.

A caller chooses the order of a collection with a `sort` parameter: a comma-delimited list of
fields, each descending when it starts with `-`. You mark sortable fields with `[Sortable]` on the
resource and take a `Sort? sort` parameter; `SortedBy` applies the order to a query.

## Declare the sortable fields

Mark each sortable property `[Sortable]`. Mark an inherited field, such as `CreatedAt`, with
`[Sortable(nameof(CreatedAt))]` on the record. Exactly one field sets `Default = true`:

```csharp
using System.ComponentModel.DataAnnotations;
using Bitwarden.Server.Sdk.Data;
using Bitwarden.Server.Sdk.Resources;
using Bitwarden.Server.Sdk.Resources.Querying;

[Sortable(nameof(CreatedAt), Default = true, Descending = true)]
[Sortable(nameof(UpdatedAt), MappedTo = nameof(WidgetEntity.ModifiedAt))]
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
}
```

- `Descending = true` makes the default order run largest first. `Sort.Default<Widget>()` returns
  the default.
- `MappedTo` names the entity property a field is stored under, when it differs from the resource's.
  Without it, `SortedBy` looks for an entity property of the same name.
- The OpenAPI document lists the sortable fields and the default under `sort`.

## Sort a list

Take `Sort? sort`, fall back to the default, and break ties on the identifier. Here with Entity
Framework Core:

```csharp
using Bitwarden.Server.Sdk.Resources;
using Bitwarden.Server.Sdk.Resources.Querying;
using Microsoft.EntityFrameworkCore;
using static Bitwarden.Server.Sdk.Resources.StandardResponses;

/// <summary>
/// List widgets
/// </summary>
[StandardReadMany]
public static async Task<PagedResourceListDocument<Widget>> ListWidgets(
    Sort? sort,
    WidgetDatabase database,
    PageNumber pageNumber = default,
    PageSize pageSize = default,
    CancellationToken cancellationToken = default)
{
    var page = new Page { Number = pageNumber, Size = pageSize };
    var widgets = database.Widgets.AsNoTracking();

    // The caller's order, or the resource's default, then the identifier so rows that
    // share a value keep one order from page to page.
    var rows = await widgets
        .SortedBy(sort ?? Sort.Default<Widget>(), widget => widget.Id)
        .Page(page)
        .ToListAsync(cancellationToken);

    return ReadManyResponse(
        await rows.ToPagedAsync(page, ToResource, widgets.CountAsync, cancellationToken),
        page);
}
```

- The binder knows the resource from the handler's return type. `sort` is `null` when the caller
  didn't send it.
- Only fields the resource marks `[Sortable]` are accepted. Anything else is refused with `422`,
  listing the sortable fields, and so is a field named twice or a `sort` naming no field.
- Names match without regard to case, so `NAME` is `name`.
- `Sort.Fields` lists the requested `SortBy` values (a field and a `SortDirection`) in order of
  precedence.
- `SortedBy` builds `OrderBy` and `ThenBy` calls as an expression tree, so the order runs in the
  database. With `sort=-updatedAt,name`, this sample orders by `ModifiedAt` descending, then by
  name, then by identifier.
- Always pass the tie-break when the result is paged. Without a unique last field, the database may
  order rows that share a value differently on each request.

## Sort in memory

`SortedBy` works on any `IQueryable`, so `AsQueryable()` sorts a list in memory. It resolves fields
on the type it sorts, through `MappedTo`, so sort the stored rows when a field is mapped:

```csharp
public static List<WidgetEntity> Sorted(IReadOnlyList<WidgetEntity> rows, Sort? sort) =>
    rows.AsQueryable()
        .SortedBy(sort ?? Sort.Default<Widget>(), row => row.Id)
        .ToList();
```

A list of resources sorts the same way when every sortable field is a property of the resource under
its own name.

## Build a sort in code

`Sort.By` builds a sort without a request. It isn't tied to a resource, so its fields are the
entity's own property names:

```csharp
public static IQueryable<WidgetEntity> NewestFirst(WidgetDatabase database) =>
    // Built by hand, a sort names the entity's own properties.
    database.Widgets.SortedBy(Sort.By(SortBy.Descending(nameof(WidgetEntity.CreatedAt))), widget => widget.Id);
```

## Things to know

- **Mistakes in the declarations throw late.** No default, two defaults, a field declared twice, or
  a `MappedTo` the entity doesn't have throws `InvalidOperationException` the first time the
  declarations are read: when the OpenAPI document is built, a `sort` is bound, or the first query
  is sorted. The service still starts, so write a test that lists or sorts each resource.
- **Mark only what callers need.** Each sortable field needs an index.
- **Never mark an `[Encrypted]` member.** Its value is Protected Data, encrypted on the client, and
  its ciphertext has no meaningful order.
- **An order that isn't a column.** `SortedBy` is a convenience. When a field is computed or lives
  on a joined row, read `sort.Fields` and order the query yourself; the binder has already refused
  anything the resource doesn't declare.
- **An operation without a `Sort` parameter ignores `sort`.** To refuse it with `422`, call
  `UnsupportedParameters.Refuse(request, "sort")` from
  [Paging](paging.md#refuse-paging-parameters-an-operation-doesnt-take).

## See also

- [Paging](paging.md): sorting is what makes a page stable.
- [Filtering](filtering.md) and [Advanced queries](advanced-queries.md): a search takes `sort` too.
