---
adr: "0035"
status: Proposed
date: 2026-09-22
tags: [server, server-sdk]
---

# 0035 - Service-oriented architecture

<AdrTable frontMatter={frontMatter}></AdrTable>

## Notation

This ADR uses [RFC 2119](https://www.rfc-editor.org/info/rfc2119/) keywords (`MUST`, `MUST NOT`,
`SHOULD`, `SHOULD NOT`, `MAY`) deliberately. Anything marked `MUST` or `MUST NOT` is not negotiable
at team level; a team that needs an exception brings the case to the architecture group.

## Context and problem statement

The server is one monolithic application over one monolithic database. Any code path can join across
domain boundaries, leaving data with no enforceable owner. The database serves as the integration
contract, coupling teams directly to one another's tables. Three consequences follow:

1. A schema change cannot be reasoned about locally.
2. Organization scoping is applied by convention at each call site.
3. No team can deploy on its own cadence.

Every team ships on the monolith's schedule and any regression anywhere blocks everyone. As a
result, teams may respond by batching work into larger releases, which makes each release riskier to
review and harder to roll back. Independent deployment is what breaks that cycle: a team that owns
its store, its service, and its release can make whatever changes they need to make, whenever they
need to make them, without it becoming a coordinated effort.

## Considered options

- **Status quo:** one monolithic application over one monolithic shared database, with logical
  separation by convention.
- **Modular monolith:** enforce boundaries in code through module ownership and architecture tests,
  keeping the single store and single deployment.
- **Event-first services with local read models:** each service owns a store, and cross-boundary
  reads are served from a local projection kept current by an event stream.
- **Service-oriented architecture:** each service owns a store, cross-boundary access goes through
  the owner's published service client, and events propagate facts.

### Status quo

**Pros**

- No migration cost, no version skew, no new operational surface.

**Cons**

- Does not deliver independent deployment, which is the requirement driving the work.
- Leaves organization scoping as a convention applied at each call site.

### Modular monolith

**Pros**

- Real boundary enforcement at compile time, at a fraction of the cost of extraction.
- Introduces no distributed-systems failure modes.

**Cons**

- An architecture test cannot see SQL, so a module boundary does not stop a cross-domain join.
- Still one deployment, so cadence stays coupled.

### Event-first services with local read models

**Pros**

- A consumer answers reads without depending on the owner being reachable.
- No synchronous call path to authenticate, authorize, or operate between services.

**Cons**

- A projection is a second implementation of the owner's read logic, including its row-level
  security, and the two can diverge silently.
- Correctness depends on event delivery, including on the tiers where the message transport is
  weakest.
- The owner cannot enumerate, reach, or repair copies of its own data, so a representation defect
  cannot be fixed centrally.

### Service-oriented architecture

**Pros**

- One implementation of each read, owned by the team that owns the rules it enforces.
- Organization scoping is enforced once, by the owner.
- Local copies remain available where they are genuinely warranted, as a recorded exception.

**Cons**

- Introduces a synchronous dependency between services, which must be authenticated, authorized,
  cached, and operated.
- Adds latency to any read that crosses a boundary and can be particularly harmful if 1 API
  invocation turns into N calls to another service. This, however, is not unlike N+1 database
  queries that can result from a careless for loop and the same strategies used to turn N+1 database
  queries into 2 queries can usually be brought to bear for service-to-service calls, as well.
- Independently deployable services are independently versioned services, which the release pipeline
  has to keep shipping as one coordinated set.

## Decision outcome

Chosen option: **Service-oriented architecture**.

The rules:

1. Service boundaries `MUST` derive from data ownership, not from team structure.
2. Every resource `MUST` have exactly one owning service, and that service is the only process that
   reads or writes its data store.
3. Services `MUST` be built on the `Bitwarden.Server.Sdk` package.
4. Services `MUST` document their APIs in [OpenAPI format](https://www.openapis.org/) and, if the
   service is an internal service, such APIs `MUST` conform to the forthcoming **Internal API
   Standards**.
5. Services `SHOULD NOT` make breaking changes.
   - If the changes that need to be made _would_ be breaking and the service is an internal service,
     such services `SHOULD` follow the API versioning process as outlined by the forthcoming
     Internal API Standards.
   - Fixing bugs, including security issues, are not subject to this rule and `MUST` be fixed "in
     place".
6. Services `MUST` provide a **service client** for consumers.
7. Service clients `SHOULD` make use of a network cache to mitigate performance issues.
   - Any cache used `MUST` be owned and invalidated by the owning service.
   - Serving results from cache `MUST NOT` bypass authorization the owning service would otherwise
     enforce.
8. Services that need to read, write, or validate data owned by another service `SHOULD` do so via
   the owner's published service client.
9. A service `MAY` hold a local copy of another service's data only with a recorded justification
   (e.g. a measured hot-path volume, a stated availability requirement, etc.).
   - Any service holding a local copy `MUST` enforce the owner's row-level security on that data and
     document the security ramifications of stale reads (due to messaging lag, event processing
     failures, etc.).
10. Services `SHOULD` publish events for all relevant state changes using the "transactional outbox"
    pattern, regardless of whether there are any known consumers. Exactly what makes an event
    "relevant", the shape of such events, the authorization model, dead-letter policies, and how
    such events are delivered and consumed will be the subject of a forthcoming ADR and is out of
    scope here.
11. A service that owns resources whose lifetime depends on a resource owned by another service
    `MUST` consume that owner's "resource deleted" events and cascade the deletion to the resources
    it owns. An owning service is not responsible for deleting data it does not own.

### Positive consequences

- A resource has one owner, so a schema change is reasoned about locally.
- A single owning process makes organization scoping enforceable in one place.
- Teams deploy on their own cadence against a published contract.
- Consumers write the same code on every deployment tier; the service client resolves how a call is
  made.
- Audit and future integrations read one event stream that already exists.
- A data owner does not need to know which services hold data that depends on its resources.
  Dependents invert the dependency by subscribing to the owner's events, so adding a dependent
  requires no change to the owner.
- Local copies stay available where warranted, with the justification and the staleness consequences
  recorded where the copy is introduced.

### Negative consequences

- **Versioning.** Independently deployable services will likely be versioned independently as well,
  and enhancements and bug fixes will land service by service, each producing a new version of that
  service. Rule 5 ensures a new version never introduces a breaking change, so a customer may at any
  time run an "upgrade everything" script and take the latest of every service — which is exactly
  what self-host installs. Our obligation is to just make sure "the latest version of everything"
  always works.
- **A synchronous dependency now exists where none did.** It has to be authenticated, authorized,
  observed, and operated. A dependency's unavailability becomes a caller's failure mode.
- **Service-to-service authentication has to be built for cloud.** The existing internal grant has
  only ever been registered for self-hosted deployments.
- **Every extracted service is another process on the smallest tier.** Bitwarden Lite already runs
  nine processes on one box against an operator-supplied database, so service count is priced there
  first.
- **Row-level security in the data layer is not yet portable.** The current implementation composes
  T-SQL and has no Entity Framework path, so the enforcement this ADR relies on is available on SQL
  Server only until that gap is closed.
- **A cache cannot be assumed to exist.** Redis and Cosmos are both exposed through configuration
  and some self-host operators do configure one, but neither is provisioned by default and Bitwarden
  Lite ships no cache service at all. Rule 7's caching is therefore an optimization a service may
  find available, never a mechanism it can depend on being there.

### Plan

- Publish **API Standards**. Rules 4 and 5 reference it normatively and it does not exist yet on
  this site.
- Publish a client strategy page covering how a service client is generated, wrapped, versioned, and
  cached.
- Publish a service identity and context page covering service-to-service authentication,
  authorization by scope, and context propagation, and build the cloud path it describes.
- Provide an Entity Framework path for organization scoping, so rule 9 holds on all supported
  database providers.
- Provide a transactional outbox and a broker-free event transport, so rules 10 and 11 hold on
  deployments that ship no broker.
- Decide the shared cache posture for full self-host and Bitwarden Lite. The cache implementation is
  settled by [ADR-0028](./0028-adopt-fusion-cache.md).
- Apply the standard to the next service extraction as the reference implementation.
