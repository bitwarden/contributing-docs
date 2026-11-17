---
sidebar_position: 1
---

# OpenAPI

**Audience:** engineers writing a Bitwarden service, and its API, with the server SDK.

`Service` builds your service's OpenAPI document from your handlers, their XML documentation and
your resource types, and this package describes the resources and standard operations in it. You
write `<summary>` and `<remarks>` on handlers, `[ApiTag]` on endpoints classes, and attributes such
as `[ReadOnly]` on resources; the package does the rest.

## Turn on the document

The XML documentation reaches the document only when the project produces a documentation file, lets
the OpenAPI source generator intercept, and the service calls `AddOpenApi()` itself. In the project
file:

```xml
<PropertyGroup>
  <GenerateDocumentationFile>true</GenerateDocumentationFile>
  <EnableRequestDelegateGenerator>true</EnableRequestDelegateGenerator>
  <InterceptorsNamespaces>$(InterceptorsNamespaces);Microsoft.AspNetCore.Http.Generated;Microsoft.AspNetCore.OpenApi.Generated</InterceptorsNamespaces>
</PropertyGroup>
```

And in the service, where the same call adds any transformers of your own:

```csharp
using Bitwarden.Server.Sdk.Service;

internal sealed class WidgetService(string[] args) : Service("widget-service", "Widget Service", args)
{
    protected override void ConfigureServices(IServiceCollection services)
    {
        // Reads the handlers' XML documentation into the document, and adds the service's own
        // document transformers after the package's.
        services.AddOpenApi(options => options.AddDocumentTransformer<WidgetExamples>());
        services.AddSingleton<IWidgetStore, WidgetStore>();
    }

    protected override void MapEndpoints(IEndpointRouteBuilder endpoints) =>
        WidgetsEndpoints.Map(endpoints);
}
```

- The document is served at `/api/openapi.json` and a documentation UI at `/docs`, both without
  authentication. `GET /` redirects to `/docs/index.html`.
- Without the `AddOpenApi()` call the document is still served, but has no summaries or
  descriptions.

## Describe a resource

Document each member with `<summary>`. Mark members the service sets with `[ReadOnly]`:

```csharp
using System.ComponentModel.DataAnnotations;
using Bitwarden.Server.Sdk.Data;
using Bitwarden.Server.Sdk.Resources;
using Bitwarden.Server.Sdk.Resources.Querying;

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
    /// How many times the widget has been polished. Set by the service.
    /// </summary>
    [ReadOnly]
    public int PolishCount { get; init; }
}
```

- Nullability decides what is required. `Name` and `PolishCount` are non-nullable, so they are
  required; `Notes` is nullable, so it is optional and marked nullable.
- `[ReadOnly]` members, and the inherited `createdAt`, `createdBy`, `updatedAt`, `updatedBy`,
  `deletedAt` and `deletedBy`, are marked read-only. `version` is not.
- A read-only member sent in a request, or a member the resource doesn't have, is dropped before
  your handler sees the resource.
- A `Sort` parameter's description lists the `[Sortable]` fields and the default order. Each
  `Filter<T>` parameter appears as `filter[name]`, and `Fields<T>` lists the attributes it accepts.

## Describe the operations

Name the section with `[ApiTag(Description = ...)]` on the endpoints class, and give each handler a
`<summary>` and, where useful, `<remarks>`:

```csharp
using Bitwarden.Server.Sdk.Errors;
using Bitwarden.Server.Sdk.Resources;
using Bitwarden.Server.Sdk.Resources.Querying;
using static Bitwarden.Server.Sdk.Resources.StandardResponses;

[ApiTag(Description = "Widgets, which a person keeps. Each has a name and encrypted notes.")]
public static class WidgetsEndpoints
{
    public const string Collection = "api/v1/widgets";

    public static void Map(IEndpointRouteBuilder endpoints)
    {
        var widgets = endpoints.MapGroup(Collection).WithStandards();
        widgets.MapPost("", CreateWidget);
        widgets.MapGet("", ListWidgets);
        widgets.MapGet("{id}", GetWidget);

        // Not a standard operation, so it needs an operation identifier of its own.
        widgets.MapGet("{id}/summary", GetWidgetSummary).WithName("getWidgetSummary");
    }

    /// <summary>
    /// Create a widget
    /// </summary>
    /// <remarks>
    /// The widget's notes are encrypted on the person's device before they are sent.
    /// </remarks>
    [StandardCreate]
    public static async Task<ResourceDocument<Widget>> CreateWidget(
        ResourceDocument<Widget> request, IWidgetStore store, CancellationToken cancellationToken) =>
        CreateResponse(await store.AddAsync(request.Data, cancellationToken));

    /// <summary>
    /// List widgets
    /// </summary>
    [StandardReadMany]
    public static async Task<ResourceListDocument<Widget>> ListWidgets(
        Sort? sort, IWidgetStore store, CancellationToken cancellationToken) =>
        ReadManyResponse(await store.ListAsync(sort ?? Sort.Default<Widget>(), cancellationToken));

    /// <summary>
    /// Get a widget
    /// </summary>
    [StandardReadOne]
    public static async Task<ResourceDocument<Widget>> GetWidget(
        string id, IWidgetStore store, CancellationToken cancellationToken) =>
        ReadOneResponse(await store.FindAsync(id, cancellationToken)
            ?? throw new NotFoundException("widget", id));

    /// <summary>
    /// Summarize a widget
    /// </summary>
    public static async Task<WidgetSummary> GetWidgetSummary(
        string id, IWidgetStore store, CancellationToken cancellationToken) =>
        new((await store.FindAsync(id, cancellationToken) ?? throw new NotFoundException("widget", id)).Name);
}
```

- `<summary>` becomes the operation's summary and `<remarks>` its description. Write both for the
  caller, free of implementation detail.
- These operations appear as `createWidget`, `listWidgets`, `getWidget` and `getWidgetSummary` under
  a "Widgets" section.
- Every operation is documented with one `default` response carrying the error document. Paths and
  sections are sorted alphabetically, so a committed document diffs cleanly.

## Operation identifiers

An operation with a standard attribute (`[StandardCreate]`, `[StandardReadOne]` and the rest) is
named for you: the handler's name in camel case, plus the route's version when it is not `v1`.

| Handler                          | Route            | Operation identifier     |
| -------------------------------- | ---------------- | ------------------------ |
| `GetWidget`                      | `api/v1/widgets` | `getWidget`              |
| `GetWidget`                      | `api/v2/widgets` | `getWidgetV2`            |
| `CreateWidget`                   | `api/v1/widgets` | `createWidget`           |
| `GetWidgetSummary`, no attribute | `api/v1/widgets` | none, unless you name it |

- An explicit `.WithName(...)` or `[EndpointName]` wins over the derived name.
- Give every endpoint without a standard attribute a name with `.WithName(...)` or `[EndpointName]`.
  The service starts without one, so check the document.
- Renaming a handler, or moving it to a `v2` route, renames its operation and every generated
  client's method. Treat a handler's name as part of the contract.

## Add examples

The package writes no examples. To add one, register a document transformer in your `AddOpenApi`
call. It runs after the package's transformers, so it sees each schema in its published shape:

```csharp
using System.Text.Json.Nodes;
using Microsoft.AspNetCore.OpenApi;
using Microsoft.OpenApi;

public sealed class WidgetExamples : IOpenApiDocumentTransformer
{
    public Task TransformAsync(OpenApiDocument document, OpenApiDocumentTransformerContext context, CancellationToken cancellationToken)
    {
        if (document.Components?.Schemas is { } schemas
            && schemas.TryGetValue("WidgetDocument", out var found)
            && found is OpenApiSchema schema)
        {
            // Notes are encrypted on the person's device, so the example is ciphertext too.
            schema.Examples = [JsonNode.Parse("""
                {
                  "data": {
                    "id": "2f0c4a8e-5b1d-4c6e-9a7f-3d2b1e0f9c8a",
                    "type": "widget",
                    "attributes": {
                      "name": "Desk lamp",
                      "notes": "2.c2FtcGxlIGl2|c2FtcGxlIGNpcGhlcnRleHQ=|c2FtcGxlIG1hYw==",
                      "polishCount": 3,
                      "createdAt": "2026-10-01T09:30:00Z"
                    }
                  }
                }
                """)!];
        }

        return Task.CompletedTask;
    }
}
```

- A resource's schema is named after its record (`Widget`), and the document wrapping it
  `WidgetDocument`.
- Never put real Vault Data in an example. An encrypted member's example is made-up ciphertext.

## Commit the document

Run the service with `--emit-openapi <path>` to write the document and exit without serving:

```bash
dotnet run --project src/WidgetService -- --emit-openapi "$PWD/openapi/widget-service.json"
```

- Your hosted services don't run and options validated on start aren't checked, so no database,
  queue or identity server needs to be reachable.
- `dotnet run --project` runs from the project's directory, so pass an absolute path. The log names
  the full path written.
- Writing fails when a section has no description. Give every endpoints class an
  `[ApiTag(Description = ...)]`. The served document doesn't need one.

To catch contract changes in review, regenerate the document in CI and fail on a difference. See
[Breaking changes and versioning](breaking-changes-and-versioning.md#catch-a-breaking-change).

## Things to know

- **The service refuses to start** when two endpoints would get the same operation identifier, when
  a standard endpoint is hidden with `ExcludeFromDescription()`, or when a standard endpoint is
  mapped with a verb or route other than its attribute's. Every problem is listed at once. Two
  handlers called `GetWidget` on `v1` routes in two endpoints classes collide; rename one or name it
  with `.WithName(...)`.
- **One document per service.** It holds every version of every operation the service serves.
- **The schema shows what callers send and receive, not your record.** A resource's members appear
  under `attributes`.
- **Examples are yours,** as are summaries, remarks, `<param>` text and section descriptions.

## See also

- [API paths](api-paths.md)
- [Breaking changes and versioning](breaking-changes-and-versioning.md)
- [Deprecation](deprecation.md): marking an operation deprecated in the document.
- [Verbs](../operations/verbs.md): the standard attributes and how routes are checked.
- [Standard fields](../payloads-and-responses/standard-fields.md)
