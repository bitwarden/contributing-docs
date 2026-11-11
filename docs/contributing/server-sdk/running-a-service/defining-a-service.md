---
sidebar_position: 1
---

# Defining a service

**Audience:** engineers writing a Bitwarden service, and its API, with the server SDK.

A Bitwarden service is a class deriving from `Service`. The base class owns startup, in a fixed
order, and your service fills in only the hooks it needs. Startup registers the packages `Service`
is made of, such as Bitwarden.Server.Sdk.Authorization and Bitwarden.Server.Sdk.Resources, so the
service references Bitwarden.Server.Sdk.Service alone (see
[What it is made of](https://github.com/bitwarden/dotnet-extensions/blob/main/extensions/Bitwarden.Server.Sdk.Service/src/PACKAGE.md#about)).

## Write the entry point

In a project using `Microsoft.NET.Sdk.Web`, `Program.cs` is the whole entry point:

```csharp
using Bitwarden.Server.Sdk.Authorization;
using Bitwarden.Server.Sdk.Service;

new WidgetService(args).Run();

internal sealed class WidgetService(string[] args) : Service("widget-service", "Widget Service", args)
{
    protected override AuthorizationDefaults Authorization => new()
    {
        Organization = ContextRequirement.Optional,
        ReadScope = "widgets.read",
        WriteScope = "widgets.write",
    };

    protected override void ConfigureServices(IServiceCollection services) =>
        services.AddSingleton<IWidgetStore, WidgetStore>();

    protected override void MapEndpoints(IEndpointRouteBuilder endpoints) =>
        WidgetsEndpoints.Map(endpoints);
}
```

- `Service(name, title, args)` takes the service's identifier, its title and the command line.
- The identifier must be lowercase letters, digits and hyphens (`^[a-z0-9]+(-[a-z0-9]+)*$`), or the
  constructor throws. This catches the identifier and title passed the wrong way round.
- The identifier names the service's outbound credential (`internal.{name}`), the token audience it
  accepts, its telemetry resource and its rate-limit keys. The package also supplies it as
  `Bitwarden:ServiceName`, the lowest-precedence setting, which only the outbound credential reads:
  a deployment that sets it changes the name the service authenticates as, and nothing else.
- The title is the title of the OpenAPI document and the documentation UI.
- Most services need only `Authorization`, `ConfigureServices` and `MapEndpoints`.
- Once every endpoint is mapped, the package reads them all. When an endpoint is declared wrongly or
  contradicts its authorization, the service doesn't start, and the exception lists every problem at
  once.

## Override the other hooks

Override the other hooks only when you need them:

```csharp
using Bitwarden.Server.Sdk.Service;

internal sealed class WidgetService(string[] args) : Service("widget-service", "Widget Service", args)
{
    // Sources added here are appended, so they win over appsettings.json and the environment.
    protected override void ConfigureConfiguration(IConfigurationManager configuration) =>
        configuration.AddJsonFile("widgets.json", optional: true);

    // Runs after the platform's registrations: registering a type the platform registered
    // replaces it.
    protected override void ConfigureServices(IServiceCollection services) =>
        services.AddSingleton<IWidgetStore, WidgetStore>();

    // Outside the platform's middleware: sees every request first, including ones the
    // platform refuses.
    protected override void OnConfiguringPipeline(WebApplication app) =>
        app.Use(async (http, next) =>
        {
            http.Response.Headers["X-Widget-Edge"] = "1";
            await next(http);
        });

    // Inside the platform's middleware: after authentication and authorization, and an
    // exception thrown here is answered in the standard error document.
    protected override void OnPipelineConfigured(WebApplication app) =>
        app.UseMiddleware<WidgetAuditMiddleware>();

    protected override void MapEndpoints(IEndpointRouteBuilder endpoints) =>
        WidgetsEndpoints.Map(endpoints);
}
```

The hooks run in this order. A derived type can add at each hook but can't reorder the steps.

| Step | Hook or platform step      | What happens                                                                                                        |
| ---- | -------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| 1    | `CreateBuilder()`          | `WebApplication.CreateBuilder(args)`. Override only to substitute a differently configured builder.                 |
| 2    | `ConfigureConfiguration()` | Your configuration sources, appended last, so they win over the standard sources.                                   |
| 3    | Platform registrations     | Authentication, authorization, telemetry, feature flags, rate limits, idempotency keys, CORS, OpenAPI and the rest. |
| 4    | `ConfigureServices()`      | Your registrations. The last point at which the service adds to the container.                                      |
| 5    | Service extensions         | Every `IServiceExtension` a referenced package declares.                                                            |
| 6    | `builder.Build()`          | The container is fixed.                                                                                             |
| 7    | `OnConfiguringPipeline()`  | Middleware that must wrap the platform's.                                                                           |
| 8    | Platform middleware        | See below.                                                                                                          |
| 9    | `OnPipelineConfigured()`   | Your own middleware, the usual place for it.                                                                        |
| 10   | Platform endpoints         | `/api/openapi.json`, `/docs`, the health probes, `GET /`, and a product service's config resource.                  |
| 11   | `MapEndpoints()`           | Your endpoints. Then the package checks them all.                                                                   |

The platform's middleware runs in this order, outermost first:

1. Finishing writes: a request other than `GET`, `HEAD`, `OPTIONS` or `TRACE` runs to the end even
   when its client disconnects. A safe request keeps the client's cancellation.
2. The forwarded client address, from a trusted proxy.
3. The log scope naming the organization, user and provider.
4. The exception handler, then status-code pages, both answering in the standard error document.
5. CORS, only when browser origins are configured.
6. Per-address rate limits.
7. The context refusal (product services only).
8. The documentation UI at `/docs`.
9. Authentication, then the context check (domain services only), then authorization.
10. The call-chain check: the services a call passed through, and a call back into this service.
11. Feature-flag checks.
12. Idempotency keys: a write another service repeats with the same `Idempotency-Key`, to an
    operation marked `[AcceptsIdempotencyKey]`, is answered from its first run.

`AddPlatformServices` and `UsePlatformMiddleware` are virtual too, but overriding either replaces
the platform's baseline wholesale. Use the hooks on either side of them instead.

## Start the service in a test

`Build()` returns the configured `WebApplication` without starting it, for tests and hosting
harnesses:

```csharp
await using var app = new WidgetService([]).Build();
await app.StartAsync();
```

`Run()` builds and runs it. Given `--emit-openapi <path>`, it writes the OpenAPI document instead
and exits.

## Choose the kind of service

```csharp
using Bitwarden.Server.Sdk.Service;

// A domain service: called only by other services. The default.
internal sealed class WidgetJobs(string[] args) : Service("widget-jobs", "Widget Jobs", args);

// A product service: called by people, holding their own session.
[ProductService]
internal sealed class WidgetPortal(string[] args) : Service("widget-portal", "Widget Portal", args);

// A product domain service: a domain service that owns one product's data.
[ProductDomainService]
internal sealed class WidgetService(string[] args) : Service("widget-service", "Widget Service", args);
```

- A **domain service** takes whom a request concerns from the context another service sends.
- A **product service** is where a person's session ends. It takes whom a request concerns from the
  validated token, refuses the context headers, and serves `GET /api/v1/config`.
- A **product domain service** behaves exactly as a domain service. The attribute changes only how
  its documentation UI looks, so the three kinds can be told apart.
- A type carrying both attributes makes the constructor throw.
- Both attributes are inherited, so a type deriving from a product service stays one.
- `IServiceIdentity.IsProductService` (Bitwarden.Server.Sdk.Context) reports which kind is running.

Mark a service `[ProductService]` only when people call it directly. See [Context](context.md) for
what each kind believes about a request.

## Settings

| Setting                 | Default                      | What it does                                                                                                                            |
| ----------------------- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `Bitwarden:ServiceName` | The name passed to `Service` | The name the client packages authenticate as (`internal.{name}`). Supplied as the lowest-precedence source, so a deployment can set it. |

## Things to know

- **Choose the identifier once.** It is unique across Bitwarden and appears in credentials,
  audiences, configuration and telemetry. Changing it later changes the service's audience, so every
  caller's tokens must change with it.
- **Don't call `UseBitwardenSdk()`.** The `Bitwarden.Server.Sdk` MSBuild SDK offers it to layer in
  self-hosted settings, set up OpenTelemetry and add authentication and feature flags. `Service`
  already does all of that. Calling both registers the bearer scheme twice, and the service fails
  with "Scheme already exists: Bearer". The settings both read (`globalSettings:selfHosted`,
  `OpenTelemetry:*`, `DD_ENV`) mean the same thing in both.
- **Middleware placement matters.** Middleware in `OnConfiguringPipeline` runs before
  authentication, so it must not trust anything about the caller. Put middleware that needs the
  caller in `OnPipelineConfigured`.

## See also

- [Authentication and authorization](authentication-and-authorization.md)
- [Context](context.md)
- [Configuration and self-hosting](configuration-and-self-hosting.md)
- [Caching and extensions](caching-and-extensions.md)
