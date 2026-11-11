---
sidebar_position: 2
---

# Authentication and authorization

**Audience:** engineers writing a Bitwarden service, and its API, with the server SDK.

Every operation a service maps is authenticated and authorized unless it says otherwise. You declare
what operations demand with `AuthorizationDefaults` on the service and `[Authorization]` on a
handler or its class. These types, and the checks behind them, are in
[Bitwarden.Server.Sdk.Authorization](https://github.com/bitwarden/dotnet-extensions/blob/main/extensions/Bitwarden.Server.Sdk.Authorization/src/PACKAGE.md),
which `Service` registers for you.

## Set the service's defaults

Declare what most operations demand once, on the service:

```csharp
using Bitwarden.Server.Sdk.Authorization;
using Bitwarden.Server.Sdk.Service;
using Microsoft.AspNetCore.Authentication.JwtBearer;

internal sealed class WidgetService(string[] args) : Service("widget-service", "Widget Service", args)
{
    // Every operation demands one of these scopes by its kind, and accepts a request naming
    // no organization.
    protected override AuthorizationDefaults Authorization => new()
    {
        Organization = ContextRequirement.Optional,
        ReadScope = "widgets.read",
        WriteScope = "widgets.write",
    };

    protected override void ConfigureServices(IServiceCollection services)
    {
        services.AddSingleton<IWidgetStore, WidgetStore>();

        // The service also accepts tokens addressed to "widget-legacy" at one surface it hosts.
        // The platform keeps "widget-service" beside it.
        services.Configure<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme, options =>
            options.TokenValidationParameters.ValidAudiences = ["widget-legacy"]);
    }

    protected override void MapEndpoints(IEndpointRouteBuilder endpoints) =>
        WidgetsEndpoints.Map(endpoints);
}
```

- **Closed by default.** Every endpoint is held to these defaults, so a new endpoint is closed until
  you open it. A request without a valid token is refused with `401`; an authenticated caller who
  doesn't meet the requirements, with `403`.
- **Scopes by kind of operation.** With `ReadScope` and `WriteScope` set, every read demands the
  first, and everything else (creates, updates, deletes, actions and their bulk forms) the second.
  Set both: without them, an operation that declares no scope demands none.
- **Context requirements.** `Organization`, `User` and `Provider` are each `Required`, `Optional` or
  `Forbidden`. Unless you set them, an organization is required, a user optional and a provider
  forbidden. A missing or unwanted context is refused with `403`, naming what is wrong.
- **Tokens.** Bitwarden.Server.Sdk.Authentication validates bearer tokens from
  `Authentication:Schemes:Bearer:*`, as `at+jwt` access tokens.
- **Audiences are always checked.** A token is accepted only when its `aud` names the service
  (`IServiceIdentity.Audience`, the identifier passed to `Service`). This is not a setting. A token
  naming several audiences is accepted when one is this service's.
- **Extra audiences** you add, as above, are accepted at every endpoint. Keeping one to the surface
  that needs it is up to you.

## Declare what an operation needs

Say on an operation only where it differs from the defaults. The most specific declaration wins: a
handler's `[Authorization]`, then its class's, then the service's defaults. `Person` is the acting
user as a parameter, and `IContext` (Bitwarden.Server.Sdk.Context) says whom the request concerns:

```csharp
using Bitwarden.Server.Sdk.Authorization;
using Bitwarden.Server.Sdk.Context;
using Bitwarden.Server.Sdk.Errors;
using Bitwarden.Server.Sdk.Resources;
using static Bitwarden.Server.Sdk.Resources.StandardResponses;

[ApiTag(Description = "Widgets, which a person keeps.")]
public static class WidgetsEndpoints
{
    public static void Map(IEndpointRouteBuilder endpoints)
    {
        var widgets = endpoints.MapGroup("api/v1/widgets").WithStandards();
        widgets.MapGet("current", GetMyWidget);
        widgets.MapGet("{id}", GetWidget);
        widgets.MapDelete("{id}", DeleteSharedWidget);
    }

    /// <summary>
    /// Get the person's own widget
    /// </summary>
    [Authorization(User = ContextRequirement.Required)]
    [StandardReadOne("current")]
    public static async Task<ResourceDocument<Widget>> GetMyWidget(
        Person person, IWidgetStore store, CancellationToken cancellationToken) =>
        ReadOneResponse(await store.FindForAsync(person.Id, cancellationToken)
            ?? throw new NotFoundException("widget", "current"));

    /// <summary>
    /// Get a widget
    /// </summary>
    [StandardReadOne]
    public static async Task<ResourceDocument<Widget>> GetWidget(
        string id, IContext context, IWidgetStore store, CancellationToken cancellationToken) =>
        // IContext says whom the request concerns: here, the organization it names, if any.
        ReadOneResponse(await store.FindAsync(id, context.OrganizationId, cancellationToken)
            ?? throw new NotFoundException("widget", id));

    /// <summary>
    /// Delete a shared widget
    /// </summary>
    [Authorization(Scope = "widgets.admin", Organization = ContextRequirement.Required)]
    [StandardDelete]
    public static Task DeleteSharedWidget(string id, IWidgetStore store, CancellationToken cancellationToken) =>
        store.DeleteAsync(id, cancellationToken);
}
```

- A caller without a token gets `401`. A caller without `widgets.admin` gets `403` from
  `DeleteSharedWidget`, naming the scope.
- The service doesn't start when a declaration contradicts the operation's authorization, for
  example a handler taking `Person` that doesn't require a user.
- Authorization decides whether a caller may invoke an operation, not which rows it reaches. Filter
  your queries by `IContext`, as `GetWidget` does, or replace `IRowOwnership`
  (Bitwarden.Server.Sdk.Data.Abstractions).

## Require roles and permissions (product services)

Roles and permissions come from a person's session, read through `ICallerRole`, so they apply in a
product service. Set `OrganizationRole`, `Permission` or `ProviderRole` on `[Authorization]`.

- A role is satisfied by it or any role above it (`User`, `Custom`, `Admin`, `Owner`).
- An owner or administrator holds every permission.
- A role counts only in the organization the session names.

For a check `[Authorization]` can't express, write an attribute implementing `IAuthorizesOperation`
(Bitwarden.Server.Sdk.Resources). It runs after authorization and before anything is bound or
validated, on a handler or its class. Refuse by throwing `ForbiddenException`:

```csharp
using Bitwarden.Server.Sdk.Authorization;
using Bitwarden.Server.Sdk.Errors;
using Bitwarden.Server.Sdk.Resources;
using Bitwarden.Server.Sdk.Service;

[ProductService]
internal sealed class WidgetPortal(string[] args) : Service("widget-portal", "Widget Portal", args)
{
    protected override void ConfigureServices(IServiceCollection services) =>
        services.AddSingleton<IWidgetStore, WidgetStore>();

    protected override void MapEndpoints(IEndpointRouteBuilder endpoints) =>
        SharedWidgetsEndpoints.Map(endpoints);
}

[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public sealed class RequiresWidgetManagerAttribute : Attribute, IAuthorizesOperation
{
    public ValueTask AuthorizeAsync(HttpContext context)
    {
        var caller = context.RequestServices.GetRequiredService<ICallerRole>();

        return caller.Role >= OrganizationRole.Admin || caller.Holds(OrganizationPermission.EditAnyCollection)
            ? ValueTask.CompletedTask
            : throw new ForbiddenException("Only a widget manager may do this.");
    }
}

[ApiTag(Description = "Shared widgets, which an organization keeps.")]
[Authorization(Organization = ContextRequirement.Required, Scope = "widgets.write")]
public static class SharedWidgetsEndpoints
{
    public static void Map(IEndpointRouteBuilder endpoints)
    {
        var shared = endpoints.MapGroup("api/v1/shared-widgets").WithStandards();
        shared.MapPost("{id}/actions/archive", Archive);
        shared.MapDelete("{id}", DeleteSharedWidget);
    }

    /// <summary>
    /// Archive a shared widget
    /// </summary>
    [RequiresWidgetManager]
    [StandardAction]
    public static Task Archive(string id, IWidgetStore store, CancellationToken cancellationToken) =>
        store.DeleteAsync(id, cancellationToken);

    /// <summary>
    /// Delete a shared widget
    /// </summary>
    [Authorization(OrganizationRole = OrganizationRole.Admin)]
    [StandardDelete]
    public static Task DeleteSharedWidget(string id, IWidgetStore store, CancellationToken cancellationToken) =>
        store.DeleteAsync(id, cancellationToken);
}
```

## Validate a token from another issuer

`DiscoveredIssuerTokens` verifies an access token another OpenID Connect issuer signed. It checks
that a key the issuer's discovery document publishes signed it, the issuer the document names, the
lifetime with five minutes' skew, and the type `at+jwt`:

```csharp
using Bitwarden.Server.Sdk.Authorization;

// Keep one instance per issuer: it reads the discovery document and keys once.
var issuer = new DiscoveredIssuerTokens(
    new Uri("https://identity.example.com"), clients.CreateClient("issuer"));

var result = await issuer.ValidateAsync(token, cancellationToken);
var subject = result.IsValid ? result.ClaimsIdentity.FindFirst("sub")?.Value : null;
```

It doesn't check the audience. If the issuer sets one, compare `aud` in `result.ClaimsIdentity` with
the value you expect before you trust the token.

## Other declarations

These go on one handler each. The service doesn't start when one contradicts the operation's
authorization.

- **`Anonymous = true`** on `[Authorization]` opens an operation to callers with no token. Nothing
  that touches a caller's data should set it.
- **`[AnyScope("a.read", "a.invitations")]`** admits a caller holding any one of several scopes. The
  operation then decides what each scope may ask, with `CallerScopes.Holds(principal, scope)`.
- **`[AcceptsOrganizationCredential(scope)]`** and **`[AcceptsSendCredential]`** (product services)
  accept a token issued to an organization, or minted for one Send's link.
- **`[NamesOrganization]`**, **`[NamesProvider]`** and **`[CreatesOrganization]`** (product
  services) mark operations about an organization or provider the session doesn't name.
- **`[AcceptsAssertedContext(reason, callers)]`** (domain services): see [Context](context.md).

## Settings

| Setting                                   | Default | What it does                                                                                                                                   |
| ----------------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `Authentication:Schemes:Bearer:Authority` | None    | The Identity service whose tokens are trusted. Read by Bitwarden.Server.Sdk.Authentication.                                                    |
| `Authentication:Schemes:Bearer:*`         | None    | Any other `JwtBearerOptions` property.                                                                                                         |
| `Tls:RequireHttps`                        | `false` | When true, the bearer authority must be `https://`, or the service does not start.                                                             |
| `Service:PublicIdentityUrl`               | None    | Where a browser reaches Identity, for the documentation UI's token request. Must be absolute `http` or `https`, or the service does not start. |

## Things to know

- **Roles don't work in a domain service.** `ICallerRole` answers `None` there, so an operation
  demanding a role refuses every call with `403`. The package doesn't refuse such a declaration at
  startup. Keep role requirements on product services, and in a domain service authorize by scope
  and context instead.
- **Extra audiences reach every endpoint.** If only one surface should accept another audience,
  check `aud` yourself in an `IAuthorizesOperation` on the other operations, or host that surface in
  its own service.
- **Tokens carry no keys.** A token carries identifiers and scopes. Authorization never needs to
  read Vault Data, which reaches the service only as Protected Data.

## See also

- [Context](context.md)
- [Defining a service](defining-a-service.md)
- [Outbound HTTP](outbound-http.md)
- [Errors](../payloads-and-responses/errors.md)
