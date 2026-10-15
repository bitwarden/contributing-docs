# Service-to-service API standards

## Notation

The keywords `MUST`, `MUST NOT`, `SHOULD`, `SHOULD NOT`, and `MAY` are to be interpreted as
described in [RFC 2119](https://www.rfc-editor.org/info/rfc2119/).

## Overview

[ADR-0036](../../adr/0036-service-to-service-api-standards.md) requires service-to-service APIs to
conform to a documented set of standards. These are those standards.

As set out in ADR-0039, the standards are self-contained: every rule is stated here, and no rule is
incorporated by reference. Where an IETF RFC covers a topic, the standards adopt it as published,
and where they keep their own answer instead, they record why. Conventions taken from other
specifications are credited to their source.

## Modeling operations

Most operations create, read, update, or delete a resource. Some do not fit, such as sending an
email, disabling a user, or rotating a key. These are [actions](./acting-upon-resources.md).

- APIs `SHOULD` be modeled as creating, reading, updating, and deleting resources wherever they can,
  and as actions only where an operation does not fit.
- APIs `SHOULD` guard against proliferation from tailoring them to individual callers. One API that
  can be called two ways, for example through query parameters, is better than two APIs that can
  each be called one way.

Creates, updates, deletes, and actions each also have a [bulk](./bulk-operations.md) form that
applies them to many resources at once.

## Contents

### Contracts

- [OpenAPI](./openapi.md)
  - [Operation identifiers](./openapi.md#operation-identifiers)
- [API paths](./api-paths.md)
  - [Subject and scope](./api-paths.md#subject-and-scope)
- [Breaking changes and versioning](./breaking-changes-and-versioning.md)
- [Unrecognized fields, query parameters, and headers](./unrecognized-fields-query-parameters-and-headers.md)
- [Deprecation](./deprecation.md)

### Payloads and responses

- [Payload shape](./payload-shape.md)
- [JSON values](./json-values.md)
- [Naming conventions](./naming-conventions.md)
- [Standard fields](./standard-fields.md)
- [Content negotiation](./content-negotiation.md)
- [Standard responses](./standard-responses.md)
  - [Commonly confused status codes](./standard-responses.md#commonly-confused-status-codes)
- [Request validation](./request-validation.md)
- [Errors](./errors.md)

### Operations

- [Methods](./methods.md)
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
  - [Multi-value parameters and ranges](./filtering.md#multi-value-parameters-and-ranges)
- [Paging](./paging.md)
- [Sorting](./sorting.md)
- [Sparse fieldsets](./sparse-fieldsets.md)
- [Advanced queries](./advanced-queries.md)

### Bulk and asynchronous work

- [Bulk operations](./bulk-operations.md)
  - [Targeting](./bulk-operations.md#targeting)
  - [Per-resource rules](./bulk-operations.md#per-resource-rules)
  - [Atomicity](./bulk-operations.md#atomicity)
  - [Execution](./bulk-operations.md#execution)
  - [Responses](./bulk-operations.md#responses)
  - [Bulk create](./bulk-operations.md#bulk-create)
  - [Bulk update](./bulk-operations.md#bulk-update)
  - [Bulk replace](./bulk-operations.md#bulk-replace)
  - [Bulk delete](./bulk-operations.md#bulk-delete)
  - [Bulk action](./bulk-operations.md#bulk-action)
- [Jobs](./jobs.md)

Authentication and authorization, including how the current organization travels with a request,
will be covered by a later standard.
