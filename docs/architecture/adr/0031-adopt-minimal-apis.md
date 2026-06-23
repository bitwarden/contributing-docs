---
adr: "0031"
status: "Proposed"
date: 2026-06-23
tags: [server]
---

# 0031 - Adopt Minimal APIs

<AdrTable frontMatter={frontMatter}></AdrTable>

## Context and problem statement

.NET introduced minimal APIs in .NET 8 targeted at being simpler, faster, and ahead-of-time
compilable. As of .NET 10, minimal APIs now support automatic validation via data annotation
attributes, closing the last significant feature gap with controllers.

The biggest advantage that minimal APIs give us is in architectural design — they allow us to design
our server in smaller, more composable pieces. When a feature lives in its own library with its own
`.csproj`, teams have full ownership over the packages and dependencies they pull in. This design
makes it easier to independently deploy a feature as a separate service, or compose multiple
features into a single project for a true Lite container.

## Considered options

- **Keep using controllers** - Continue using controllers for all our APIs. Controllers are well
  understood by the team and have a proven track record. However, they are not what .NET is pushing
  anymore, there are no plans for them to become AoT compatible, and they make a composable
  architecture much harder.
- **Use minimal APIs for new endpoints** - Controllers and minimal APIs can be used side-by-side;
  new features can use minimal APIs exclusively, segregating their concerns in their own project.
  This also gives us a clearer path towards being able to one day AoT compile our application for
  performance benefits.
- **Migrate controllers to minimal APIs** - We could ban controllers entirely and embark on an
  aggressive switch to minimal APIs, resulting in a consistent codebase with no mixed styles.
  However, this is very time-consuming, and there are other pieces that need to fall into place
  before we can achieve AoT compilation anyway — so we wouldn't get the performance benefits right
  away.

## Decision outcome

Chosen option: **Use minimal APIs for new endpoints**.

New endpoints should start using minimal APIs and should put them in a feature-scoped library. That
library should have two public methods, an `Add[Feature]Services` and a `Map[Feature]Endpoints`.
Those methods are then consumed in the service that should host those endpoints under an endpoint
group. This should enable us to later spin our endpoints into their own service behind a reverse
proxy.

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

A new `ENDPOINT_LIBRARY.md` file will be written in a new `src/Libraries` directory. This document
will cover the decision to move to minimal APIs and to build them in a feature-scoped library. It
will also show how to incorporate the library into the existing monolith as well as the path towards
spinning a feature into its own service if/when that is desired.

Existing controllers will be migrated opportunistically. Projects that are light on endpoints — such
as Icons, Notifications, and Events — may be prioritized for a more aggressive migration timeline.
