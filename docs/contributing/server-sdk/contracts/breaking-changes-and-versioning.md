---
sidebar_position: 3
---

# Breaking changes and versioning

**Audience:** engineers writing a Bitwarden service, and its API, with the server SDK.

When a change would break existing callers, publish it as a new version beside the old one: a `v2`
route group with its own resource type, mapped next to `v1`. The package doesn't detect breaking
changes; committing the OpenAPI document makes each one visible in review.

## Publish a v2 beside v1

Here `v2` makes `Size` required on every widget. That would break `v1` callers, so `v2` gets its own
resource type and routes, and both read and write one stored shape:

```csharp
using Bitwarden.Server.Sdk.Data;
using Bitwarden.Server.Sdk.Errors;
using Bitwarden.Server.Sdk.Resources;
using static Bitwarden.Server.Sdk.Resources.StandardResponses;

/// <summary>
/// A widget, as version 2 describes it: every widget now has a size.
/// </summary>
[ResourceType("widget")]
public sealed record WidgetV2 : Resource
{
    public required string Name { get; init; }

    [Encrypted(MaxLength = 10_000)]
    public string? Notes { get; init; }

    /// <summary>
    /// The widget's size. Required from version 2, which is why version 2 exists.
    /// </summary>
    public required WidgetSize Size { get; init; }
}

public enum WidgetSize
{
    Small,
    Large,
}

[ApiTag("Widgets")]
public static class WidgetsV2Endpoints
{
    public static void Map(IEndpointRouteBuilder endpoints)
    {
        var widgets = endpoints.MapGroup("api/v2/widgets").WithStandards();
        widgets.MapPost("", CreateWidget);
        widgets.MapGet("{id}", GetWidget);
    }

    /// <summary>
    /// Create a widget
    /// </summary>
    [StandardCreate]
    public static async Task<ResourceDocument<WidgetV2>> CreateWidget(
        ResourceDocument<WidgetV2> request, IWidgetStore store, CancellationToken cancellationToken) =>
        CreateResponse(ToV2(await store.AddAsync(
            new WidgetRecord(request.Data.Name, request.Data.Notes, request.Data.Size), cancellationToken)));

    /// <summary>
    /// Get a widget
    /// </summary>
    [StandardReadOne]
    public static async Task<ResourceDocument<WidgetV2>> GetWidget(
        string id, IWidgetStore store, CancellationToken cancellationToken) =>
        ReadOneResponse(ToV2(await store.FindAsync(id, cancellationToken)
            ?? throw new NotFoundException("widget", id)));

    private static WidgetV2 ToV2(WidgetRecord record) =>
        new() { Id = record.Id, Name = record.Name, Notes = record.Notes, Size = record.Size };
}
```

The `v1` endpoints class stays as it was, and its create stores a default for the field it can't
send:

```csharp
/// <summary>
/// Create a widget
/// </summary>
[StandardCreate]
public static async Task<ResourceDocument<Widget>> CreateWidget(
    ResourceDocument<Widget> request, IWidgetStore store, CancellationToken cancellationToken) =>
    CreateResponse(ToV1(await store.AddAsync(
        new WidgetRecord(request.Data.Name, request.Data.Notes, WidgetSize.Small), cancellationToken)));
```

- **`[ResourceType("widget")]`** keeps the resource type `widget`. Without it the type would be
  `widget-v2`, from the record's name. The OpenAPI schemas are still named after the record
  (`WidgetV2`, `WidgetV2Document`), so they don't collide with `v1`'s.
- **`[ApiTag("Widgets")]`** puts both versions in one section of the document. The `v1` endpoints
  class carries the description.
- **Map both** in `MapEndpoints`: `WidgetsEndpoints.Map(endpoints)` and
  `WidgetsV2Endpoints.Map(endpoints)`. The document then lists `createWidget`, `getWidget`,
  `createWidgetV2` and `getWidgetV2`. If two identifiers would collide, the service refuses to
  start.
- **Version only what changed.** `api/v2/widgets/{id}` doesn't need any other `v2` path to exist.
- **Share one stored shape.** Mapping each version's resource to one record, as `WidgetRecord` is
  here, keeps a fix in one place. The package puts no rule on how versions share code.
- **Retire `v1` later.** Mark it deprecated with a sunset date, as [Deprecation](deprecation.md)
  shows, and remove its endpoints class when the date passes.

## Catch a breaking change

Write the OpenAPI document to a file you commit (see [OpenAPI](openapi.md#commit-the-document)),
then regenerate it in CI and fail on a difference, so every contract change is reviewed:

```bash
dotnet run --project src/WidgetService -- --emit-openapi "$PWD/openapi/widget-service.json"
git diff --exit-code openapi/widget-service.json
```

The package doesn't include a tool that compares two OpenAPI documents for breaking changes; one can
run on the same file.

## Things to know

The package publishes what your types say, so ordinary-looking edits to a resource can break
callers:

| Edit                                                                         | Why it breaks callers                                                                             |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Adding a non-nullable member to a resource                                   | It is required, in the document and when a request is validated.                                  |
| Making a nullable member non-nullable                                        | It becomes required.                                                                              |
| Changing a member's type                                                     | The schema changes, and a request with the old type is refused with `422`.                        |
| Adding `[StringLength]`, `[Range]` or a lower `[Encrypted(MaxLength = ...)]` | A request that passed before can be refused. A string with no bound of its own is limited to 255. |
| Removing a member, or marking it `[ReadOnly]`                                | A response loses a field, or a request's value is dropped.                                        |
| Adding paging to a list, or lowering `[DefaultValue]` on its `PageSize`      | The same request returns fewer results.                                                           |
| Renaming a handler                                                           | Its operation identifier, and every generated client's method, change.                            |

- **Adding an enumeration value** is accepted by the service at once. An enumeration is published as
  a string with its permitted values in upper snake case (`SMALL`, `LARGE`). A client generated from
  the previous document may fail when it reads the new `MEDIUM` in a response. Check that the
  field's callers tolerate unknown values before adding one.
- **Fix a bug in place.** A fix ships in the same version; it doesn't need a `v2`.
- **Changing callers instead.** When you can account for every caller of a service-to-service API
  and change them together, you can change it in place rather than publish a new version.

## See also

- [OpenAPI](openapi.md): operation identifiers and committing the document.
- [API paths](api-paths.md): the version in the path.
- [Deprecation](deprecation.md)
- [JSON](../payloads-and-responses/json.md): how enumerations travel.
- [Paging](../querying/paging.md): default page sizes.
