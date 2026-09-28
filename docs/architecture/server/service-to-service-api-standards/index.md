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

Each of these, except read, also has a bulk form that applies it to many resources at once.
Standards for each type of API are documented on their own pages.

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

> **Note**: The following table of contents represents every topic we intend to provide a standard
> for. Linked topics have standards; unlinked topics represent topics for which a standard will be
> forthcoming.

- Authentication and authorization
- OpenAPI
  - Operation identifiers
- [API paths](./api-paths.md)
- Breaking changes and versioning
- Unrecognized fields, query parameters, and headers
- JSON
- Naming conventions
- Content negotiation
- Standard responses
  - 400 vs. 422
  - 403 vs. 404
  - 404 vs. 422
  - 500 vs. 503
- Resource fields
- Standard fields
- [Verbs](./verbs.md)
- [Creating resources](./creating-resources.md)
- [Read many](./read-many.md)
- [Read one](./read-one.md)
- [Updating resources](./updating-resources.md)
- Partial updates
- Optimistic concurrency
- [Deleting resources](./deleting-resources.md)
  - [Soft deletes](./deleting-resources.md#soft-deletes)
- Acting upon resources
- Filtering
  - Multi-value parameters
  - Ranges
  - Examples
- Paging
  - Offset/limit style paging
  - Cursor-style paging
- Sorting
- Sparse fieldsets
- Advanced queries
- Bulk operations
  - Targeting
  - Per-resource rules
  - All-or-nothing and best-effort
  - Synchronous and asynchronous
  - Choosing semantics
  - Bulk responses
  - Bulk creates
  - Bulk updates
  - Bulk replaces
  - Bulk deletes
  - Bulk actions
- Request validation
- Errors
- Jobs
- Deprecation
- Divergences from JSON:API
- Frequently asked questions
