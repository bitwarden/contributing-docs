---
sidebar_position: 3
---

# Reading resources

**Audience:** engineers writing a Bitwarden service, and its API, with the server SDK.

To read a collection, write a handler with `[StandardReadMany]` that returns
`ReadManyResponse(...)`. To read one resource, write a handler with `[StandardReadOne]` that returns
`ReadOneResponse(...)`. Paging, filters, sort and sparse fieldsets are handler parameters.

## Read a collection and a single resource

Map the collection read at `""` and the single read at `{id}`, both with `MapGet`:

```csharp
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
        widgets.MapGet("", ListWidgets);
        widgets.MapGet("{id}", GetWidget);
    }

    /// <summary>
    /// List widgets
    /// </summary>
    [StandardReadMany]
    public static async Task<PagedResourceListDocument<Widget>> ListWidgets(
        IWidgetStore store,
        Fields<Widget> fields = default,
        PageNumber pageNumber = default,
        PageSize pageSize = default,
        CancellationToken cancellationToken = default)
    {
        var page = new Page { Number = pageNumber, Size = pageSize };

        // Nothing found is an empty page, never a 404.
        var found = await store.ListAsync(page, cancellationToken);

        return ReadManyResponse(found, page, fields);
    }

    /// <summary>
    /// Get a widget
    /// </summary>
    [StandardReadOne]
    public static async Task<ResourceDocument<Widget>> GetWidget(
        string id, IWidgetStore store, Fields<Widget> fields = default, CancellationToken cancellationToken = default) =>
        ReadOneResponse(
            await store.FindAsync(id, cancellationToken) ?? throw new NotFoundException("widget", id),
            fields);
}
```

- **Query parameters bind to handler parameters.** `Fields<Widget>` binds a sparse fieldset, and
  `PageNumber` and `PageSize` bind the page asked for. A `filter[...]` that no parameter declares is
  ignored, not refused.
- **Both reads answer `200`.** A collection read that finds nothing answers `200` with an empty
  list, so don't throw for an empty page.
- **Throw `NotFoundException`** (from `Bitwarden.Server.Sdk.Errors`) for a resource that doesn't
  exist, and the caller gets `404` in the standard error document.
- **Reads demand the service's read scope** unless the operation declares a scope of its own.

## Build the response

- `ReadOneResponse(resource)` builds a single-resource document. `ReadOneResponse(resource, fields)`
  leaves out the attributes a sparse fieldset didn't ask for.
- `ReadManyResponse` has three forms: a whole list (`IReadOnlyList<T>`), an offset page (`Paged<T>`
  and the `Page` asked for), and a cursor page (`CursorPaged<T>` and the `CursorPage`). A paged
  response carries the counts and the paging links, built from the request so they keep the caller's
  filters and sort.
- Your store returns the `Paged<Widget>`: the page's widgets and the total. A store that queries
  with Entity Framework Core uses `Page(page)` and `ToPagedAsync`; one holding a list in memory uses
  `ToPaged(page)`. See [Paging](../querying/paging.md).
- Return an `[Encrypted]` member as it was stored. Never decrypt it.

## Things to know

- **The package authorizes the operation, not the rows.** Limit a collection to what the caller may
  see, and throw `NotFoundException` rather than refusing with `403` for a resource the caller may
  not know exists. See
  [Authentication and authorization](../running-a-service/authentication-and-authorization.md).
- **Offer only the queries callers need.** Each filter and sortable field has to be indexed and
  authorized. Declare them as parameters and attributes; see [Filtering](../querying/filtering.md),
  [Sorting](../querying/sorting.md) and [Sparse fieldsets](../querying/sparse-fieldsets.md).
- **Page anything that grows.** Return `ResourceListDocument<T>` only for a collection that is small
  by nature.
- **Soft-deleted resources** are yours to leave out. See
  [Soft deletes](deleting-resources.md#soft-deletes).

## See also

- [Paging](../querying/paging.md) and [Advanced queries](../querying/advanced-queries.md)
- [Standard responses](../payloads-and-responses/standard-responses.md)
