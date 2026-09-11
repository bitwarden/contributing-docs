---
adr: "0035"
status: Accepted
date: 2026-09-10
tags: [server, server-sdk]
---

# 0035 - Service-oriented architecture

<AdrTable frontMatter={frontMatter}></AdrTable>

## Notation

This ADR uses [RFC 2119](https://www.rfc-editor.org/info/rfc2119/) keywords (`MUST`, `MUST NOT`,
`SHOULD`, `SHOULD NOT`, `MAY`) deliberately. Anything marked `MUST` or `MUST NOT` is not negotiable
at team level; a team that needs an exception brings the case to the architecture group. The terms
_service_, _consumer_, _service client_, and _row-level security_ are defined in the
[service-oriented architecture standard](../service-oriented-architecture/services.md).

## Context and problem statement

The server is one monolithic application over one monolithic database. Any code path can join across
any domain, so a domain's data has no enforceable owner: the database is the integration contract,
and every team is coupled to every other team's tables. Three consequences follow:

1. A schema change cannot be reasoned about locally.
2. Organization scoping is applied by convention at each call site.
3. No team can deploy on its own cadence.

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
- Independently deployable services are independently versioned services, which means compatibility
  matrices on customer installations.

## Decision outcome

Chosen option: **Service-Oriented Architecture**

The rules are published as the
[service-oriented architecture standard](../service-oriented-architecture/services.md). That page is
the living reference: its rules evolve by pull request without superseding this decision, and this
ADR is superseded only if the model itself changes. The rules at adoption:

1. Service boundaries `MUST` derive from data ownership, not from team structure.
2. Every resource `MUST` have exactly one owning service, and that service is the only process that
   reads or writes its data store.
3. Services `MUST` be built on the `Bitwarden.Server.Sdk` package.
4. Services `MUST` document their APIs in [OpenAPI format](https://www.openapis.org/) and conform to
   **API Standards**.
5. Services `MUST NOT` make breaking changes. Changes that _would_ be breaking `MUST` follow the API
   versioning process as outlined by API Standards.
6. Services `MUST` provide a **service client** for consumers.
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
10. Services `MUST` publish events for every state change using the "transactional outbox" pattern,
    regardless of whether there are any known consumers.

### Positive consequences

- A resource has one owner, so a schema change is reasoned about locally.
- A single owning process makes organization scoping enforceable in one place.
- Teams deploy on their own cadence against a published contract.
- Consumers write the same code on every deployment tier; the service client resolves how a call is
  made.
- Audit and future integrations read one event stream that already exists.
- Local copies stay available where warranted, with the justification and the staleness consequences
  recorded where the copy is introduced.

### Negative consequences

- **Version skew becomes a supported condition.** Independently deployed services mean compatibility
  matrices on customer installations, with no rollback available on a customer's own hardware. Rule
  5 keeps this tractable, and it is a permanent obligation.
- **A synchronous dependency now exists where none did.** It has to be authenticated, authorized,
  observed, and operated, and a dependency's unavailability becomes a caller's failure mode.
- **Service-to-service authentication has to be built for cloud.** The existing internal grant has
  only ever been registered for self-hosted deployments.
- **Every extracted service is another process on the smallest tier.** Bitwarden Lite already runs
  nine processes on one box against an operator-supplied database, so service count is priced there
  first.
- **Row-level security in the data layer is not yet portable.** The current implementation composes
  T-SQL and has no Entity Framework path, so the enforcement this ADR relies on is available on SQL
  Server only until that gap is closed.
- **Caching is not uniformly available.** Neither full self-host nor Bitwarden Lite ships a shared
  cache today, so rule 7's cache is cloud-only until that is addressed.

### Plan

- Publish **API Standards**. Rules 4 and 5 reference it normatively and it does not exist yet on
  this site.
- Publish a client strategy page covering how a service client is generated, wrapped, versioned, and
  cached.
- Publish a service identity and context page covering service-to-service authentication,
  authorization by scope, and context propagation, and build the cloud path it describes.
- Provide an Entity Framework path for organization scoping, so rule 9 holds on all supported
  database providers.
- Provide a transactional outbox and a broker-free event transport, so rule 10 holds on deployments
  that ship no broker.
- Decide the shared cache posture for full self-host and Bitwarden Lite. The cache implementation is
  settled by [ADR-0028](./0028-adopt-fusion-cache.md).
- Apply the standard to the next service extraction as the reference implementation.
