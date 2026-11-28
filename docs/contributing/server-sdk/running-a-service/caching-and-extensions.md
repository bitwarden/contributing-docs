---
sidebar_position: 8
---

# Caching and extensions

**Audience:** engineers writing a Bitwarden service, and its API, with the server SDK.

Caching has three layers, from the narrowest: the request memo, which a service gets without writing
anything; cached reads of one resource; and cached lists. The last two are a domain service's own
cache in Redis, which other services read instead of calling it. This page also covers
`IServiceExtension`, the way a package extends every service that references it.

## Choose how to cache

| Layer              | What it keeps                                                      | Where                                  | What you write                                             |
| ------------------ | ------------------------------------------------------------------ | -------------------------------------- | ---------------------------------------------------------- |
| Request memo       | Other services' answers to the reads one request makes             | The request's memory, for that request | Nothing; `[WithoutRequestMemo]` on an operation to opt out |
| Cached read of one | A resource whole, under its identifier or a key                    | The owning service's prefix in Redis   | A `CacheableQuery<TEntity, TResource>` and its handler     |
| Cached list        | Every row of one list that the party in context has, up to a bound | The owning service's prefix in Redis   | A `CacheableListQuery<TEntity, TResource>` and its handler |

Start with the request memo, which is always there. Make a read cacheable when other services read
it often enough that answering from Redis matters, and cache a list only when it fits the one shape
below.

## Ask another service once in a request

`Service` begins a `RequestMemo`
([Bitwarden.Server.Sdk.Context](https://github.com/bitwarden/dotnet-extensions/blob/main/extensions/Bitwarden.Server.Sdk.Context/src/PACKAGE.md))
for each inbound request, before anything that could call another service, and ends it with the
request. While it is current, every `GET` and `HEAD` the service's clients send is remembered, and
the same call made again is answered from memory. Ask for what you need where you need it; don't
pass answers around, or keep them in a field, to save a call.

An operation that polls or waits for another service's answer to change opts out:

```csharp
using Bitwarden.Server.Sdk.Context;
using Bitwarden.Server.Sdk.Resources;

public static class WidgetActions
{
    // Asks the gadget service until its answer changes, so nothing it answers may be remembered.

    /// <summary>
    /// Publish a widget once its gadget is ready
    /// </summary>
    [WithoutRequestMemo]
    [StandardAction]
    public static Task Publish(string id, IWidgetPublisher publisher, CancellationToken cancellationToken) =>
        publisher.PublishWhenReadyAsync(id, cancellationToken);
}
```

- **A write forgets everything.** A write sent through a service client, and a save to the service's
  own database, make the request forget all it remembered, so a request always sees its own writes.
- **Only answers that stand are kept:** a `2xx` or `404`. A refusal, a `5xx`, a timeout or a failure
  to connect is never kept.
- **There is none** for an operation marked `[WithoutRequestMemo]`, for a request that upgrades its
  connection (a WebSocket), or while `Caching:RequestMemo:Enabled` is `false`.
- **Work without a request has none.** A message handler or a job begins one around one item of its
  work with `RequestMemo.Begin()`, never around a loop over many.
- To read again on purpose within a request, and how calls are matched, see
  [Ask once in a request](https://github.com/bitwarden/dotnet-extensions/blob/main/extensions/Bitwarden.Server.Sdk.Client/src/PACKAGE.md#ask-once-in-a-request)
  in Bitwarden.Server.Sdk.Client. Context's PACKAGE.md lists the settings that bound one memo.

## Let other services read a resource from your cache

A domain service lets other services read a resource from its Redis by extending
`CacheableQuery<TEntity, TResource>` from
[Bitwarden.Server.Sdk.Resources.Caching](https://github.com/bitwarden/dotnet-extensions/blob/main/extensions/Bitwarden.Server.Sdk.Resources.Caching/src/PACKAGE.md).
The query declares the read (the map, a key other than the identifier, what it includes, its
lifetime) and the read itself is the platform's: it fills the entry when it serves a read,
invalidates it just before each change commits, and publishes in the OpenAPI document, as
`x-bitwarden-cache`, what a client may read and how to check it. Its
[Make a read cacheable](https://github.com/bitwarden/dotnet-extensions/blob/main/extensions/Bitwarden.Server.Sdk.Resources.Caching/src/PACKAGE.md#make-a-read-cacheable)
shows the declaration.

What it asks of the operation:

- **The handler only reads.** A `[StandardReadOne]` handler takes the query, the identifier (`id`)
  or key, `Fields<T>` and the cancellation token, and returns what `ReadAsync`, `ReadByKeyAsync` or
  `ReadCurrentAsync` answers. A handler that takes anything else, or has an endpoint filter, an
  `IAuthorizesOperation`, a role, a permission or several scopes, stops the service starting: a
  cached copy must be authorized exactly as the service authorizes the read.
- **Domain services only.** A product service can't take a cacheable query.
- **Register the query by its type**, and give the service its cache with
  `AddOwnedCache<TDbContext>()`. Without `Caching:Owned:Redis:Configuration`, nothing is cached and
  every read goes to the database.

## Cache a list a party reads whole

A list is cached in one shape only, by extending `CacheableListQuery<TEntity, TResource>`. It must:

- have a path of its own, with a `[StandardReadMany]` handler that takes the query, `Fields<T>`,
  `PageNumber`, `PageSize` and the cancellation token, and no filter or sort;
- be keyed by the party the request's context names (`KeyedBy`), which the operation requires,
  forbidding the other owners, with the declared scope alone;
- come from one table, with a fixed `Where` and a fixed order (`OrderBy`, ending in a unique
  column), both reading only that table's own columns;
- hold at most a declared number of rows (`AtMost`), no more than the operation's maximum page size
  (`[MaximumPageSize(n)]` on its `PageSize`; see
  [Paging](../querying/paging.md#let-a-page-hold-more)).

The platform runs the query, keeps one entry per party, pages it, and invalidates it on any write to
a row of that table, for the party the row named before and after. A party with more rows than
`AtMost` is never cached. A declaration outside this shape stops the service starting.
[Cache a read-many](https://github.com/bitwarden/dotnet-extensions/blob/main/extensions/Bitwarden.Server.Sdk.Resources.Caching/src/PACKAGE.md#cache-a-read-many)
shows one.

## Read another service's cache

The client package for a service that publishes cached reads calls `AddCachedReads<TClient>(name)`,
and its callers take `ICachedReads<TClient>`
([Bitwarden.Server.Sdk.Client](https://github.com/bitwarden/dotnet-extensions/blob/main/extensions/Bitwarden.Server.Sdk.Client/src/PACKAGE.md#answer-a-read-from-the-callees-cache)):

- `ReadAsync` and `ReadCurrentAsync` read one resource, by key or by the party the call carries.
- `ReadManyAsync(operationId, pageNumber, pageSize, fields)` answers a page of a cached list, with
  the party's total.
- `ReadAllAsync(operationId, fields)` reads the party's whole list, so a client never copies the
  owner's bound.

A hit is answered only where the owner would have answered this caller the same. Anything else, and
any doubt, is a miss: make the call. Nothing in the client writes to Redis.

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

A package that adds to the standard endpoints has two more seams, in
[Bitwarden.Server.Sdk.Resources](https://github.com/bitwarden/dotnet-extensions/blob/main/extensions/Bitwarden.Server.Sdk.Resources/src/PACKAGE.md)'s
`Bitwarden.Server.Sdk.Resources.Endpoints` namespace.

- **`IStandardEndpointFilterProvider`** adds an endpoint filter to every standard endpoint it
  applies to, between the platform's checks and the handler. It is asked once per endpoint as it is
  built, and can report a problem that stops the service starting.
- **`IStandardEndpointCheck`** is a rule checked over every endpoint once all are built, reported
  with the startup check's other problems.

## Things to know

- **A cached entry is Data at Rest in Redis,** readable by every service granted the owner's prefix.
  Protected Data in it stays the ciphertext the database holds, and a resource read across owners
  may cache no `[PersonalData]` attribute.
- **A memo never outlives its request.** Nothing in it reaches another caller, and work the request
  starts without awaiting finds it ended once the request is answered.
- **Not a cache a process keeps for itself.** For one, use
  [Bitwarden.Server.Sdk.Caching](https://github.com/bitwarden/dotnet-extensions/blob/main/extensions/Bitwarden.Server.Sdk.Caching/src/PACKAGE.md).
- **Keep the package reference real.** An extension is found only when the service's compiled
  assembly references the package's assembly. The C# compiler drops a reference nothing uses, so a
  package whose types the service never touches is never read. Use one of its types in the service,
  or register what you need in `ConfigureServices` instead.
- **Never cache Vault Data in plaintext.** A service holds it only as Protected Data, and nothing
  the platform caches inspects it.

## See also

- [Defining a service](defining-a-service.md)
- [Outbound HTTP](outbound-http.md)
- [Paging](../querying/paging.md): the maximum page size a cached list's bound must fit in.
- [OpenAPI](../contracts/openapi.md): what the document publishes about cached reads.
