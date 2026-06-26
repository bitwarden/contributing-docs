---
adr: "0031"
status: "Proposed"
date: 2026-06-23
tags: [server]
---

# 0031 - Adopt Minimal APIs

<AdrTable frontMatter={frontMatter}></AdrTable>

## Context and problem statement

.NET 6 introduced minimal APIs — a lighter alternative to controllers designed for simplicity,
speed, and ahead-of-time (AOT) compilation. As of .NET 10, minimal APIs now support automatic
validation via data annotation attributes, closing the last significant feature gap with
controllers.

The key architectural advantage: minimal APIs let us decompose the server into smaller, composable
pieces. Each feature in its own library owns its `.csproj` — and its dependencies — making it
straightforward to deploy a feature independently or bundle several into a single Lite container.

## Considered options

- **Keep using controllers** - Continue using controllers for all our APIs. Controllers are well
  understood by the team and have a proven track record. However, controllers are no longer
  Microsoft's preferred direction, have no path to AOT compatibility, and resist the composable
  architecture we're moving toward.
- **Use minimal APIs for new endpoints** - Controllers and minimal APIs can be used side-by-side;
  new features can use minimal APIs exclusively, segregating their concerns in their own project.
  This also keeps a future AOT compilation path open.
- **Migrate controllers to minimal APIs** - We could ban controllers entirely and embark on an
  aggressive switch to minimal APIs, resulting in a consistent codebase with no mixed styles.
  However, this is very time-consuming, and there are other pieces that need to fall into place
  before we can achieve AoT compilation anyway — so we wouldn't get the performance benefits right
  away.

## Decision outcome

Chosen option: **Use minimal APIs for new endpoints**.

New endpoints use minimal APIs, placed in a feature-scoped library that exposes two methods:
`Add[Feature]Services` and `Map[Feature]Endpoints`. The host service calls both under an endpoint
group, which makes extracting any feature into a standalone service behind a reverse proxy
straightforward later.

```csharp
// Feature library: MyFeature/ServiceCollectionExtensions.cs
public static IServiceCollection AddMyFeatureServices(this IServiceCollection services)
{
    services.TryAddScoped<IMyFeatureService, MyFeatureService>();
    return services;
}

// Feature library: MyFeature/EndpointRouteBuilderExtensions.cs
public static RouteGroupBuilder MapMyFeatureEndpoints(this IEndpointRouteBuilder routes)
{
    var group = routes.MapGroup("");
    group.MapGet("/", GetAll);
    group.MapPost("/", Create);
    return group;
}

// Host service: Program.cs
builder.Services.AddMyFeatureServices();

app.UseEndpoints(endpoints =>
{
    endpoints.MapDefaultControllerRoute();
    endpoints.MapGroup("/my-feature")
        .MapMyFeatureEndpoints();
});
```

### Positive consequences

- Better segregation of features similar to clients and sdk-internal
- Teams own their feature library's `.csproj`, giving them direct control over their package
  dependencies
- Easier path to breaking a feature out as its own service, or composing features into a Lite
  container
- Enables a future path to AoT compilation, improving cold-start performance

### Negative consequences

- A new way of writing endpoints has to be learned
- Controllers and minimal APIs will coexist in the codebase for the foreseeable future, which
  increases the surface area developers need to be familiar with
- `ActionFilterAttribute`s must be rewritten as endpoint filters before any controller that uses
  them can be migrated to minimal APIs

### Plan

An `ENDPOINT_LIBRARY.md` in `src/Libraries` will document the canonical library shape, how to wire
it into the existing monolith, and the path to extracting a feature as a standalone service.

New endpoints added to existing controller-based projects should still use minimal APIs where
possible, even if not yet in their own feature-scoped library. Existing controllers will be migrated
opportunistically. Icons, Notifications, and Events are prioritized as early migration targets given
their small endpoint surface area; migration for a project is considered complete when it has no
remaining controller classes. Heavier projects will be migrated as opportunities arise.
