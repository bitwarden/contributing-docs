---
sidebar_position: 2
---

# API paths

**Audience:** engineers writing a Bitwarden service, and its API, with the server SDK.

You choose each path with `MapGroup` and the `Map` calls; the standard attributes give each
operation a default route under it. Identify what a request is about in the path, and read who is
asking, and on behalf of which organization, from `IContext` and `Person`.

## Lay out a resource's paths

Name the group `api`, then a version, then the resource plural. One resource follows as `{id}`, and
sub-resources follow that:

```csharp
using Bitwarden.Server.Sdk.Authorization;
using Bitwarden.Server.Sdk.Errors;
using Bitwarden.Server.Sdk.Resources;
using static Bitwarden.Server.Sdk.Resources.StandardResponses;

[ApiTag(Description = "Widgets, which a person keeps.")]
public static class WidgetsEndpoints
{
    // Namespace, version, then the resource plural.
    public const string Collection = "api/v1/widgets";

    public static void Map(IEndpointRouteBuilder endpoints)
    {
        var widgets = endpoints.MapGroup(Collection).WithStandards();
        widgets.MapGet("", ListWidgets);           // GET api/v1/widgets
        widgets.MapGet("current", GetMyWidget);    // GET api/v1/widgets/current
        widgets.MapGet("{id}", GetWidget);         // GET api/v1/widgets/{id}
        widgets.MapGet("{id}/parts", ListParts);   // GET api/v1/widgets/{id}/parts
    }

    /// <summary>
    /// Get the current person's widget
    /// </summary>
    [Authorization(User = ContextRequirement.Required)]
    [StandardReadOne("current")]
    public static async Task<ResourceDocument<Widget>> GetMyWidget(
        Person person, IWidgetStore store, CancellationToken cancellationToken) =>
        ReadOneResponse(await store.FindForPersonAsync(person.Id, cancellationToken)
            ?? throw new NotFoundException("widget", "current"));

    /// <summary>
    /// Get a widget
    /// </summary>
    [StandardReadOne]
    public static async Task<ResourceDocument<Widget>> GetWidget(
        string id, IWidgetStore store, CancellationToken cancellationToken) =>
        ReadOneResponse(await store.FindAsync(id, cancellationToken)
            ?? throw new NotFoundException("widget", id));

    /// <summary>
    /// List a widget's parts
    /// </summary>
    [StandardReadMany("{id}/parts")]
    public static async Task<ResourceListDocument<WidgetPart>> ListParts(
        string id, IWidgetStore store, CancellationToken cancellationToken) =>
        ReadManyResponse(await store.ListPartsAsync(id, cancellationToken));
}
```

- `[StandardReadOne]`, `[StandardUpdate]` and `[StandardDelete]` default to `{id}`.
  `[StandardCreate]` and `[StandardReadMany]` default to the collection itself.
- For any other route, pass a template to the attribute, such as `[StandardReadMany("{id}/parts")]`,
  and map the same route. A standard endpoint mapped on a different route stops the service from
  starting.
- A route parameter binds to the handler parameter of the same name (`string id`).
- Segments the package generates are kebab case: an action's name (`actions/send-email`) and a bulk
  operation's suffix (`:bulk-delete`). Your own segments are up to you; use lowercase kebab case.
- The version in the route also sets the operation identifier's suffix: `getWidget` on `v1`,
  `getWidgetV2` on `v2`. See [OpenAPI](openapi.md#operation-identifiers).

## Use the caller's own resource

`current` stands for whatever belongs to the caller, so `GetMyWidget` takes the `Person` from the
request rather than asking the caller to repeat an identifier they already sent.

- A handler that takes `Person` must require a user with
  `[Authorization(User = ContextRequirement.Required)]`, or the service refuses to start.

## Keep the organization out of the path

The organization a request runs inside reaches the handler as `IContext`, from
`Bitwarden.Server.Sdk.Context`. Read it there rather than from a route parameter:

```csharp
using Bitwarden.Server.Sdk.Authorization;
using Bitwarden.Server.Sdk.Context;
using Bitwarden.Server.Sdk.Resources;
using Bitwarden.Server.Sdk.Resources.Querying;
using static Bitwarden.Server.Sdk.Resources.StandardResponses;

/// <summary>
/// List widgets
/// </summary>
/// <remarks>
/// With an organization in context, that organization's widgets. Without one, the widgets of
/// every organization the person belongs to, or of the ones `filter[organization]` names.
/// </remarks>
/// <param name="organization">Only widgets in these organizations.</param>
/// <param name="context">The request's scope.</param>
/// <param name="person">The person making the request.</param>
/// <param name="store">Where widgets are kept.</param>
/// <param name="cancellationToken">Cancels the request.</param>
[Authorization(Organization = ContextRequirement.Optional, User = ContextRequirement.Required)]
[StandardReadMany]
public static async Task<ResourceListDocument<Widget>> ListWidgets(
    Filter<List<Guid>>? organization,
    IContext context,
    Person person,
    IWidgetStore store,
    CancellationToken cancellationToken)
{
    // The scope comes from the context, never the path.
    if (context.OrganizationId is { } current)
    {
        return ReadManyResponse(await store.ListForOrganizationAsync(current, cancellationToken));
    }

    // A filter's values are the caller's to choose, so the store reads only organizations
    // the person belongs to. One they don't belong to is left out, never answered.
    return ReadManyResponse(await store.ListForMemberAsync(person.Id, organization?.Value, cancellationToken));
}
```

- Declare what the operation needs with `[Authorization]`: `Organization`, `User` and `Provider`,
  each `Required`, `Optional` or `Forbidden`. The service, the endpoints class and the handler can
  each set it.
- A product service takes the organization from the person's session. A domain service takes it from
  the `Bitwarden-Organization` header, believed only from another service's own token with a valid
  context token. Either way the handler sees the same `IContext`.
- With `Organization = ContextRequirement.Optional`, one operation serves both cases: called with an
  organization in context it returns that organization's widgets, and called with only a person it
  returns the widgets of every organization they belong to, or of the ones `filter[organization]`
  names.
- To act on several organizations at once, a caller can also make one call per organization, or use
  an [advanced query](../querying/advanced-queries.md) whose body carries the list.

## Check your paths at startup

The package doesn't check the namespace, version or casing of your routes. To have the service
refuse to start over a bad path, register an `IStandardEndpointCheck`. It runs over every endpoint
at startup and adds its problems to the package's own:

```csharp
using System.Text.RegularExpressions;
using Bitwarden.Server.Sdk.Resources.Endpoints;

/// <summary>
/// Refuses to start a service with a route outside <c>api/v{n}/...</c> in lowercase kebab case.
/// </summary>
public sealed partial class WidgetPathCheck : IStandardEndpointCheck
{
    public void Check(IReadOnlyList<Endpoint> endpoints, ICollection<string> problems)
    {
        foreach (var endpoint in endpoints.OfType<RouteEndpoint>())
        {
            var route = endpoint.RoutePattern.RawText?.Trim('/') ?? string.Empty;

            // The documentation and the bare address are the platform's, outside the API.
            if (route.Length == 0 || route.StartsWith("docs", StringComparison.Ordinal) || route == "api/openapi.json")
            {
                continue;
            }

            if (!ApiPath().IsMatch(route))
            {
                problems.Add($"'{route}' is not api/v{{n}}/{{resource}} in lowercase kebab case.");
            }
        }
    }

    // api, a version, then kebab-case segments, route parameters, or a ':' operation suffix.
    [GeneratedRegex(@"^api/v[1-9][0-9]*(/([a-z0-9]+(-[a-z0-9]+)*|\{[^}]+\}))+(:[a-z0-9]+(-[a-z0-9]+)*)?$")]
    private static partial Regex ApiPath();
}
```

- Register it in `ConfigureServices` with
  `services.AddSingleton<IStandardEndpointCheck, WidgetPathCheck>()`.
- A route such as `api/Widget_Stats` then stops the service, with your message listed beside any
  problems the package found.

## Things to know

- **A filter authorizes nothing.** `Filter<T>` parses `filter[organization]`, but the values are the
  caller's. Read only the organizations the caller may reach, as `ListForMemberAsync` does above.
- **Parent paths are optional.** Nothing requires `api/v1/widgets/{id}` to be callable because
  `api/v1/widgets/{id}/parts` is, or a `v2` path's parents to exist.
- **Paths aren't checked** unless you add a check like `WidgetPathCheck`.
- **What the caller may do** is declared with `[Authorization]`. See
  [Authentication and authorization](../running-a-service/authentication-and-authorization.md).

## See also

- [OpenAPI](openapi.md): operation identifiers and the version suffix.
- [Breaking changes and versioning](breaking-changes-and-versioning.md): adding a `v2`.
- [Verbs](../operations/verbs.md): the standard attributes' routes and the startup check.
- [Filtering](../querying/filtering.md)
- [Context](../running-a-service/context.md)
