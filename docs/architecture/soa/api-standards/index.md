# API standards

## Scope

Currently, these standards apply only to new APIs developed in new services. Bitwarden's existing
public API is out of scope and is not changing. APIs we must implement that conform to some external
standard (e.g. webhooks, OpenTelemetry, health checks) are also not subject to these standards.

## Overview

[ADR-0036](../../adr/0036-service-to-service-api-standards.md) requires service-to-service APIs to
conform to a documented set of standards. These are those standards.

As set out in ADR-0039, the standards are self-contained: every rule is stated here, and no rule is
incorporated by reference. Where an IETF RFC covers a topic, the standards adopt it as published,
and where they keep their own answer instead, they record why. Conventions taken from other
specifications are credited to their source.

## General

In general, RESTful APIs are resource-oriented and do one of 4 things:

- [Create a resource](./creating-resources.md)
- [Read a resource](./reading-resources.md#read-many)
- [Update a resource](./updating-resources.md)
- [Delete a resource](./deleting-resources.md)

This is the familiar CRUD paradigm and, while there will always be exceptions, developers `SHOULD`
strive to think in these terms for every API created. Both for simplicity and consistency.

We do recognize, however, that not every API will fit cleanly into this CRUD paradigm. APIs that
[“act” upon resources](./acting-upon-resources.md) and [bulk-processing](./bulk-operations.md) APIs
are two notable examples. Standards for every pattern are described below.

### Well-defined APIs

A well-defined API spells out exactly how it should be called and what the caller can expect in
return - for both the happy path and possible error paths. Developers are encouraged to think in
terms of resources and be on guard against **API proliferation** that can result from over-tailoring
APIs to the unique needs of this caller or that.

In general, it is better to have one API per resource that can be called two different ways (e.g.
query parameters) than two APIs that can only be called one way.

### Notation

The keywords `MUST`, `MUST NOT`, `SHOULD`, `SHOULD NOT`, and `MAY` are to be interpreted as
described in [RFC 2119](https://www.rfc-editor.org/info/rfc2119/).

## Authentication and authorization

How a caller proves its identity, how a service authorizes an operation, and how the current
organization travels with a request are the subject of a forthcoming standard.

## Contents

### Contracts

- [OpenAPI](./openapi.md)
- [Operation identifiers](./openapi.md#operation-identifiers)
- [API paths](./api-paths.md)
- [Which identifiers belong in the path](./api-paths.md#which-identifiers-belong-in-the-path)
- [Working across several scopes](./api-paths.md#working-across-several-scopes)
- [Breaking changes and versioning](./breaking-changes-and-versioning.md)
- [Unrecognized fields, query parameters, and headers](./unrecognized-fields-query-parameters-and-headers.md)
- [Deprecation](./deprecation.md)

### Payloads and responses

- [Payload shape](./payload-shape.md)
- [Envelope](./payload-shape.md#envelope)
- [Resource fields](./payload-shape.md#resource-fields)
- [JSON](./json.md)
- [Naming conventions](./naming-conventions.md)
- [Standard fields](./standard-fields.md)
- [Content negotiation](./content-negotiation.md)
- [Standard responses](./standard-responses.md)
- [Request validation](./request-validation.md)
- [Errors](./errors.md)

### Operations

- [Verbs](./verbs.md)
- [Creating resources](./creating-resources.md)
- [Reading resources](./reading-resources.md)
- [Updating resources](./updating-resources.md)
- [Partial updates](./partial-updates.md)
- [Optimistic concurrency](./optimistic-concurrency.md)
- [Deleting resources](./deleting-resources.md)
- [Soft deletes](./deleting-resources.md#soft-deletes)
- [Acting upon resources](./acting-upon-resources.md)

### Querying

- [Filtering](./filtering.md)
- [Multi-value parameters](./filtering.md#multi-value-parameters)
- [Ranges](./filtering.md#ranges)
- [Paging](./paging.md)
- [Sorting](./sorting.md)
- [Sparse fieldsets](./sparse-fieldsets.md)
- [Advanced queries](./advanced-queries.md)

### Bulk and asynchronous work

- [Bulk operations](./bulk-operations.md)
- [Targeting](./bulk-operations.md#targeting)
- [Per-resource rules](./bulk-operations.md#per-resource-rules)
- [All-or-nothing and best-effort](./bulk-operations.md#all-or-nothing-and-best-effort)
- [Synchronous and asynchronous](./bulk-operations.md#synchronous-and-asynchronous)
- [Bulk responses](./bulk-operations.md#bulk-responses)
- [Bulk creates](./bulk-operations.md#bulk-creates)
- [Bulk updates](./bulk-operations.md#bulk-updates)
- [Bulk replaces](./bulk-operations.md#bulk-replaces)
- [Bulk deletes](./bulk-operations.md#bulk-deletes)
- [Bulk actions](./bulk-operations.md#bulk-actions)
- [Jobs](./jobs.md)

## Sources

These standards are our own: every rule is stated on this page, and none depends on another
document. Where a rule adopts or adapts a published specification, the source is credited here.

- [RFC 9110 HTTP Semantics](https://www.rfc-editor.org/info/rfc9110/): methods, status codes, and
  their meanings.
- [JSON:API](https://jsonapi.org/format/): the resource shape (`data`, `type`, `id`, `attributes`,
  `meta`), the error object, the `filter`, `page`, `sort`, and `fields` query parameters, and `lid`.
- [Google AIP-136](https://google.aip.dev/136): the `:verb` syntax for collection operations such as
  `:search` and `:bulk-create`.
- [RFC 7396 JSON Merge Patch](https://www.rfc-editor.org/info/rfc7396/): the semantics of partial
  updates and bulk updates, with the departure noted below.
- [RFC 6901 JSON Pointer](https://www.rfc-editor.org/info/rfc6901/): `source.pointer` in errors.
- [RFC 6902 JSON Patch](https://www.rfc-editor.org/info/rfc6902/): adding or removing elements of a
  collection.
- [RFC 7240 Prefer](https://www.rfc-editor.org/info/rfc7240/): requesting asynchronous processing.
- [RFC 9745 Deprecation](https://www.rfc-editor.org/info/rfc9745/),
  [RFC 8594 Sunset](https://www.rfc-editor.org/info/rfc8594/), and
  [RFC 8288 Web Linking](https://www.rfc-editor.org/info/rfc8288/): announcing deprecation and
  naming the replacement.
- [JSON Logic](https://jsonlogic.com/): the notation for advanced queries.
- [ISO 8601](https://en.wikipedia.org/wiki/ISO_8601): dates and times.
- [RFC 2119](https://www.rfc-editor.org/info/rfc2119/): the keywords `MUST`, `SHOULD`, and `MAY`.

### Where we depart from an RFC

Where an RFC covers a topic, these standards adopt it unless there is a reason not to. Each
departure, and the reasons for it, is described below.

- [Errors](./errors.md#where-we-depart-from-an-rfc)
- [Optimistic concurrency](./optimistic-concurrency.md#where-we-depart-from-an-rfc)
- [Empty strings in partial updates](./partial-updates.md#where-we-depart-from-an-rfc)
