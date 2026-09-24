---
adr: "0036"
status: Proposed
date: 2026-09-22
tags: [server, server-sdk]
---

# 0036 - Service-to-service API standards

<AdrTable frontMatter={frontMatter}></AdrTable>

## Notation

This ADR uses [RFC 2119](https://www.rfc-editor.org/info/rfc2119/) keywords (`MUST`, `MUST NOT`,
`SHOULD`, `SHOULD NOT`, `MAY`) deliberately. Anything marked `MUST` or `MUST NOT` is not negotiable
at team level; a team that needs an exception brings the case to the architecture group.

**Service-to-service API** means one Bitwarden service calling another. Bitwarden's existing public
API is out of scope and is not changing.

## Context and problem statement

[ADR-0035](./0035-service-oriented-architecture.md) establishes that services communicate through
published APIs and that service-to-service APIs conform to a forthcoming set of standards. As more
server functionality is decomposed into independently deployable services, the number of
service-to-service APIs, and the number of teams building and consuming them, will grow. No
documented standard for them exists today.

Without one, every team answers the same questions independently, and a consumer calling five
services learns five error formats, five pagination schemes, and five ways to filter. The
conventions that exist today live in precedent rather than in writing, so they cannot be cited in
review, generated from, or enforced.

The existing conventions are also a poor fit to adopt as-is. They were shaped by constraints of APIs
whose callers we do not control, such as additive-only evolution and no formal versioning. With
service-to-service APIs we control both the service that declares an API and every client that
consumes it. We still want to avoid breaking changes, but we do not want that goal to produce an
ever-growing number of optional fields that make contracts less clear over time. The standards we
need are therefore likely to look very different from the conventions of our existing APIs.

A well-defined API is much more than an HTTP verb, a path, and a JSON payload. It spells out exactly
how it is called and what the caller can expect in return, on both the happy path and every other
path. To be useful, the standards have to be comprehensive. At a minimum, they need to address:

- **Authentication and authorization:** how a caller proves its identity, how a service authorizes
  an operation, and how the current organization travels with a request.
- **API descriptions:** how APIs are documented in OpenAPI, including stable operation identifiers
  for generated clients.
- **API paths:** how paths are structured and named.
- **Breaking changes and versioning:** what constitutes a breaking change and how an API evolves
  when one is unavoidable.
- **Unrecognized fields, query parameters, and headers:** how a service responds to input it does
  not understand, including after a rollback.
- **JSON:** the shape of request and response documents and how values are serialized.
- **Naming conventions:** casing and naming of resources, fields, and parameters.
- **Content negotiation:** which media types are accepted and returned, and what happens when a
  requested type cannot be honored.
- **Standard responses:** which status codes are returned and when, including the commonly confused
  cases (400 vs. 422, 403 vs. 404, 404 vs. 422, 500 vs. 503).
- **Resource fields and standard fields:** the fields every resource carries and the names used for
  common fields such as creation and modification timestamps.
- **Verbs:** which HTTP verbs are used for which operations.
- **Creating resources:** request and response shapes for creation.
- **Reading resources:** reading one resource and reading many.
- **Updating resources:** full replacement and partial updates.
- **Optimistic concurrency:** how conflicting concurrent updates are detected and rejected.
- **Deleting resources:** hard deletes and soft deletes.
- **Acting upon resources:** operations that do not fit cleanly into create, read, update, and
  delete.
- **Filtering:** a consistent filter grammar, including multi-value parameters and ranges.
- **Paging:** offset/limit and cursor-style paging.
- **Sorting:** how callers request an order.
- **Sparse fieldsets:** how callers request only the fields they need.
- **Advanced queries:** how richer queries are expressed when simple filters are not enough.
- **Bulk operations:** updating and deleting many resources in one request.
- **Request validation:** what is validated, when, and how failures are reported.
- **Errors:** a single error format that is both human-readable and machine-actionable.
- **Jobs:** how asynchronous work is accepted and its progress reported.
- **Deprecation:** how an API or version is marked for removal and communicated to consumers.

## Considered options

- **No documented standards:** each team designs its service-to-service APIs as it sees fit,
  following existing precedent where it exists.
- **Documented standards:** publish a comprehensive set of standards that every service-to-service
  API conforms to.

### No documented standards

**Pros**

- No up-front investment in writing standards.
- Teams are free to design each API around its immediate needs.

**Cons**

- Every team answers the same questions independently, and the answers diverge.
- Consumers must learn each service's conventions separately.
- Precedent cannot be cited in review, generated from, or enforced.
- Conventions shaped by APIs whose callers we do not control carry over to APIs whose callers we do.

### Documented standards

**Pros**

- One set of answers across every service-to-service API, so consumers learn them once.
- Standards can be cited in review, relied upon by generated clients and shared tooling, and applied
  consistently by engineers and AI agents alike.
- Standards can be designed for APIs whose callers we control, rather than inherited from APIs whose
  callers we do not.

**Cons**

- Writing and maintaining comprehensive standards takes time and effort.
- Service-to-service APIs will likely look different from our existing APIs.

## Decision outcome

Chosen option: **Documented standards**.

Service-to-service APIs `MUST` conform to a comprehensive, documented set of standards covering, at
a minimum, the topics listed above. The standards will be published separately as a living
reference: their rules evolve by pull request without superseding this decision, and this ADR is
superseded only if the decision to have documented standards itself changes.

### Positive consequences

- Consumers learn one error format, one pagination scheme, one filter grammar, and so on, across
  every service-to-service API.
- Decisions are made once, in writing, rather than repeatedly and inconsistently by each team.
- Consistent contracts enable generated clients and generic tooling over the entire
  service-to-service API surface.

### Negative consequences

- Service-to-service APIs will "look different" from existing APIs.
- The standards require ongoing ownership and maintenance.

### Plan

- Publish the service-to-service API standards, addressing every topic listed above.
- Build the framework support in `Bitwarden.Server.Sdk` that makes conforming to the standards the
  path of least resistance.
