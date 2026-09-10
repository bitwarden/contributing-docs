---
adr: "0035"
status: Proposed
date: 2026-09-10
tags: [server, sdk]
---

# 0035 - Service-oriented architecture

<AdrTable frontMatter={frontMatter}></AdrTable>

## Notation

This ADR uses [RFC 2119](https://www.rfc-editor.org/info/rfc2119/) keywords (`MUST`, `MUST NOT`,
`SHOULD`, `SHOULD NOT`, `MAY`) deliberately. Anything marked `MUST` or `MUST NOT` is not negotiable
at team level; a team that believes it needs an exception brings the case to the architecture group
rather than adopting one unilaterally.

**Service** here means an independently deployable process that owns a set of resources and
publishes a contract over them. **Consumer** means anything that calls a service — another service,
a user interface, or an external integration. **Service client** means the package a service
publishes so consumers can call it without hand-writing transport. **Row-level security** means the
rules an owning service applies to determine which rows a given caller may see — organization
scoping and any narrower per-user visibility the owner enforces, not tenancy alone.

## Context and problem statement

The server is one application over one shared data store. Any code path can join across any domain,
which means a domain's data has no owner in any enforceable sense: the schema is the integration
contract, and every team is coupled to every other team's tables. This is the constraint behind a
long tail of recurring problems — a change to one domain's schema cannot be reasoned about locally,
tenant isolation is applied by convention rather than by structure, and no team can deploy on its
own cadence.

Tenant isolation is the clearest symptom. Organization scoping is currently enforced by roughly 98
hand-written organization comparisons across 65 files, each applied to a row that has already been
read. Every one of them is a place a future change can omit the check, and nothing structural
distinguishes a correct call site from a missing one.

The pieces needed to decompose already exist. `Bitwarden.Server.Sdk` is a shared MSBuild SDK package
consumed by fifteen projects in `server`. Command-query separation is established at scale per
[ADR-0008](./0008-server-CQRS-pattern.md), with several hundred single-operation command and query
classes already in the tree, and the newest service is factored into endpoints, handlers, and
commands. What is missing is not a mechanism but an agreement: a definition of what a service is,
what it owns, and how a boundary is crossed. Absent that, each extraction is negotiated from scratch
and the boundaries drift apart.

Deciding nothing has a specific cost. Services will get extracted regardless, because teams need
independent deployment, and they will be extracted with divergent answers to the same questions —
who may read this table, what happens when the owner is unavailable, whether a copy is acceptable.
Reconciling those answers after the fact is far more expensive than agreeing them once.

## Considered options

- **Status quo:** one application over one shared store, with logical separation by convention.
- **Modular monolith:** enforce boundaries in code (module ownership, architecture tests) while
  keeping the single store and single deployment.
- **Event-first services with local read models:** each service owns a store, and cross-boundary
  reads are served from a local projection kept current by an event stream.
- **Service-oriented architecture:** each service owns a store, cross-boundary access goes through
  the owner's published service client by default, and events propagate facts rather than carrying
  the read path.

### Status quo

**Pros**

- No migration cost, no version skew, no new operational surface.

**Cons**

- Does not deliver independent deployment, which is the requirement driving the work.
- Leaves tenant isolation as a convention applied at each call site.

### Modular monolith

**Pros**

- Real boundary enforcement at compile time, at a fraction of the cost of extraction.
- No distributed-systems failure modes introduced.

**Cons**

- An architecture test cannot see SQL, so a module boundary does not stop a cross-domain join.
- Still one deployment, so cadence stays coupled.

### Event-first services with local read models

**Pros**

- A consumer answers reads without depending on the owner being reachable.
- No synchronous call path to authenticate, authorize, or operate between services.

**Cons**

- A projection is a second implementation of the owner's read logic, including its tenant isolation,
  which must be maintained in parallel and can diverge silently.
- Correctness becomes dependent on event delivery, on the tiers where the message transport is
  weakest.
- The owner cannot enumerate, reach, or repair copies of its own data, so a representation defect
  cannot be fixed centrally.

### Service-oriented architecture

**Pros**

- One implementation of each read, owned by the team that owns the rules it enforces.
- Tenant isolation is enforced once, structurally, by the owner.
- Local copies remain available where they are genuinely warranted, as a recorded exception rather
  than the default.

**Cons**

- Introduces a synchronous dependency between services, which must be authenticated, authorized,
  cached, and operated.
- Independently deployable services are independently versioned services, which means compatibility
  matrices on customer installations.

## Decision outcome

Chosen option: **service-oriented architecture**, because it keeps exactly one implementation of
each read under the ownership of the team accountable for its rules, and because putting a resource
behind exactly one owner is what makes tenant isolation enforceable in a single place rather than as
a convention repeated at every call site.

The following decisions govern what a service is and how it behaves.

1. Service boundaries `MUST` derive from data ownership, not from team structure.
2. Every resource `MUST` have exactly one owning service, and that service is the only process that
   reads or writes its data store.
3. Services `MUST` be built on the `Bitwarden.Server.Sdk` package.
4. Services `MUST` document their APIs in [OpenAPI format](https://www.openapis.org/) and conform to
   **API Standards**.
5. Services `MUST NOT` make breaking changes.
6. Services `MUST` provide a **service client** for clients and other services (a.k.a. "consumers")
   to use.
7. Service clients `SHOULD` make use of a network cache to mitigate performance issues.
   - Any cache used `MUST` be owned and invalidated by the owning service.
   - Serving results from cache `MUST NOT` bypass authorization the owning service would otherwise
     enforce.
8. Services that need to read, write, or validate data owned by another service `SHOULD` do so via
   the service's published service client.
9. A service `MAY` hold a local copy of another service's data only with a recorded justification
   (e.g. a measured hot-path volume, a stated availability requirement, etc.).
   - Any service holding a local copy `MUST` enforce the owner's row-level security on that copy and
     document the security ramifications of a stale copy (due to messaging lag, event processing
     failures, etc.).
10. Services `MUST` publish events as a matter of course using the "transactional outbox" pattern,
    regardless of whether there are any known consumers.

### Positive consequences

- A resource has one owner, so a schema change is reasoned about locally instead of across the
  entire application.
- Decision 2 makes an owning service the only reader of its own store, which is what allows tenant
  isolation to be enforced in one place instead of at every call site. The enforcement mechanism
  itself is a service implementation standard rather than one of the decisions here.
- Teams deploy on their own cadence, since a consumer depends on a published contract rather than on
  another team's build.
- Consumers write the same code on every deployment tier, because the service client resolves how a
  call is made.
- Every state change is published, so audit and future integrations are fed from one stream that
  already exists rather than from bespoke instrumentation added later.
- Local copies stay available for cases that genuinely warrant them, with the justification and the
  staleness consequences written down where the copy is introduced.

### Negative consequences

- **Version skew becomes a supported condition.** Independently deployed services mean compatibility
  matrices on customer installations, with no rollback available on a customer's own hardware.
  Decision 5 is what keeps this tractable, and it is a permanent obligation rather than a migration
  cost.
- **A synchronous dependency now exists where none did.** It has to be authenticated, authorized,
  observed, and operated, and a dependency's unavailability becomes a caller's failure mode.
- **Service-to-service authentication has to be built for cloud.** The existing internal grant has
  only ever been registered for self-hosted deployments, because cloud has had no service-to-service
  path. Decomposition creates that path.
- **Every extracted service is another process on the smallest tier.** Bitwarden Lite already runs
  nine processes on one box against an operator-supplied database, so the count of services is
  priced there before anywhere else.
- **Row-level security in the data layer is not yet portable.** The current implementation composes
  T-SQL and has no Entity Framework path. This affects structural tenant isolation generally — both
  an owning service enforcing it over its own store and decision 9's requirement that a local copy
  enforce it — so the isolation property this ADR relies on is available on SQL Server only until
  that gap is closed.
- **Caching is not uniformly available.** Neither full self-host nor Bitwarden Lite ships a shared
  cache today, so the cache in decision 7 is a cloud-only mechanism until that is addressed.

### Plan

- Publish **API Standards** as a companion page. Decision 4 references it normatively and it does
  not exist yet on this site.
- Publish a client strategy page covering how a service client is generated, wrapped, versioned, and
  cached, so decisions 6 and 7 have a single implementation pattern.
- Publish a service identity and context page covering service-to-service authentication,
  authorization by scope, and context propagation, and build the cloud service-to-service path it
  describes.
- Provide an Entity Framework path for organization scoping, so decision 9's row-level security
  requirement holds on all supported database providers.
- Provide a transactional outbox and an event transport with an implementation that does not require
  a message broker, so decision 10 holds on deployments that ship none.
- Decide the shared cache posture for full self-host and Bitwarden Lite, on which decision 7 depends
  outside cloud. The cache implementation itself is already settled by
  [ADR-0028](./0028-adopt-fusion-cache.md).
- Apply the decisions to the next service extraction as the reference implementation, and record
  divergences here rather than in that service.
