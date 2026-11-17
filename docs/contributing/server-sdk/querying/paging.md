---
sidebar_position: 2
---

# Paging

**Audience:** engineers writing a Bitwarden service, and its API, with the server SDK.

Return a collection a page at a time, by page number or by cursor. You take `PageNumber`, `PageSize`
or `PageAfter` parameters; the package checks them, takes the page from your query, counts only when
it must, and writes the paging `meta` and links.

## Page by number

Take `PageNumber pageNumber = default` and `PageSize pageSize = default`, combine them into a
`Page`, and return a `PagedResourceListDocument<T>`. `Page` takes the slice from an ordered query,
and `ToPagedAsync` works out the total. Here with Entity Framework Core:

```csharp
using System.ComponentModel;
using Bitwarden.Server.Sdk.Resources;
using Bitwarden.Server.Sdk.Resources.Querying;
using Microsoft.EntityFrameworkCore;
using static Bitwarden.Server.Sdk.Resources.StandardResponses;

/// <summary>
/// List widgets
/// </summary>
/// <param name="id">Only these widgets.</param>
/// <param name="sort">The order of the list.</param>
/// <param name="database">Where widgets are kept.</param>
/// <param name="pageNumber">Which page to return.</param>
/// <param name="pageSize">How many widgets a page holds.</param>
/// <param name="cancellationToken">Cancels the request.</param>
[StandardReadMany]
public static async Task<PagedResourceListDocument<Widget>> ListWidgets(
    Filter<List<Guid>>? id,
    Sort? sort,
    WidgetDatabase database,
    PageNumber pageNumber = default,
    [DefaultValue(25)] PageSize pageSize = default,
    CancellationToken cancellationToken = default)
{
    var page = new Page { Number = pageNumber, Size = pageSize };

    var widgets = database.Widgets.AsNoTracking();
    int? atMost = null;

    if (id is not null)
    {
        widgets = widgets.Where(widget => id.Value.Contains(widget.Id));

        // The primary key allows one row per identifier, so a page that reaches
        // this many rows holds the last one and needs no count.
        atMost = id.Value.Distinct().Count();
    }

    var rows = await widgets
        .SortedBy(sort ?? Sort.Default<Widget>(), widget => widget.Id)
        .Page(page)
        .ToListAsync(cancellationToken);

    // Counts the filtered query, without the page, and only when the rows can't
    // settle the total.
    var paged = await rows.ToPagedAsync(page, ToResource, widgets.CountAsync, cancellationToken, atMost);

    return ReadManyResponse(paged, page);
}
```

- The page number defaults to 1. A number below 1, or above 10737418 (the farthest page whose rows
  fit in an `int`), is refused with `422`.
- The page size defaults to 50, or to the `[DefaultValue]` you put on the `PageSize` parameter. The
  maximum is 200 (`Page.MaximumSize`) for every operation: a larger size is reduced to 200, and a
  size below 1 is refused with `422`. The OpenAPI document publishes the default, minimum and
  maximum.
- `ReadManyResponse(paged, page)` writes the page number, page size, page count and total count, and
  `first`, `prev`, `next` and `last` links. The links repeat every query parameter the caller sent
  (filters, sort, sparse fieldsets) with the page changed.
- An empty collection is one empty page.

**When the count runs.** A page with fewer rows than it holds is the last one, so the total is the
rows before it plus the rows on it, and no count runs. Most lists fit on their first page, so most
reads cost one query. A full page counts (more may follow), and so does an empty page past the
first. `atMost` passes a bound that a key in the schema guarantees; a page that reaches it needs no
count either. Only pass a bound the database enforces, never one the code merely keeps.

Always order before paging, and end the order with a unique field (the identifier), or rows that
share a sort value can repeat or vanish between pages. See [Sorting](sorting.md).

## Page in memory

A collection already in memory knows its size, so `ToPaged` takes the page and counts nothing:

```csharp
public static PagedResourceListDocument<Widget> ListWidgets(IReadOnlyList<Widget> all, Sort? sort, Page page)
{
    var sorted = all.AsQueryable()
        .SortedBy(sort ?? Sort.Default<Widget>(), widget => widget.Id)
        .ToList();

    return ReadManyResponse(sorted.ToPaged(page), page);
}
```

## Page by cursor

Cursor paging never counts and stays stable while rows are written, at the cost of page numbers and
totals. Use it for a large collection read in order, such as an event log. Take
`PageSize pageSize = default` and `PageAfter pageAfter = default`, combine them into a `CursorPage`,
and return a `CursorPagedResourceListDocument<T>`:

```csharp
[Sortable(nameof(CreatedAt), Default = true, Descending = true)]
public sealed record WidgetEvent : Resource
{
    /// <summary>
    /// The widget the event happened to.
    /// </summary>
    public required string WidgetId { get; init; }

    /// <summary>
    /// What happened.
    /// </summary>
    [Sortable]
    public required string Action { get; init; }
}

/// <summary>
/// List widget events
/// </summary>
[StandardReadMany]
public static async Task<CursorPagedResourceListDocument<WidgetEvent>> ListWidgetEvents(
    Sort? sort,
    WidgetDatabase database,
    PageSize pageSize = default,
    PageAfter pageAfter = default,
    CancellationToken cancellationToken = default)
{
    var page = new CursorPage { Size = pageSize, After = pageAfter };
    var order = sort ?? Sort.Default<WidgetEvent>();

    // Filters go before Page; Page orders the query and reads one row more than the
    // page holds, to learn whether another page follows.
    var rows = await database.WidgetEvents.AsNoTracking()
        .Page(page, order, row => row.Id)
        .ToListAsync(cancellationToken);

    return ReadManyResponse(rows.ToCursorPage(page, order, row => row.Id, ToResource), page);
}
```

- The package mints the cursor and reads it back; it is opaque to the caller. The response `meta`
  carries the page size, whether more rows follow, and the cursor for the next page. The last page
  has no cursor.
- The caller asks for the next page by sending the cursor as `page[after]`. Cursor-paged responses
  carry no links.
- A cursor that this operation didn't issue, or that was issued under another sort, is refused with
  `422`.
- Pass the same sort and tie-break to `Page` and `ToCursorPage`. The tie-break must be unique.
- No sort field or tie-break may be nullable on the entity. Databases disagree about where nulls
  sort, so `Page` throws `InvalidOperationException` rather than mint a cursor that means different
  things on different databases.
- A cursor records the sort, not the filters. A caller who changes filters part way through should
  start again without a cursor.

## Refuse paging parameters an operation doesn't take

The package ignores `page[after]` on a page-number operation, `page[number]` on a cursor operation,
and paging parameters on an operation that doesn't page. To refuse them with `422`, check the query
string yourself:

```csharp
public static class UnsupportedParameters
{
    /// <summary>
    /// Refuses any of these query parameters when the caller sent it.
    /// </summary>
    public static void Refuse(HttpRequest request, params string[] parameters)
    {
        foreach (var parameter in parameters)
        {
            if (request.Query.ContainsKey(parameter))
            {
                throw InvalidFilterException.Because(
                    parameter, $"'{parameter}' is not a parameter this operation accepts.");
            }
        }
    }
}
```

Take `HttpRequest request` as a handler parameter and call, for example,
`UnsupportedParameters.Refuse(request, "page[after]")` first on a page-number operation.

## Things to know

- **Pick one style per operation.** Page numbers suit a collection a caller browses and wants a
  total for; cursors suit a large or fast-moving one read in order. The return type decides:
  `PagedResourceListDocument<T>` or `CursorPagedResourceListDocument<T>`.
- **Not paging** is for a result with a small, fixed upper bound. Return
  `ReadManyResponse(resources)`, a `ResourceListDocument<T>` with no paging `meta`.
- **Sparse fieldsets don't apply to cursor pages.** `ReadManyResponse` for a cursor page takes no
  fieldset. See [Sparse fieldsets](sparse-fieldsets.md).
- **Changing the default page size** changes what existing callers get back.

## See also

- [Sorting](sorting.md): the order a page is taken in.
- [Filtering](filtering.md) and [Sparse fieldsets](sparse-fieldsets.md): parameters the page links
  carry.
- [Advanced queries](advanced-queries.md): a search pages the same way.
