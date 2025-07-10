---
adr: "0026"
status: "Accepted"
date: 2025-05-30
tags: [server]
---

# 0026 - Adopt `TryAdd` Dependency Injection Overloads

<AdrTable frontMatter={frontMatter}></AdrTable>

## Context and Problem Statement

`Microsoft.Extensions.DependencyInjection` (the DI provider we use) has a "last one wins" behavior
-- this means that if you inject two services of the same service type, the last implementation that
was registered wins. For example:

```csharp
services.AddSingleton<IMyService, ImplementationOne>();
// Somewhere later on in the codebase
services.AddSingleton<IMyService, ImplementationTwo>();
```

When a service or controller injects `IMyService` they will be getting `ImplementationTwo` even
though `ImplementationOne` _does_ still exist in the service container. It exists in the container
still because if you were to instead inject `IEnumerable<IMyService>` you would receive an
enumerable containing 2 services, one for each implementation that was registered. This **is** the
behavior you want sometimes but it is much rarer to inject an enumerable of services as opposed to
injecting just a single service, and is where the [`TryAdd`][try-add-definitions] overloads on
`IServiceCollection` (in the `Microsoft.Extensions.DependencyInjection.Extensions` namespace) come
in handy. One can more explicitly declare the expected usage of a service during service
configuration time. The above example could instead be written like:

```csharp
services.TryAddSingleton<IMyService, ImplementationOne>();
// Somewhere later on in the codebase
services.TryAddSingleton<IMyService, ImplementationTwo>();
```

Now when you inject `IMyService` you would instead be receiving `ImplementationOne` and if you
injected `IEnumerable<IMyService>` you would only get an enumerable with a single instance and it
would also be `ImplementationOne`. There would also only be a single `ServiceDescriptor` registered
in the container. What `TryAdd?Keyed?{Singleton|Scoped|Transient}` does under the hood is check if
there has already been a service with type `IMyService` (and key if using a keyed service)
registered. If one has, it will skip adding another entry with its given implementation, but if one
has not already been added, it will add it.

If you do want multiple services for a given service type (for using with `IEnumerable<IMyService>`)
then you should likely be using the `TryAddEnumerable` overload. If you specifically wanted multiple
implementations to be able to be injected you'd structure it like:

```csharp
services.TryAddEnumerable(ServiceDescriptor.Singleton<IMyService, ImplementationOne>());
services.TryAddEnumerable(ServiceDescriptor.Singleton<IMyService, ImplementationTwo>());
```

`TryAddEnumerable` won't add the service to the container if the service type **and** implementation
type are the same. This leads you to one of the three scenarios where you would specifically **not**
want to use the `TryAdd` overloads.

### Scenario One

If you did want to use inject an `IEnumerable<IMyService>` **and** wanted that list to have multiple
services of the same implementation.

### Scenario Two

You know for an absolute fact that you are the first to register a given service type. In this case
it is more acceptable to not use `TryAdd` overloads although it likely doesn't hurt anything and in
favor of not breaking the rules, it's still encouraged to use `TryAdd`.

### Scenario Three

If you know you are the last to register a service and you need to override whatever implementation
might have previously been registered. The ideal place to make these decisions is earlier in DI
instead of after but until `TryAdd` is fully adopted the only place to get it to work is at the very
end. You should be very careful while doing this and include a justification for each such usage.
You likely even want to go a step further and manually remove the service descriptor that you don't
want and then inject yours into it. For example:

```csharp
services.TryAddSingleton<IMyService, DefaultImplementation>();
// Later on in execution order
services.Remove(
  services.Single(sd => sd.ServiceType == typeof(IMyService));
);
services.AddSingleton<IMyService, MySpecialImplementation>();
```

This is another instance where you now know that there isn't another registration of `IMyService`
elsewhere in container and so once again it might just be worth it to do `TryAddSingleton` in order
to limit the amount of times you are breaking the rules.

The benefits to using `TryAdd` on all your services is that you can create an `Add[Feature]` method
to add all the services needed to make your feature work and that method can be called many times
with no ill-effect to the system. This means that if someone else builds a feature on top of yours
they also can call `AddYourFeature` in their service registration, which is generally a good
practice to do so that you don't get a runtime error about a missing dependency; it is also a
practice followed throughout the [ASP.NET Core repo][aspnetcore-repo] as well as many other
libraries that integrate with DI. For example, Data Protection calls
[`services.AddOptions`][add-options-example] even though it's highly likely that something else in
the application has already called it and their usage doesn't actually add any service. This pattern
generally makes testing this method easier, as it is a "batteries included" method and also helps
show a clear dependency graph. There are a few services that are allowed to not be explicitly added
as they are expected to always be included in the host -- those services are `ILogger<>`,
`ILoggerFactory`, `IConfiguration`, and `IHostEnvironment`.

## Considered Options

- **Ad-hoc usage** - Where we are today, the `TryAdd` overloads are allowed to be used and are used
  occasionally throughout the codebase but they is no outside encouragement to use them.
- **Encourage usage** - Start encouraging usage through team training and encouragement to use them
  in code reviews but don't make any automatic check to enforce usage.
- **Enforce usage** - Start enforcing usage of `TryAdd` overloads by adding the
  `Microsoft.CodeAnalysis.BannedApiAnalyzers` NuGet package and adding the non-`TryAdd` overloads to
  the list of banned APIs. If you believe your usage of the API is valid you would add a
  `#pragma warning disable` and a comment explaining the justification.
- **Disallow usage** - There doesn't seem like a good reason to do this as there are more explicit
  versions of the non-`TryAdd` overloads. If you want to use them you should be allowed to.

## Decision Outcome

Chosen option: **Enforce usage**.

### Positive Consequences

- More explicit intention.
- Built-in dependency graph.
- Easier ability for the host to make overarching decisions.
- A single project that bootstraps multiple services is much easier.

### Negative Consequences

- New paradigm.
- A migration to `TryAdd` if done incorrectly could break things.

### Plan

Enforcing the usage through the `Microsoft.CodeAnalysis.BannedApiAnalyzers` NuGet package, we will
tone down the diagnostic from the banned APIs to be warnings instead errors. We will have the
warning include custom diagnostic text to point to a new section in the C# style guide with the
instructions on how to migrate.

A one-time recorded learning session will also be hosted; the session will go over the new docs,
show off migrating existing service registrations to using the `TryAdd` overloads, and host a QnA.

The migrations done in the above session as well as a few others will be made so that there are good
examples in the codebase to point to for the new preference.

[try-add-definitions]:
  https://learn.microsoft.com/en-us/dotnet/api/microsoft.extensions.dependencyinjection.extensions.servicecollectiondescriptorextensions?view=net-9.0-pp
[aspnetcore-repo]: https://github.com/dotnet/aspnetcore
[add-options-example]:
  https://github.com/dotnet/aspnetcore/blob/b7606293a7146cfeb5b060340521355a0780d2d8/src/DataProtection/DataProtection/src/DataProtectionServiceCollectionExtensions.cs#L37
