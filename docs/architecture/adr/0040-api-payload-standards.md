---
adr: "0040"
status: Proposed
date: 2026-10-05
tags: [server, server-sdk]
---

# 0040 - API standards for request, response, and error payloads

<AdrTable frontMatter={frontMatter}></AdrTable>

{/* cspell:ignore Stripe */}

## Notation

This ADR uses [RFC 2119](https://www.rfc-editor.org/info/rfc2119/) keywords (`MUST`, `MUST NOT`,
`SHOULD`, `SHOULD NOT`, `MAY`) deliberately.

## Context and problem statement

[ADR-0036](./0036-service-to-service-api-standards.md) requires service-to-service APIs to conform
to a documented set of standards, and ADR-0039 builds those standards on IETF RFCs. This ADR sets
the standards every request and response shares, whatever the operation: payload shape, field
conventions, status codes, validation, and errors.

## Considered options

**Payload shape**

- **A standard envelope:** every payload is one top-level object. `data` holds a resource or an
  array of resources, and `meta` holds response metadata.
- **No standard shape:** each API decides.
- **Plain resources, with metadata in headers** such as `Link` and `X-Total-Count`.
- **Plain single resources, with a wrapper only for collections:** the `object`, `data`, and
  `continuationToken` convention of existing Bitwarden APIs.
- **Plain resources with a type discriminator,** such as a Stripe-style `object` property.

**Errors**

- **An array of error objects** in a top-level `errors` field.
- **[RFC 9457](https://www.rfc-editor.org/info/rfc9457/) Problem Details,** as published.
- **Problem Details with an `errors` extension member,** or ASP.NET Core's
  `ValidationProblemDetails`.

**Empty strings, nulls, and whitespace**

- **Treat an empty string, an absent field, and `null` alike,** and strip surrounding whitespace.
- **Preserve every string exactly,** and distinguish an empty string from `null`.

**Validation**

- **Validate exhaustively and report every failure at once.**
- **Stop at the first failure.**

## Decision outcome

Chosen options: **a standard envelope**, **an array of error objects**, **treating empty strings,
absent fields, and `null` alike**, and **exhaustive validation**. Naming, value formats, content
negotiation, methods, and status codes follow conventions with no serious competitor.

### Payload shape

- Every request and response body that carries resources `MUST` be a JSON object that holds them in
  `data`: one resource, or an array of resources.
- Response metadata, such as paging state and counts, `MUST` be placed in a top-level `meta` object.
- Every resource `MUST` carry `id` (a string, even when the identifier is numeric), `type` (the
  singular name of the resource, such as `user`), and `attributes` (everything else). The only
  exception: `id` `MUST` be omitted when creating a resource whose ID the service generates.
- Errors are carried in a top-level `errors` array, described below. Bodies that carry something
  other than resources, such as advanced queries, action bodies, bulk targeting, and JSON Patch
  documents, have shapes of their own, set by the ADRs that define them.

```json
{
  "data": {
    "attributes": {
      "firstName": "Bob",
      "lastName": "Smith"
    },
    "id": "62bed180-1f78-45d4-8a56-c996936a2947",
    "type": "user"
  }
}
```

Why this shape:

- Metadata needs somewhere to live that is not mixed into the resource, and it cannot all go into
  headers.
- One shape serves requests and responses, single resources and collections, so a caller learns it
  once.
- `id` and `type` are always present, so any resource is self-describing, and one rule ("always
  include them") is easier to remember than rules about when they may be left out.
- The envelope is a serialization concern. Handlers take and return plain models, and the framework
  in `Bitwarden.Server.Sdk` handles `data` and `attributes`.

The shape is credited to [JSON:API](https://jsonapi.org/).

### Standard fields

When relevant, resources `MUST` use these names: `createdAt`, `createdBy`, `updatedAt`, `updatedBy`,
`deletedAt`, `deletedBy` (see ADR-0044), and `version` (see ADR-0044). Dates are ISO 8601 strings,
and `*By` fields hold the ID of the user responsible.

### JSON values

- Dates `MUST` be formatted in ISO 8601 (for example `2026-01-01T00:00:00Z`), `MUST` include a time
  zone indicator, and `SHOULD` be in UTC.
- Values constrained to a fixed set `SHOULD` be enumerated in uppercase ASCII (for example `RED`,
  `GREEN`, `BLUE`) in the OpenAPI description and in examples. At runtime, APIs `MUST` ignore case
  when validating them.
- APIs `SHOULD` strip leading and trailing whitespace from strings before processing them.
- APIs `MUST` treat an empty string as if the field were not present, and `MUST` treat a field that
  is not present as `null`, except in partial updates (see ADR-0044).
- APIs `SHOULD NOT` include `null` fields in responses.

An empty string and `null` are treated alike because a distinction between them has to survive every
serializer, language, and data store a value passes through. Treating them the same removes that
class of bug.

### Naming conventions

- Field names `MUST` be camel case (for example `firstName`).
- Fields holding a date or date and time `SHOULD` end in `At` (for example `expiresAt`).
- Boolean fields `MUST NOT` be prefixed with `is` (`active`, not `isActive`).
- Fields holding the identifier of another resource `SHOULD NOT` be suffixed with `Id`. A
  string-valued `assignedTo` is self-evidently the identifier of the user it is assigned to. This
  does not apply to fields holding external identifiers.

### Content negotiation

- Services `MUST` honor the `Accept` media type and `MUST` return `406 Not Acceptable` when they
  cannot produce it.
- Services `MUST` return `415 Unsupported Media Type` when they cannot process the `Content-Type`.

### Methods

APIs `MUST` use the standard method semantics of RFC 9110:

- `GET` fetches a resource. It is safe and idempotent, and never changes state.
- `POST` creates a resource (see ADR-0042).
- `PUT` replaces a resource completely, and is also how create-or-update is done (see ADR-0044).
- `PATCH` partially updates a resource (see ADR-0044).
- `DELETE` deletes a resource (see ADR-0044).

The only exceptions are actions, advanced queries, and bulk operations, which use `POST` whether or
not they create anything (see ADR-0043, ADR-0045, and ADR-0046).

### Status codes

Status codes follow [RFC 9110](https://www.rfc-editor.org/info/rfc9110/). The following are possible
for every API, and APIs `SHOULD NOT` document them individually:

| Status | Meaning                                                                          |
| ------ | -------------------------------------------------------------------------------- |
| `400`  | The request is malformed and cannot be parsed, such as invalid JSON.             |
| `401`  | The caller is not authenticated.                                                 |
| `403`  | The caller is not authorized to invoke the API.                                  |
| `404`  | The resource named in the path does not exist, or the caller may not know of it. |
| `405`  | The HTTP method is not allowed.                                                  |
| `406`  | The API cannot return the requested media type.                                  |
| `409`  | The update conflicts with another update.                                        |
| `415`  | The API does not accept the request's media type.                                |
| `422`  | The request is invalid in a way the caller can fix.                              |
| `429`  | The caller has made too many requests.                                           |
| `500`  | An unexpected error the caller cannot fix. By definition, a bug.                 |
| `501`  | The API is stubbed out and not yet implemented.                                  |
| `503`  | A dependency is unavailable or timed out.                                        |

The commonly confused pairs:

- **`400` or `422`:** `400` when the request cannot be parsed, `422` when it parses but is invalid.
- **`403` or `404`:** `403` for a resource the caller may know exists, `404` for one it may not.
- **`404` or `422`:** `404` when the resource named in the path is not found, `422` when it is found
  but a resource referenced in the body is not.
- **`500` or `503`:** `500` for a failure inside the service, `503` for a dependency that is down,
  unreachable, or timed out.

### Request validation

Requests `MUST` be validated exhaustively before processing, and APIs `SHOULD` report every failure
at once. Validation covers:

- Every required field, parameter, and header is present, not `null`, and not an empty string.
- Every field, parameter, and header has, or converts to, its declared type.
- Field names given in `sort` or `fields` exist.
- Constrained values are among those enumerated.
- Minimum values, maximum values, and maximum lengths are respected.
- Identifiers that refer to other resources, owned by this service or another, are valid.

`Bitwarden.Server.Sdk` is expected to perform this validation so that no request reaches a handler
without conforming to its declared model.

### Errors

Errors `MUST` be returned as an array of error objects in a top-level `errors` field. Each error
has:

| Field              | Description                                                             |
| ------------------ | ----------------------------------------------------------------------- |
| `code`             | A stable, machine-readable error code.                                  |
| `detail`           | A human-readable explanation of this occurrence. May be localized.      |
| `id`               | A unique identifier for this occurrence.                                |
| `meta.resource`    | In a bulk operation, the `type` and `id` of the resource that failed.   |
| `source.header`    | The request header that caused the error.                               |
| `source.parameter` | The query parameter that caused the error.                              |
| `source.pointer`   | A JSON Pointer to the field in error, such as `/data/attributes/title`. |
| `status`           | The HTTP status code that applies, as a string.                         |
| `title`            | A short summary that does not change from occurrence to occurrence.     |

At most one `source` member applies to any one error.

```json
{
  "errors": [
    {
      "id": "9f3c1e2a-7d40-4c8b-9b17-2f5a1c6e83d1",
      "status": "422",
      "code": "resource-not-found",
      "title": "Referenced resource does not exist",
      "detail": "'e3d2eb3e-755c-41cd-86f0-0e0649043ef6' is not a group in this organization.",
      "source": {
        "pointer": "/data/attributes/groups/0"
      }
    }
  ]
}
```

A `500` response `MUST NOT` disclose anything about the failure. `title` and `detail` `MUST` be
generic and `source` `MUST` be omitted. Exception messages, stack traces, type names, connection
strings, and dependency identities belong in logs and traces. The `id` correlates a caller's report
with them.

The error object is credited to JSON:API. It departs from RFC 9457 Problem Details, for these
reasons:

- **Simpler for callers.** Every error response has one shape, whether it reports one failure or
  twenty. Problem Details needs an extension member as soon as there is more than one failure.
- **More precise.** `source` can name a query parameter or a header as well as a body field. Problem
  Details has no standard member for any of them.
- **Works for bulk operations.** The same objects report per-resource failures inside a best-effort
  `200` response (see ADR-0046). RFC 9457 advises against batching disparate problems.
- **Easier to maintain.** A `code` string identifies the error, where Problem Details uses a `type`
  URI that RFC 9457 encourages to resolve to documentation.
- **No harder to adopt.** The framework produces error responses either way.

### Positive consequences

- Every API has one payload shape and one error format, so a caller who has used one API has learned
  them all.
- Generated clients and generic tooling work across every API.
- Validation and error reporting come from the framework rather than from each handler.

### Negative consequences

- The envelope is visible to callers who call an API directly, and generators for client SDKs have
  to be configured to hide it.
- `Bit.HttpExtensions` returns Problem Details for validation failures today, so those responses
  would change format.
- Departing from RFC 9457 is a point reviewers may contest.
