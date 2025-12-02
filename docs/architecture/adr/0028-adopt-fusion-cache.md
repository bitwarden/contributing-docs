---
adr: "0028"
status: Proposed
date: 2025-12-01
tags: [server, server-sdk]
---

# 0028 - Adopt Fusion Cache

<AdrTable frontMatter={frontMatter}></AdrTable>

## Context and problem statement

We have quite a few custom caching patterns here. They generally entail setting up an instance of
`IDistributedCache` through keyed services. That cache is then injected into some service and some
of the following things are done:

- A hard-coded prefix is added to every `Get` or `Set` style call
- Entry options are hard-coded, or have minimal customization from GlobalSettings
- The value is serialized, often in JSON format
- If a value isn't found in the cache, a hard-coded value is used instead
- If a value isn't found in the cache, a value from the database is retrieved and used instead
  - The value from the database is often cached in the distributed cache
- An even faster copy of the data is stored in memory
  - Either in a local field or in `IMemoryCache`
  - Messages from other nodes are subscribed to in order to keep the memory copy in lockstep

One of the key things that is missing from that list is that no metrics are ever recorded on if the
cache was useful, the most important metric being: Was the value stored in the cache ever retrieved
before it expired?

## Considered options

- Continue hand rolling each use case
- Adopt HybridCache
- Adopt FusionCache
- Adopt FusionCache as HybridCache
- Other 3rd party packages

### Continue hand rolling each use case

**Pros**

- Maximum customizability - by building everything yourself

**Cons**

- A lot of boilerplate that's easy to get wrong
- No automatic metrics
- Have to manually configure connection strings and TTL
- No standard on key prefixes

### Adopt HybridCache

Adopt out-of-box library from Microsoft: [HybridCache][hybrid-cache].

**Pros**

- Great support and docs
- L1 and L2 cache
- Cache stampede protection
- Serialization configured through DI

**Cons**

- Key prefixing is still manual
- No memory cache synchronization of nodes

### Adopt FusionCache

Adopt third party package: [FusionCache][fusion-cache].

**Pros**

- Automatic key prefixing (setup in DI)
- L1 and L2 cache
- Cache stampede protection
- Memory cache node synchronization mechanism
- Very customizable

**Cons**

- 3rd party package

### Adopt FusionCache as HybridCache

It's possible to use FusionCache under the hood but inject and interact with `HybridCache`.

**Pros**

- All pros from [Adopt FusionCache](#adopt-fusioncache)
- If we ever switched to `HybridCache`, it would be a DI-only change

**Cons**

- All cons from [Adopt FusionCache](#adopt-fusioncache)
- Abstraction overhead
- Hides the true implementation

### Other 3rd party packages

[`CacheManager`][cache-manager] is not as popular or active as of recently compared to FusionCache.
It does have built in serialization but it relies on `Newtonsoft.Json` and therefore would not be
AOT friendly. We'd likely want to implement our own using `System.Text.Json`. It isn't clear if it
has cache stampede protection. It also doesn't have built in metrics.

[`LazyCache`][lazy-cache] does not fit our needs in a few ways, most importantly it is only a memory
cache. It has also not released a new version since September 2021.

[`CacheTower`][cache-tower] is less popular and less active than `FusionCache`. The only feature it
is missing that we want is built in metrics.

## Decision outcome

Chosen option: **Adopt `FusionCache`**, because the fusion cache library contains all the features
we need for our most complex scenarios and has enough customizability for our simpler scenarios.

### Implementation details

#### Today

We will use the [`AddExtendedCache`][add-extended-cache] available in `server`. You are able to call
it with your own name and settings and then inject your own `IFusionCache` from keyed services using
the given name.

#### In the near future

Caching will be built into our server SDK and supplied through a `Bitwarden.Server.Sdk.Caching`
library. With no additional DI registration you will be able to inject `IFusionCache` using keyed
services. You will then be able to configure your specific instance using named options or through
configuration like such:

```json
{
  "Caching": {
    "Uses": {
      "MyFeature": {
        "Fusion": {
          "DefaultEntryOptions": {
            "Duration": "00:01:00"
          }
        }
      }
    }
  }
}
```

### Positive consequences

- Able to get started quickly; nothing but injecting `IFusionCache` is needed for most cases
- Consolidated documentation, guidance, and metrics by consuming it from a package
- Usable outside of the `server` monorepo
- Customizable without any code changes needed

### Negative consequences

- Could make caching too easy to use when caching isn't the right solution all the time

### Implementation plan

- New features desiring cache should use `IFusionCache`
- Finish up Caching package in server SDK (Target: Q1 2026)
- Individual migration plans for existing cache uses
  - If only `IDistributedCache` is needed memory cache and backplane can be turned off
  - If no `IDistributedCache` is needed it can be turned off and only memory and the backplane will
    be used.

[hybrid-cache]:
  https://learn.microsoft.com/en-us/aspnet/core/performance/caching/hybrid?view=aspnetcore-10.0
[fusion-cache]: https://github.com/ZiggyCreatures/FusionCache
[add-extended-cache]:
  https://github.com/bitwarden/server/blob/main/src/Core/Utilities/ExtendedCacheServiceCollectionExtensions.cs#L25C38-L25C54
[cache-manager]: https://github.com/MichaCo/CacheManager
[lazy-cache]: https://github.com/alastairtree/LazyCache
[cache-tower]: https://github.com/TurnerSoftware/CacheTower
