---
sidebar_position: 1
---

# Verbs

**Audience:** engineers writing a Bitwarden service, and its API, with the server SDK.

Each kind of operation has an attribute that fixes its HTTP verb, its route below the group and its
success status. You put one attribute on each handler and map the handler with the matching `Map...`
call.

## Pick the attribute for each handler

| Attribute            | Map with    | Route below the group   | Succeeds with                           |
| -------------------- | ----------- | ----------------------- | --------------------------------------- |
| `[StandardCreate]`   | `MapPost`   | the collection (`""`)   | `201`, with `Location`                  |
| `[StandardReadMany]` | `MapGet`    | the collection (`""`)   | `200`                                   |
| `[StandardReadOne]`  | `MapGet`    | `{id}`                  | `200`                                   |
| `[StandardUpdate]`   | `MapPut`    | `{id}`                  | `200`                                   |
| `[StandardDelete]`   | `MapDelete` | `{id}`                  | `204`                                   |
| `[StandardAction]`   | `MapPost`   | `{id}/actions/{action}` | `200`, or `204` when it returns nothing |

Searches use `[StandardSearch]` and bulk operations use the `[StandardBulk...]` attributes, all
mapped with `MapPost`. There is no attribute for `PATCH`; see [Partial updates](partial-updates.md).

## Map a resource's endpoints

Map the group with `WithStandards()`, then give each handler one `Map...` line and one attribute:

```csharp
using Bitwarden.Server.Sdk.Errors;
using Bitwarden.Server.Sdk.Resources;
using static Bitwarden.Server.Sdk.Resources.StandardResponses;

public static class WidgetsEndpoints
{
    public const string Collection = "api/v1/widgets";

    public static void Map(IEndpointRouteBuilder endpoints)
    {
        var widgets = endpoints.MapGroup(Collection).WithStandards();
        widgets.MapPost("", CreateWidget);
        widgets.MapGet("", ListWidgets);
        widgets.MapGet("{id}", GetWidget);
        widgets.MapPut("{id}", UpdateWidget);
        widgets.MapDelete("{id}", DeleteWidget);
        widgets.MapPost("{id}/actions/polish", Polish);
    }

    /// <summary>
    /// Create a widget
    /// </summary>
    [StandardCreate]
    public static async Task<ResourceDocument<Widget>> CreateWidget(
        ResourceDocument<Widget> request, IWidgetStore store, CancellationToken cancellationToken) =>
        CreateResponse(await store.AddAsync(request.Data, cancellationToken));

    /// <summary>
    /// List widgets
    /// </summary>
    [StandardReadMany]
    public static async Task<ResourceListDocument<Widget>> ListWidgets(
        IWidgetStore store, CancellationToken cancellationToken) =>
        ReadManyResponse(await store.ListAsync(cancellationToken));

    /// <summary>
    /// Get a widget
    /// </summary>
    [StandardReadOne]
    public static async Task<ResourceDocument<Widget>> GetWidget(
        string id, IWidgetStore store, CancellationToken cancellationToken) =>
        ReadOneResponse(await store.FindAsync(id, cancellationToken)
            ?? throw new NotFoundException("widget", id));

    /// <summary>
    /// Replace a widget
    /// </summary>
    [StandardUpdate]
    public static async Task<ResourceDocument<Widget>> UpdateWidget(
        string id, ResourceDocument<Widget> request, IWidgetStore store, CancellationToken cancellationToken) =>
        UpdateResponse(await store.ReplaceAsync(id, request.Data, cancellationToken));

    /// <summary>
    /// Delete a widget
    /// </summary>
    [StandardDelete]
    public static Task DeleteWidget(string id, IWidgetStore store, CancellationToken cancellationToken) =>
        store.DeleteAsync(id, cancellationToken);

    /// <summary>
    /// Polish a widget
    /// </summary>
    [StandardAction]
    public static Task Polish(string id, IWidgetStore store, CancellationToken cancellationToken) =>
        store.PolishAsync(id, cancellationToken);
}
```

- `WithStandards()` reads the attributes, checks each `Map...` line and applies the success status.
  A group mapped without it gets none of this.
- A verb the resource doesn't map, such as `PATCH` here, is refused with `405` in the standard error
  document.
- Reads (`[StandardReadOne]`, `[StandardReadMany]`, `[StandardSearch]`) demand the service's read
  scope unless they declare their own; every other operation demands the write scope. See
  [Authentication and authorization](../running-a-service/authentication-and-authorization.md).
- A request with any verb but `GET`, `HEAD`, `OPTIONS` or `TRACE` runs to the end even when its
  client disconnects, so a write is not left half done.

## Keep the Map line and the attribute in step

The service refuses to start when a handler is mapped with a verb or route other than its
attribute's. It lists every problem at once, naming the class and method. Map `GetWidget` with
`MapPost` instead of `MapGet` and the service stops with:

```text
System.InvalidOperationException: The service's endpoints do not meet the standards:
  - 'WidgetsEndpoints.GetWidget' is [StandardReadOne], which is GET, but is mapped with POST.
```

To use a route other than the default, pass it to the attribute, such as
`[StandardReadOne("by-email/{email}")]`, and map the handler at that same route.

## Things to know

- **The package can't tell whether a `GET` handler changes state.** Keep `GET` handlers free of side
  effects. An operation that changes something without being a create, update or delete is an
  [action](acting-upon-resources.md).
- **Collection routes are not compared.** `[StandardCreate]` and `[StandardReadMany]` match any
  route their `Map...` line gives, so only the verb is checked. Map them at `""`.
- **Create-or-update goes through `PUT`.** See
  [Updating resources](updating-resources.md#create-or-update).

## See also

- [Creating resources](creating-resources.md), [Reading resources](reading-resources.md),
  [Updating resources](updating-resources.md), [Deleting resources](deleting-resources.md) and
  [Acting upon resources](acting-upon-resources.md)
- [Advanced queries](../querying/advanced-queries.md) and
  [Bulk operations](../bulk-and-asynchronous-work/bulk-operations/index.md), the other uses of
  `POST`
- [API paths](../contracts/api-paths.md)
