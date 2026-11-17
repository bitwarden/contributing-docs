---
sidebar_position: 8
---

# Caching and extensions

**Audience:** engineers writing a Bitwarden service, and its API, with the server SDK.

Two small pieces of the platform: `GetOrResolveOnceAsync`, a short in-process memo for another
service's answer, and `IServiceExtension`, the way a package extends every service that references
it.

## Cache another service's answer briefly

`GetOrResolveOnceAsync` (`Bitwarden.Server.Sdk.Service.Caching`) is an extension on `IMemoryCache`.
It keeps one answer per key for a lifetime you choose:

```csharp
using Bitwarden.Server.Sdk.Service;
using Bitwarden.Server.Sdk.Service.Caching;
using Microsoft.Extensions.Caching.Memory;

internal sealed class WidgetService(string[] args) : Service("widget-service", "Widget Service", args)
{
    protected override void ConfigureServices(IServiceCollection services)
    {
        services.AddMemoryCache();
        services.AddSingleton<IWidgetPolicies, WidgetPoliciesClient>();
        services.AddSingleton<WidgetGate>();
    }
}

internal sealed class WidgetGate(IMemoryCache cache, IWidgetPolicies policies)
{
    public Task<bool> IsEnabledAsync(Guid organizationId, CancellationToken cancellationToken) =>
        // Concurrent requests that miss together share one call to the policy service, and the
        // answer is kept for 30 seconds. A failed or cancelled call is not kept.
        cache.GetOrResolveOnceAsync(
            ("widget-enabled", organizationId),
            TimeSpan.FromSeconds(30),
            () => policies.IsWidgetEnabledAsync(organizationId),
            cancellationToken);
}
```

- **Register `IMemoryCache` yourself.** The package doesn't; call `services.AddMemoryCache()`, as
  above.
- **One resolution per miss.** Concurrent requests that miss together share one resolution, unlike
  `IMemoryCache.GetOrCreateAsync`, which runs it once per caller.
- **Failures are not kept.** A failed or cancelled resolution is replaced on the next call.
- **Cancellation is per caller.** No caller's token reaches the shared resolution, so one caller
  giving up fails nobody else. Each caller's token only stops that caller waiting.
- **Key by everything the answer depends on**, here the organization, so one caller's answer is
  never served to another.

## Extend every service from a package

A package contributes to every service that references it by declaring an `IServiceExtension` on its
assembly. `IServiceExtension` and `[ServiceExtension]` are in
[Bitwarden.Server.Sdk.Service.Abstractions](https://github.com/bitwarden/dotnet-extensions/blob/main/extensions/Bitwarden.Server.Sdk.Service.Abstractions/src/PACKAGE.md)
(namespace `Bitwarden.Server.Sdk.Service`), so the extending package references that and not
Bitwarden.Server.Sdk.Service:

```csharp
using Bitwarden.Server.Sdk.Service;
using Microsoft.Extensions.DependencyInjection.Extensions;

[assembly: ServiceExtension(typeof(WidgetAuditExtension))]

// A package's contribution to every service that references it.
public sealed class WidgetAuditExtension : IServiceExtension
{
    public void Configure(IServiceCollection services, IConfiguration configuration)
    {
        // TryAdd, so a service that registered its own sink first keeps it.
        services.TryAddSingleton<IWidgetAuditSink, LoggingWidgetAuditSink>();
    }
}
```

- The type needs a public parameterless constructor. A declared type that doesn't implement
  `IServiceExtension` stops the service at startup.
- Extensions run after the service's `ConfigureServices`, so an extension can see what the service
  registered. They run in a fixed order: by assembly name, then by type name.
- Register with `TryAdd...`, so a service that registered its own implementation first keeps it.
- An extension reads whatever configuration it needs from the `IConfiguration` it is given.
- The package reads the service's assembly and what it references, transitively, skipping `System*`,
  `Microsoft*`, `netstandard` and `mscorlib`. The declaration is on the assembly rather than
  discovered by scanning types, so an extension is something a package author states on purpose,
  where a reviewer sees it.

## Add to the standard endpoints from a package

A package that adds to the standard endpoints has three more seams, in
[Bitwarden.Server.Sdk.Resources](https://github.com/bitwarden/dotnet-extensions/blob/main/extensions/Bitwarden.Server.Sdk.Resources/src/PACKAGE.md):
the `Bitwarden.Server.Sdk.Resources.Endpoints` namespace and `StandardResponses`.

- **`IStandardEndpointFilterProvider`** adds an endpoint filter to every standard endpoint it
  applies to, between the platform's checks and the handler. It is asked once per endpoint as it is
  built, and can report a problem that stops the service starting.
- **`IStandardEndpointCheck`** is a rule checked over every endpoint once all are built, reported
  with the startup check's other problems.
- **`ServedByPlatform<T>()`** is the body of a `[StandardReadOne]` handler whose read a registered
  filter answers. The handler still declares the route, operation and documentation; its body throws
  if nothing answered.

## Things to know

- **Cache only other services' answers here.** An answer read from the request's own database
  belongs to that request's scope.
- **It is a short memo, not a cache.** For a cache shared between instances, or one that must be
  invalidated, use Bitwarden.Server.Sdk.Caching.
- **Keep the package reference real.** An extension is found only when the service's compiled
  assembly references the package's assembly. The C# compiler drops a reference nothing uses, so a
  package whose types the service never touches is never read. Use one of its types in the service,
  or register what you need in `ConfigureServices` instead.
- **Never cache Vault Data in plaintext.** A service holds it only as Protected Data, and nothing
  the platform caches inspects it.

## See also

- [Defining a service](defining-a-service.md)
- [Outbound HTTP](outbound-http.md)
