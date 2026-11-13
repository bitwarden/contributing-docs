---
sidebar_position: 1
---

# Filtering

**Audience:** engineers writing a Bitwarden service, and its API, with the server SDK.

A read-many operation lets a caller narrow the collection with `filter[{name}]` query parameters.
You declare each filter as a `Filter<T>` handler parameter; the package binds and checks the value,
and you apply it to your query.

## Declare filters on a list

Add one `Filter<T>?` parameter per filter. Its C# name is the filter's name, and `T` is what it
accepts. This list, read with Entity Framework Core, filters by identifier, by name and by when each
widget was created:

```csharp
using Bitwarden.Server.Sdk.Resources;
using Bitwarden.Server.Sdk.Resources.Querying;
using Microsoft.EntityFrameworkCore;
using static Bitwarden.Server.Sdk.Resources.StandardResponses;

public static class WidgetsEndpoints
{
    public const string Collection = "api/v1/widgets";

    public static void Map(IEndpointRouteBuilder endpoints)
    {
        var widgets = endpoints.MapGroup(Collection).WithStandards();
        widgets.MapGet("", ListWidgets);
    }

    /// <summary>
    /// List widgets
    /// </summary>
    /// <param name="id">Only these widgets.</param>
    /// <param name="name">Only widgets with this name.</param>
    /// <param name="createdAt">Only widgets created within this range.</param>
    /// <param name="sort">The order of the list.</param>
    /// <param name="database">Where widgets are kept.</param>
    /// <param name="pageNumber">Which page to return.</param>
    /// <param name="pageSize">How many widgets a page holds.</param>
    /// <param name="cancellationToken">Cancels the request.</param>
    [StandardReadMany]
    public static async Task<PagedResourceListDocument<Widget>> ListWidgets(
        Filter<List<Guid>>? id,
        Filter<string>? name,
        Filter<Range<DateTimeOffset>>? createdAt,
        Sort? sort,
        WidgetDatabase database,
        PageNumber pageNumber = default,
        PageSize pageSize = default,
        CancellationToken cancellationToken = default)
    {
        var page = new Page { Number = pageNumber, Size = pageSize };
        var widgets = database.Widgets.AsNoTracking();

        // A list filter matches a row that has any of its values.
        if (id is not null)
        {
            widgets = widgets.Where(widget => id.Value.Contains(widget.Id));
        }

        if (name is not null)
        {
            widgets = widgets.Where(widget => widget.Name == name.Value);
        }

        // Leaves the query as it is when the caller sent no range.
        widgets = widgets.Within(widget => widget.CreatedAt, createdAt?.Value);

        var rows = await widgets
            .SortedBy(sort ?? Sort.Default<Widget>(), widget => widget.Id)
            .Page(page)
            .ToListAsync(cancellationToken);

        return ReadManyResponse(
            await rows.ToPagedAsync(page, ToResource, widgets.CountAsync, cancellationToken),
            page);
    }

    private static Widget ToResource(WidgetEntity entity) =>
        new() { Id = entity.Id.ToString(), Name = entity.Name, Notes = entity.Notes, CreatedAt = entity.CreatedAt };
}
```

- `Filter<string>? name` reads `filter[name]`. A nullable parameter is optional: it is `null` when
  the caller didn't send it. The OpenAPI document publishes it as `filter[name]`, with the `<param>`
  text as its description.
- A non-nullable parameter (`Filter<Guid> organizationId`) is required; a request without it is
  refused with `422`.
- Values convert with the type's converter in the invariant culture. Enumerations convert from their
  published upper snake case names.
- The page links in the response carry the caller's filters, so following one stays in the same
  query.

## Accept several values

Make `T` a collection (`List<T>`, `T[]`, `IReadOnlyList<T>` or another list interface).
`Filter<List<Guid>>? id` above accepts `filter[id]=a,b`, the parameter repeated, or both.

- The package hands you the values. Matching any of them is yours to write, usually with `Contains`,
  as the sample does.
- In a list, `\,` is a comma inside a value and `\\` a backslash. A value ending in a lone `\` is
  refused with `422`.
- A value that doesn't convert is dropped and the rest are kept. An identifier that can't exist
  would match nothing anyway.

A single-value filter is different: it takes its value whole, never split on commas. A value that
doesn't convert, or the parameter sent twice, is refused with `422`.

## Accept a range

`Filter<Range<T>>` reads a range such as `[2026-01-15T00:00:00Z,2026-02-01T00:00:00Z)`, for any
comparable value type `T` (dates, numbers). `[` and `]` include a bound, `(` and `)` exclude it, and
`*` leaves a side open.

- `Within(selector, range)` applies the range to a query, as an expression tree with the bounds as
  parameters, so it runs in the database. It leaves the query unchanged when the range is `null`.
- `Range<T>.Contains(value)` tests one value, and `Lower` and `Upper` give you the bounds.
- A range the package can't read exactly is refused with `422`: a malformed range, a bound that
  doesn't convert, a lower bound above the upper, or equal bounds with one excluded.
- To limit a range (for example "a year at most"), read `Lower` and `Upper` and throw
  `InvalidFilterException`, which refuses the request with `422` at the parameter.

## Filter in memory

The filter types don't need a database. `Range<T>.Contains` tests a value, and the rest of the query
works on any `IQueryable`, including `AsQueryable()` over a list:

```csharp
public static PagedResourceListDocument<Widget> ListWidgets(
    IReadOnlyList<Widget> all,
    Filter<List<Guid>>? id,
    Filter<Range<DateTimeOffset>>? createdAt,
    Page page)
{
    IEnumerable<Widget> widgets = all;

    if (id is not null)
    {
        var ids = id.Value.Select(each => each.ToString()).ToHashSet();
        widgets = widgets.Where(widget => ids.Contains(widget.Id!));
    }

    if (createdAt is not null)
    {
        widgets = widgets.Where(widget =>
            widget.CreatedAt is { } created && createdAt.Value.Contains(created));
    }

    var sorted = widgets.AsQueryable().SortedBy(Sort.Default<Widget>(), widget => widget.Id).ToList();

    return ReadManyResponse(sorted.ToPaged(page), page);
}
```

## Refuse a filter you don't offer

The package ignores a `filter[...]` parameter that no handler parameter declares. To refuse it with
`422` instead, check the query string yourself:

```csharp
public static class DeclaredFilters
{
    /// <summary>
    /// Refuses any <c>filter[...]</c> parameter the operation does not declare.
    /// </summary>
    public static void Require(HttpRequest request, params string[] declared)
    {
        foreach (var key in request.Query.Keys)
        {
            if (key.StartsWith("filter[", StringComparison.Ordinal)
                && !declared.Any(name => key == $"filter[{name}]"))
            {
                throw InvalidFilterException.Because(
                    key,
                    $"'{key}' is not a filter this collection supports. "
                    + $"The filters are {string.Join(", ", declared.Select(name => $"'filter[{name}]'"))}.");
            }
        }
    }
}
```

Take `HttpRequest request` as a handler parameter and call
`DeclaredFilters.Require(request, nameof(name))` first. A request with `filter[color]` is then
refused with `422` at that parameter. `InvalidFilterException.Because(parameter, detail)` works for
any query parameter, despite its name.

## Match with a wildcard

The package doesn't support wildcards: a `*` reaches a `Filter<string>` as a literal character. To
accept one, read the value yourself and document which filters take it. This prefix match treats
`\*` as a literal asterisk and `\\` as a backslash, and refuses a `*` anywhere but the end:

```csharp
public static IQueryable<WidgetEntity> Matching(IQueryable<WidgetEntity> widgets, string value)
{
    var text = new System.Text.StringBuilder();
    var prefix = false;

    for (var i = 0; i < value.Length; i++)
    {
        if (value[i] == '\\' && i + 1 < value.Length)
        {
            text.Append(value[++i]);
        }
        else if (value[i] == '*' && i == value.Length - 1)
        {
            prefix = true;
        }
        else if (value[i] is '*' or '\\')
        {
            throw new InvalidFilterException(
                "filter[name]", value, "takes a name, or the start of one followed by *");
        }
        else
        {
            text.Append(value[i]);
        }
    }

    var name = text.ToString();

    return prefix
        ? widgets.Where(widget => widget.Name.StartsWith(name))
        : widgets.Where(widget => widget.Name == name);
}
```

## Things to know

- **Declare only the filters callers need.** Each one needs an index and has to respect what the
  caller may see. Name each after the resource attribute it filters.
- **Never filter on an `[Encrypted]` member.** Its value is Protected Data, encrypted on the client,
  and its ciphertext means nothing to the server.
- **No dot-notation.** A filter's name is a C# parameter name, so `filter[address.city]` can't be
  declared. Flatten the name (`addressCity`) instead.
- **"Or" across filters, and long expressions,** need a search. `[Filterable]` marks fields for
  those expressions; it has nothing to do with `filter[...]` parameters. See
  [Advanced queries](advanced-queries.md).

## See also

- [Paging](paging.md), [Sorting](sorting.md) and [Sparse fieldsets](sparse-fieldsets.md): the other
  query parameters.
- [Advanced queries](advanced-queries.md): searches with filter expressions.
