---
sidebar_position: 5
---

# Advanced queries

**Audience:** engineers writing a Bitwarden service, and its API, with the server SDK.

When `filter[...]` parameters can't say enough ("or", or an expression too long for a URL), offer a
search: a `POST` to `{collection}:search` whose body holds a filter expression in JSON Logic. You
mark the fields an expression may name with `[Filterable]`, add a `[StandardSearch]` operation that
takes a `Search<T>` body, and apply the expression with `Matching`.

## Mark the filterable fields

Mark each property an expression may name `[Filterable]`. Mark an inherited field with
`[Filterable(nameof(CreatedAt))]` on the record, and use `MappedTo` when the entity stores a field
under another name:

```csharp
using System.ComponentModel.DataAnnotations;
using Bitwarden.Server.Sdk.Data;
using Bitwarden.Server.Sdk.Resources;
using Bitwarden.Server.Sdk.Resources.Querying;

[Sortable(nameof(CreatedAt), Default = true, Descending = true)]
[Filterable(nameof(CreatedAt))]
public sealed record Widget : Resource
{
    /// <summary>
    /// What the widget is called.
    /// </summary>
    [Sortable]
    [Filterable]
    [StringLength(100)]
    public required string Name { get; init; }

    /// <summary>
    /// How many gadgets the widget holds.
    /// </summary>
    [Filterable(MappedTo = nameof(WidgetEntity.Capacity))]
    public int Size { get; init; }

    /// <summary>
    /// The person's notes, encrypted on their device. Never filterable.
    /// </summary>
    [Encrypted(MaxLength = 10_000)]
    public string? Notes { get; init; }
}
```

A resource with no `[Filterable]` field can't be searched.

## Add a search

Give the search the same read as the list, so the two answer alike. Map it on the route builder, not
the group, because its path is the collection's plus a suffix:

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

        // On the route builder, not the group: the path is the collection's plus a suffix.
        endpoints.MapPost($"{Collection}:search", SearchWidgets).WithStandards();
    }

    /// <summary>
    /// List widgets
    /// </summary>
    [StandardReadMany]
    public static async Task<PagedResourceListDocument<Widget>> ListWidgets(
        Sort? sort,
        WidgetDatabase database,
        PageNumber pageNumber = default,
        PageSize pageSize = default,
        CancellationToken cancellationToken = default) =>
        await Read(database.Widgets.AsNoTracking(), sort, pageNumber, pageSize, cancellationToken);

    /// <summary>
    /// Search widgets
    /// </summary>
    [StandardSearch(Collection)]
    public static async Task<PagedResourceListDocument<Widget>> SearchWidgets(
        Search<Widget> request,
        Sort? sort,
        WidgetDatabase database,
        PageNumber pageNumber = default,
        PageSize pageSize = default,
        CancellationToken cancellationToken = default) =>
        // The expression has been checked against the [Filterable] fields already.
        await Read(database.Widgets.AsNoTracking().Matching(request.Filter), sort, pageNumber, pageSize, cancellationToken);

    // One read for both, so a search answers exactly as the list does.
    private static async Task<PagedResourceListDocument<Widget>> Read(
        IQueryable<WidgetEntity> widgets,
        Sort? sort,
        PageNumber pageNumber,
        PageSize pageSize,
        CancellationToken cancellationToken)
    {
        var page = new Page { Number = pageNumber, Size = pageSize };

        var rows = await widgets
            .SortedBy(sort ?? Sort.Default<Widget>(), widget => widget.Id)
            .Page(page)
            .ToListAsync(cancellationToken);

        return ReadManyResponse(
            await rows.ToPagedAsync(page, ToResource, widgets.CountAsync, cancellationToken),
            page);
    }

    private static Widget ToResource(WidgetEntity entity) =>
        new()
        {
            Id = entity.Id.ToString(),
            Name = entity.Name,
            Size = entity.Capacity,
            Notes = entity.Notes,
            CreatedAt = entity.CreatedAt,
        };
}
```

- `[StandardSearch(Collection)]` makes the operation a `POST` to `{collection}:search`. The service
  refuses to start when the `Map` line's verb or route disagrees with it.
- `Search<Widget>` is the body. Its required `Filter` is a `Query`, read from a top-level `filter`
  field; a body without one is refused with `422`.
- The expression is checked before your handler runs. Every problem is refused with `422`, pointing
  at `/filter`.
- `sort`, `page[...]` and `fields[...]` bind on a search as on a list, and a successful search
  answers `200`.
- `Matching` compiles the expression to an expression tree, so on Entity Framework Core it runs in
  the database.
- Page links carry the query string only. The expression is in the body, so a caller follows a link
  with a `POST` of the same body.

## What an expression may contain

The package accepts these JSON Logic operators: `var`, `==`, `!=`, `>`, `>=`, `<`, `<=`, `in`,
`and`, `or` and `!`. Any other operator is refused, naming the permitted ones.

- **Fields:** only fields the resource marks `[Filterable]`. Anything else is refused, listing the
  filterable fields.
- **Comparisons** are between one field and one literal, in either order. Two fields, or two
  literals, are refused.
- **`in`** is membership when the literal is an array, and a substring match when it is a string and
  the field is text.
- **`>`, `>=`, `<`, `<=`** need a field with an order: numbers and dates. Text, booleans and
  enumerations compare only with `==`, `!=` and `in`.
- **`and` and `or`** take two or more conditions, and `!` exactly one. A literal or a bare field
  where a condition belongs is refused.
- **Literals** convert to the field's type: dates from ISO 8601 strings, enumerations from their
  published names. `null` is allowed only against a field that can be null.
- **Size:** an expression holds at most 500 terms (`Query.MaxTerms`), counting every operator, field
  and literal.

The same expressions select resources for bulk updates, deletes and actions.

## Search in memory

`Matching` works on any `IQueryable`, so the same expression runs over rows in memory. It resolves
fields through `MappedTo`, so match the stored rows, then map them:

```csharp
public static PagedResourceListDocument<Widget> Search(
    IReadOnlyList<WidgetEntity> rows, Search<Widget> request, Page page)
{
    // The same expression, compiled and run over the rows in memory.
    var found = rows.AsQueryable()
        .Matching(request.Filter)
        .SortedBy(Sort.Default<Widget>(), row => row.Id)
        .Select(row => new Widget { Id = row.Id.ToString(), Name = row.Name, Size = row.Capacity })
        .ToList();

    return ReadManyResponse(found.ToPaged(page), page);
}
```

## Build an expression in code

A `Query` built from `QueryTerm`s, rather than read from a request, names the entity's own
properties:

```csharp
using System.Text.Json;
using Bitwarden.Server.Sdk.Resources.Querying;

public static IQueryable<WidgetEntity> Large(WidgetDatabase database)
{
    // Built in code, an expression names the entity's own properties.
    var large = new Query
    {
        Root = new QueryTerm
        {
            Operator = QueryOperator.GreaterThanOrEqual,
            Terms =
            [
                new QueryTerm { Operator = QueryOperator.Var, Field = nameof(WidgetEntity.Capacity) },
                new QueryTerm { Value = JsonSerializer.SerializeToElement(10) },
            ],
        },
    };

    return database.Widgets.Matching(large);
}
```

## Things to know

- **A caller's expression is matched only after it has been checked.** `Query.Parse` reads one from
  JSON, but `Matching` throws `InvalidOperationException` for it unless it arrived as a `Search<T>`
  or bulk body on its own kind of operation. The service refuses to start when a handler takes a
  `Search<T>`, or a bulk body with a filter, on any other kind of operation.
- **Every filterable field needs an entity property.** The first expression matched against an
  entity resolves every filterable field, by name or `MappedTo`, and throws
  `InvalidOperationException` naming any without a property. A test that searches each resource
  catches it.
- **Mark only fields that are indexed and that callers may see.**
- **Never mark an `[Encrypted]` member.** Its value is Protected Data, encrypted on the client, and
  its ciphertext means nothing to the server.
- **The package bounds an expression's size, not its cost.** A rule such as "a substring match needs
  another condition" is yours: throw `InvalidRequestException` with the pointer `/filter` to refuse
  it with `422`.
- **Fields that aren't columns.** `Matching` is a convenience. For a field that is computed or lives
  on a joined row, walk `request.Filter.Root` and build the predicate yourself; the package has
  already refused anything the resource doesn't declare.

## See also

- [Filtering](filtering.md): simple `filter[...]` parameters.
- [Sorting](sorting.md), [Paging](paging.md) and [Sparse fieldsets](sparse-fieldsets.md): the query
  parameters a search shares with the list.
