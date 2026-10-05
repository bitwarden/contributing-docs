---
adr: "0044"
status: Proposed
date: 2026-10-05
tags: [server, server-sdk]
---

# 0044 - API standards for updating and deleting resources

<AdrTable frontMatter={frontMatter}></AdrTable>

## Notation

This ADR uses [RFC 2119](https://www.rfc-editor.org/info/rfc2119/) keywords (`MUST`, `MUST NOT`,
`SHOULD`, `SHOULD NOT`, `MAY`) deliberately.

## Context and problem statement

[ADR-0036](./0036-service-to-service-api-standards.md) requires service-to-service APIs to conform
to a documented set of standards, and ADR-0039 builds those standards on IETF RFCs. This ADR sets
how resources are updated, how conflicting updates are detected, and how resources are deleted.
Payload shape and errors are set by ADR-0040.

## Considered options

- **Updates:** `PUT` with complete replacement, partial updates discouraged and done with `PATCH`
  where supported (chosen); `PATCH` only, as in JSON:API; both `PUT` and `PATCH` required on every
  resource; [RFC 6902](https://www.rfc-editor.org/info/rfc6902/) JSON Patch as the partial-update
  format; field masks, as in Google AIP-134; no partial updates at all.
- **Optimistic concurrency:** a `version` field and `409 Conflict` (chosen);
  [RFC 9110](https://www.rfc-editor.org/info/rfc9110/) conditional requests (`ETag`, `If-Match`,
  `412`); comparing `updatedAt` timestamps; last write wins.
- **Deletes:** `DELETE`, with a convention for soft deletes where a service needs them (chosen);
  hard deletes only; soft deletes through a status field and actions.

## Decision outcome

Chosen options are marked above.

### Updating resources

- The method `MUST` be `PUT`, with complete-replacement semantics, and the path `SHOULD` be
  `/api/v1/{resource plural}/{id}`.
- APIs that support create-or-update `MUST` do so through `PUT`.
- Resources `SHOULD` carry `updatedBy` and `updatedAt`.
- On success, APIs `SHOULD` return `200`, or `201` if the request created the resource, but `MAY`
  return `202` or `204`. A `200` or `201` carries the latest representation of the resource, a `202`
  the job scheduled to update it (see ADR-0045), and a `204` nothing.

`PUT` is preferred because it is simpler to implement, far more common, and suits the
read-modify-write pattern client teams already use. Services that offer `PATCH` usually end up
offering `PUT` too, which is two endpoints doing the same thing.

### Partial updates

- Services `SHOULD NOT` support partial updates. A service that does `MUST` use `PATCH`.
- In a partial update, an absent field means "do not change", and an explicit `null` clears the
  value.
- On success, APIs `SHOULD` return `200` but `MAY` return `202` or `204`.
- To add or remove one element of a collection, an action (see ADR-0045) is simpler and preferred,
  as in `POST /api/v1/groups/{id}/actions/add-collection`. APIs `MAY` instead implement RFC 6902
  JSON Patch.

These semantics are credited to [RFC 7396](https://www.rfc-editor.org/info/rfc7396/) JSON Merge
Patch, with one departure. RFC 7396 stores an empty string as an empty string. These standards treat
an empty string as not present, so the field is left unchanged. The reasons:

- **One rule everywhere.** An empty string means "not present" in every request (see ADR-0040).
  Following RFC 7396 would make partial updates the only exception.
- **Nothing lost.** A caller can still set a value, clear it with `null`, or leave it unchanged by
  omitting it. Only storing an empty string cannot be expressed, and these standards never store
  one.
- **Just as easy to adopt.** A caller using a standard merge patch library is unaffected unless it
  sends an empty string.

### Optimistic concurrency

- APIs that update resources `SHOULD` detect conflicting updates. Those that do `MUST` use a
  `version` field marked `required` and not `readOnly`.
- `version` `SHOULD` be an integer incremented on every successful update, and `MUST` be formatted
  as a string whatever its value.
- If the value sent does not match the stored version, the API `MUST` return `409 Conflict`.
- On every successful update, the API `MUST` change the version.

This departs from RFC 9110's conditional requests, for these reasons:

- **Described by the same RFC.** RFC 9110 gives this exact case as its example of `409`: a
  representation sent with `PUT` that conflicts with an earlier change, where versioning is in use.
  Conditional requests are an alternative, not a requirement.
- **Simpler for callers.** The version is part of the resource the caller already reads and sends
  back. There is no header to capture and replay, and generated clients expose it as an ordinary
  property.
- **Works for bulk operations.** A bulk replace carries many resources, each with its own version.
  One `If-Match` header cannot.
- **Travels with the data.** The version stays with the resource in events, local copies, logs, and
  caches.
- **Nothing lost.** A service can still return `ETag` for HTTP caching.

### Deleting resources

- The method `MUST` be `DELETE`, and the path `SHOULD` be `/api/v1/{resource plural}/{id}`.
- On success, APIs `SHOULD` return `204` but `MAY` return `202` with the job scheduled to delete the
  resource.

Services `MAY` support soft deletes. Those that do `SHOULD` follow these rules:

- `DELETE` soft-deletes by default, and read-many APIs exclude soft-deleted resources by default.
- Read-one APIs `SHOULD` return `404` for a soft-deleted resource unless the caller passes
  `includeDeleted=true`.
- Callers request a hard delete with `permanent=true`, and ask for soft-deleted resources to be
  included with `includeDeleted=true`.
- Soft-deleted resources `SHOULD` carry `deletedBy` and `deletedAt`.

```http
DELETE /api/v1/users/62bed180-1f78-45d4-8a56-c996936a2947?permanent=true
GET /api/v1/users?includeDeleted=true
```

### Positive consequences

- Updates follow one simple model that generated clients and client teams already understand.
- Lost updates are detected with an ordinary field, which works the same way for single and bulk
  updates.
- Soft deletes, where a service has them, behave the same way everywhere.

### Negative consequences

- A caller changing one field of a large resource sends the whole resource.
- Two departures from RFCs, the empty-string rule and the `version` field, need explaining to anyone
  who expects RFC 7396 or conditional requests.
