---
adr: "0035"
status: Accepted
date: 2026-09-11
tags: [server, server-sdk]
---

# 0035 - Internal API standards

<AdrTable frontMatter={frontMatter}></AdrTable>

## Notation

This ADR uses [RFC 2119](https://www.rfc-editor.org/info/rfc2119/) keywords (`MUST`, `MUST NOT`,
`SHOULD`, `SHOULD NOT`, `MAY`) deliberately. Anything marked `MUST` or `MUST NOT` is not negotiable
at team level; a team that needs an exception brings the case to the architecture group.

**Internal API** means a service-to-service API: one Bitwarden service calling another. Bitwarden's
existing public API is out of scope and is not changing.

## Context and problem statement

Service-to-service APIs are new. As server functionality is decomposed into independently deployable
services, a service calling another service needs a wire contract, and no documented standard
exists.

One important distinction to keep in mind as we consider various options is that the APIs we are
talking about are _internal_ APIs. We control both the service that declares them and every client
that consumes them. While we _do_ still want to adhere to the principle of "no breaking changes", we
also do not want that to result in an ever-growing number of optional fields that ultimately make
these contracts less clear.

In the same way we [refactor our code mercilessly](https://wiki.c2.com/?RefactorMercilessly), we
want the liberty to be able to do the same with our APIs. Especially when they are still under
active development and rapidly evolving.

Said differently, we do not want the rules that restrict how public-facing APIs may evolve to
restrict how, or the pace at which, we evolve internal-only APIs.

## Considered options

- **Adopt the existing public API conventions:** apply the same shape and the same no-versioning
  posture to internal APIs.
- **Keep the existing JSON shape and add versioning:** retain today's conventions, introduce path
  versioning.
- **Adopt [JSON:API](https://jsonapi.org/) strictly:** implement the specification in full,
  including its media type and `relationships` objects, and add versioning.
- **Adopt [JSON:API](https://jsonapi.org/) selectively:** implement most of the specification but
  don't worry about 100% compliance, and add versioning.

### Adopt the existing public API conventions

**Pros**

- One shape across every Bitwarden API, public and internal.
- Nothing new for engineers to learn, and no migration for code already written this way.

**Cons**

- Carries over the no-versioning posture, which forces additive-only evolution on APIs whose callers
  we control.
- Its envelope is undocumented and answers only pagination. `object` and `data` exist only as
  properties on a response model class, so anything else the response needs to carry has nowhere
  defined to go.
- The convention is not written down. A standard that exists only as precedent cannot be cited in
  review, generated from, or enforced.

### Keep the existing JSON shape and add versioning

**Pros**

- Solves the versioning problem.
- Smallest change from current practice.

**Cons**

- Leaves us maintaining a proprietary standard. The questions an API standard answers (document
  shape, metadata, errors, pagination, filtering, sparse responses, and so on) are not
  Bitwarden-specific. Where a public specification already proposes answers to these common
  questions, our time and energy is better spent adopting it.
- The remaining gaps have to be filled by us, individually, as each one is discovered.

### Adopt JSON:API strictly

**Pros**

- It is a public specification, not house style. Registered as a media type in 2013, now at v1.1,
  revised in the open, with implementations across major languages.
- It answers almost every question an API standard faces, not just the obvious ones: document shape,
  resource identity, pagination, filtering, sorting, sparse responses, compound documents, metadata,
  and errors.
- Responses standardize where to find the resource `type`, `id`, and `attributes`, which enables
  generic tooling over the entire API surface.
- Error responses are richly described to facilitate both human-readable details and a
  [JSON Pointer](https://www.rfc-editor.org/info/rfc6901/) that identifies the exact member of the
  request that failed (which, again, enables generic tooling).

**Cons**

- In code, model objects are typically "flat"; on the JSON:API wire, they are nested inside `data`
  and `attributes` envelopes. A good framework will mask these envelopes from the actual classes
  developers work with, but a direct projection will result in request and response models that feel
  awkward.
- Parts of the specification are a real implementation burden for little return (e.g.
  `relationships` objects, with their resource linkage and related-resource links).
- Every API must advertise that it accepts and returns the `application/vnd.api+json` media type,
  which inevitably creates problems for clients that expect to send and receive `application/json`.
  Advertising `application/json` while still accepting `application/vnd.api+json` is only available
  to us because we are not claiming full conformance.

### Adopt JSON:API selectively

**Pros**

- Almost all the pros of [Adopt JSON:API strictly](#adopt-jsonapi-strictly) with just one con.

**Cons**

- Our APIs will walk like and talk like JSON:API but are not _quite_ JSON:API, which could be
  surprising to a human. It is hard to imagine any negative impact to the machine that consumes
  them.

## Decision outcome

Chosen option: **Adopt JSON:API selectively with versioning**.

- We believe an established standard, with thoughtful answers to every API question, will be more
  robust than any standard we might invent ourselves. It is widely adopted among some of the largest
  SaaS vendors in the industry including [ART19](https://marketplace.apilayer.com/art19_content-api)
  (an Amazon company) and [Datadog](https://docs.datadoghq.com/api/latest).
- We feel strongly that internal APIs should be formally versioned. Without formal versioning, every
  change must be additive, which means the shape can never change and every new field is optional.
  Contracts constrained like that get weaker over time, and what we _want_ to express eventually
  cannot be expressed, because we have committed ourselves to "additive changes only". This rules
  out adopting the existing public API conventions, which are expressly unversioned.
- We adopt the standard selectively to get most of the benefits of JSON:API without the burden of
  full conformance.

The specific standards, including where we deviate from JSON:API, are published here:
[Internal API standards](../service-oriented-architecture/internal-api-standards.md). That page is
the living reference: its rules evolve by pull request without superseding this decision, and this
ADR is superseded only if the model itself changes.

### Positive consequences

- One document shape across every internal API, so a consumer calling five services learns one error
  format, one pagination scheme, and one filter grammar.
- Versioning gives a contract a way to change shape. A breaking change becomes a new version with a
  migration, instead of more optional parameters.
- The envelope gives pagination state and other response metadata somewhere to live that is not
  mixed into the resource.
- Decisions we would otherwise have to make are already made, in public, by a specification that has
  been maturing since 2013.

### Negative consequences

- Internal APIs "look different" from public APIs.
- Additional work is required to ensure the "envelopes" are largely transparent to developers when
  working with request and response models in code.
- Partial conformance invites any deviation from the specification to be argued as allowed. We will
  mitigate this by documenting the specific exceptions; we will comply with all other aspects of the
  specification.

### Plan

- Build out the framework that makes the JSON:API "envelope tax" disappear from daily development.
- Publish a standard for authentication, authorization, and how the current organization travels
  with a request.
- Publish a standard for jobs, the resource a `202 Accepted` returns.

## References

- [Appibase Docs](https://appibase.com/docs)
- [ART19 Content API](https://marketplace.apilayer.com/art19_content-api)
- [Bitwarden Public API](https://bitwarden.com/help/public-api)
- [JSON:API — Active Ants ShopAPI v3](https://developer.activeants.com/docs/shopapi/v3/general-concepts/jsonapi)
- [JSON:API Overview — Catalio](https://catalio.ai/docs/json-api-overview)
- [JSON:API specification](https://jsonapi.org/)
- [Public API](https://contributing.bitwarden.com/getting-started/server/public-api)
