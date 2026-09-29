# Service-to-service API standards

In general, RESTful APIs are resource-oriented and do one of 4 things:

- **Create** a resource.
- **Read** a resource.
- **Update** a resource.
- **Delete** a resource.

This is the familiar CRUD paradigm and, while there will always be exceptions, developers `SHOULD`
strive to think in these terms for every API created. Both for simplicity and consistency.

There is, however, a 5th type of API that doesn't cleanly fit the CRUD paradigm:

- **Act** upon a resource.

Each of these, except read, also has a [bulk](./bulk-operations.md) form that applies it to many
resources at once. Standards for each type of API are documented on their own pages.

## JSON:API {#jsonapi}

Service-to-service APIs are based on top of [JSON:API](https://jsonapi.org/) unless otherwise noted
in these standards. Where our standards are silent, JSON:API standards are assumed.

## Well-defined APIs

A well-defined API spells out exactly how it should be called and what the caller can expect in
return - for both the happy path and the not-so-happy path. Developers `SHOULD` strive to think in
terms of resources and be on guard against **API proliferation** that can result from over-tailoring
APIs to the unique needs of this caller or that.

In general, it is better to have one API that can be called two different ways (e.g. query
parameters) than two APIs that can only be called one way.

## Notation

The keywords `MUST`, `MUST NOT`, `SHOULD`, `SHOULD NOT`, and `MAY` are to be interpreted as
described in [RFC 2119](https://www.rfc-editor.org/info/rfc2119/).

## Contents

- [Authentication and authorization](./authentication-and-authorization.md)
- [OpenAPI](./openapi.md)
  - [Operation identifiers](./openapi.md#operation-identifiers)
- [API paths](./api-paths.md)
- [Breaking changes and versioning](./breaking-changes-and-versioning.md)
- [Unrecognized fields, query parameters, and headers](./unrecognized-fields-query-parameters-and-headers.md)
- [JSON](./json.md)
- [Naming conventions](./naming-conventions.md)
- [Content negotiation](./content-negotiation.md)
- [Standard responses](./standard-responses.md)
  - [400 vs. 422](./standard-responses.md#400-vs-422)
  - [403 vs. 404](./standard-responses.md#403-vs-404)
  - [404 vs. 422](./standard-responses.md#404-vs-422)
  - [500 vs. 503](./standard-responses.md#500-vs-503)
- [Resource fields](./resource-fields.md)
- [Standard fields](./standard-fields.md)
- [Verbs](./verbs.md)
- [Creating resources](./creating-resources.md)
- [Read many](./read-many.md)
- [Read one](./read-one.md)
- [Updating resources](./updating-resources.md)
- [Partial updates](./partial-updates.md)
- [Optimistic concurrency](./optimistic-concurrency.md)
- [Deleting resources](./deleting-resources.md)
  - [Soft deletes](./deleting-resources.md#soft-deletes)
- [Acting upon resources](./acting-upon-resources.md)
- [Filtering](./filtering.md)
  - [Multi-value parameters](./filtering.md#multi-value-parameters)
  - [Ranges](./filtering.md#ranges)
  - [Examples](./filtering.md#examples)
- [Paging](./paging.md)
  - [Offset/limit style paging](./paging.md#offsetlimit-style-paging)
  - [Cursor-style paging](./paging.md#cursor-style-paging)
- [Sorting](./sorting.md)
- [Sparse fieldsets](./sparse-fieldsets.md)
- [Advanced queries](./advanced-queries.md)
- [Bulk operations](./bulk-operations.md)
  - [Targeting](./bulk-operations.md#targeting)
  - [Per-resource rules](./bulk-operations.md#per-resource-rules)
  - [All-or-nothing and best-effort](./bulk-operations.md#all-or-nothing-and-best-effort)
  - [Synchronous and asynchronous](./bulk-operations.md#synchronous-and-asynchronous)
  - [Choosing semantics](./bulk-operations.md#choosing-semantics)
  - [Bulk responses](./bulk-operations.md#bulk-responses)
  - [Bulk creates](./bulk-operations.md#bulk-creates)
  - [Bulk updates](./bulk-operations.md#bulk-updates)
  - [Bulk replaces](./bulk-operations.md#bulk-replaces)
  - [Bulk deletes](./bulk-operations.md#bulk-deletes)
  - [Bulk actions](./bulk-operations.md#bulk-actions)
- [Request validation](./request-validation.md)
- [Errors](./errors.md)
- [Jobs](./jobs.md)
- [Deprecation](./deprecation.md)
- [Divergences from JSON:API](./divergences-from-jsonapi.md)
- [Frequently asked questions](./frequently-asked-questions.md)
