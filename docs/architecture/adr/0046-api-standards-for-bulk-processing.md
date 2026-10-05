---
adr: "0046"
status: Proposed
date: 2026-10-05
tags: [server, server-sdk]
---

# 0046 - API standards for bulk processing resources

<AdrTable frontMatter={frontMatter}></AdrTable>

## Notation

This ADR uses [RFC 2119](https://www.rfc-editor.org/info/rfc2119/) keywords (`MUST`, `MUST NOT`,
`SHOULD`, `SHOULD NOT`, `MAY`) deliberately.

## Context and problem statement

[ADR-0036](./0036-service-to-service-api-standards.md) requires service-to-service APIs to conform
to a documented set of standards, and ADR-0039 builds those standards on IETF RFCs. This ADR sets
how many resources are created, updated, replaced, deleted, or acted upon in one request.

A bulk operation is shorthand for calling the corresponding single-resource API once per resource,
and is never a way around that API's rules. Every bulk operation has three properties, and every
combination of them is legitimate:

- **Targeting:** how the caller names the resources (`data`, `ids`, or `filter`).
- **Atomicity:** what happens when some resources fail (all-or-nothing or best-effort).
- **Execution:** whether the caller waits for the outcome (synchronous or asynchronous).

## Considered options

- **Bulk operations on the collection,** one per kind of change, as below.
- **JSON:API's Atomic Operations extension:** a list of individual operations in one request.
- **OData `$batch` or HTTP multipart batching:** many independent requests in one envelope.
- **`207 Multi-Status`** to report best-effort results.
- **No bulk APIs:** callers loop over the single-resource APIs.

## Decision outcome

Chosen option: **bulk operations on the collection**, because each one says exactly what it does,
can be authorized and validated as a whole, and can be implemented as one set-based statement where
the outcome allows. `207` is not used: it comes from WebDAV and implies an XML body, and callers
already inspect `failedCount` and `errors` to learn which resources failed.

### Operations

All bulk operations use `POST`. The `:verb` syntax is credited to
[Google AIP-136](https://google.aip.dev/136).

| Operation    | Path                                      | Targeting                        |
| ------------ | ----------------------------------------- | -------------------------------- |
| Bulk create  | `/api/v1/{resource plural}:bulk-create`   | `data`                           |
| Bulk update  | `/api/v1/{resource plural}:bulk-update`   | `ids` or `filter`, plus `update` |
| Bulk replace | `/api/v1/{resource plural}:bulk-replace`  | `data`                           |
| Bulk delete  | `/api/v1/{resource plural}:bulk-delete`   | `ids` or `filter`                |
| Bulk action  | `/api/v1/{resource plural}:bulk-{action}` | `ids` or `filter`, plus `data`   |

Every bulk API `MUST` document in OpenAPI the targeting it accepts, the atomicity modes it supports
and which is the default, and whether it responds synchronously, asynchronously, or both.

### Targeting

- `data` is an array of resources, each shaped exactly as the single-resource API expects. `ids` is
  an array of resource IDs. `filter` is an advanced query expression (see ADR-0043).
- A request `MUST` supply exactly one form of targeting among those the operation accepts.
- A `filter` `MUST NOT` be empty, and `ids` and `data` `MUST NOT` name the same resource twice. An
  empty `ids` or `data` array is valid and affects nothing.
- A request with more items than the documented maximum `MUST` be rejected with `422`.
- Targeting `MUST NOT` widen the caller's reach. Every `ids` and `filter` is restricted to the
  current organization and to the resources the caller may see, and an ID naming a resource the
  caller may not know of `MUST` be reported exactly as a nonexistent one.

`ids` exists alongside `filter` because of what happens to an ID that matches nothing. With `ids`,
the caller named the resource, so a missing one is a failure. With `filter`, the caller described a
set, and a resource outside it is simply not in it.

### Per-resource rules

- Each targeted resource `MUST` be held to the same authorization, validation, and business rules as
  the single-resource API, including rules that depend on the resource's current state.
- Each resource that changes `MUST` produce the same side effects as the single-resource API, such
  as events, notifications, and audit records.
- A service `MAY` implement a bulk operation however it likes, including as one set-based statement,
  provided the outcome, including which resources fail and why, is indistinguishable from applying
  the single-resource rules one resource at a time.

### Atomicity

- **All-or-nothing:** no resource changes unless every one succeeds, and a failure reports every
  failing resource, not just the first.
- **Best-effort:** each resource succeeds or fails on its own. One failure `MUST NOT` prevent or
  undo another resource's success.
- Callers choose with `atomic=true` or `atomic=false`. A service `MAY` support either mode or both,
  and one that supports both `MUST` default to all-or-nothing.
- Every bulk API `MUST` recognize `atomic`, even if it supports one mode, and `MUST` reject a value
  it does not support with `422`.
- Problems with the request itself, such as a malformed filter, too many items, or both `ids` and
  `filter`, reject the whole request before any resource is processed.

Prefer all-or-nothing when a partial result would leave related resources inconsistent, and
best-effort when each resource stands alone and failures can be reported or retried individually, as
in an import.

### Execution

- Synchronous responses carry the outcome. Asynchronous responses are `202` with a job (see
  ADR-0045).
- A service that supports both `MUST` respond synchronously unless the caller sends
  `Prefer: respond-async` ([RFC 7240](https://www.rfc-editor.org/info/rfc7240/)), and `SHOULD`
  return `Preference-Applied: respond-async` when it honors it. It `MAY` respond asynchronously
  regardless, to requests over a documented size.
- Callers `MUST` handle every response the API documents.

Prefer synchronous for small, bounded sets of cheap work, and asynchronous for unbounded sets or
expensive work, such as calls to other services.

### Responses

- On success, a bulk API returns `200` with the outcome, `202` with a job, or `204` (all-or-nothing
  only) when every resource succeeded and nothing needs returning.
- A `200` response carries `meta.affectedCount` (always), `meta.failedCount` (best-effort), `data`
  with the latest representation of each resource that succeeded (creates `SHOULD` return it, for
  the generated IDs, and others `MAY`), and `errors` (best-effort only) with at least one error per
  failed resource. When `data` is returned for `data` or `ids` targeting, it `MUST` follow request
  order.
- Each error `MUST` identify its resource, by `source.pointer` into the request (such as
  `/data/2/attributes/email` or `/ids/2`) or, for `filter` targeting, by `meta.resource`. Its
  `status` `MUST` be what the single-resource API would have returned, such as `404`, `409`, or
  `422`.
- An all-or-nothing failure changes nothing and returns a standard error response with every
  failure. Its status `MUST` be `409` if every failure is a version conflict and `422` otherwise,
  never `404`, because the collection named in the path was found.
- When an asynchronous job completes, it `MUST` report the same counts and errors a synchronous
  response would have.
- A bulk create `MAY` accept a `lid` on each item to correlate created resources with request items.
  An API that accepts `lid` `MUST` echo it. `lid` is credited to [JSON:API](https://jsonapi.org/).

```http
POST /api/v1/users:bulk-create?atomic=false
Content-Type: application/json
```

```json
{
  "data": [
    { "attributes": { "email": "bob@example.com" }, "lid": "bob", "type": "user" },
    { "attributes": { "email": "alice@example.com" }, "lid": "alice", "type": "user" }
  ]
}
```

```json
{
  "data": [
    {
      "attributes": { "email": "bob@example.com" },
      "id": "62bed180-1f78-45d4-8a56-c996936a2947",
      "lid": "bob",
      "type": "user"
    }
  ],
  "errors": [
    {
      "id": "9f3c1e2a-7d40-4c8b-9b17-2f5a1c6e83d1",
      "status": "422",
      "code": "email-in-use",
      "title": "Email address is already in use",
      "detail": "'alice@example.com' is already a user in this organization.",
      "source": { "pointer": "/data/1/attributes/email" }
    }
  ],
  "meta": { "affectedCount": 1, "failedCount": 1 }
}
```

### Operation-specific rules

- **Bulk update** applies the same change to every targeted resource. `update` `MUST` be present and
  has partial-update semantics, even on services that do not otherwise offer `PATCH`. It `MUST`
  contain only fields the single-resource update accepts, and naming a read-only field `MUST` be
  rejected with `422`. A single-resource update ignores read-only fields because the caller sends
  back the whole resource it read, but a bulk update names only the fields to change, so a read-only
  field there is a request that cannot be honored. Update rules `MUST` hold for each resource both
  before and after the change. Bulk updates do not check `version`, but `MUST` change it on every
  resource they change. A field that changes only through an action cannot be bulk-updated, so
  changing it for many resources is a bulk action.
- **Bulk replace** is `PUT` once per resource. Each item `MUST` carry its `id`, services that check
  versions `MUST` check each item's `version` (a mismatch is a `409` for that item), and a bulk
  replace `MAY` create resources if the single-resource `PUT` can.
- **Bulk delete** follows the single-resource rules, including soft deletes and `permanent=true`
  (see ADR-0044).
- **Bulk action** paths use the single-resource action's name, as in `/api/v1/users:bulk-send-email`
  for `/api/v1/users/{id}/actions/send-email`. `data` holds the body the action accepts and applies
  to every targeted resource, and `MAY` be omitted if the action takes none. Where each resource
  needs its own body, `data` `MUST` be an array used with `ids`, not `filter`, of the same length,
  with `data[n]` the body for `ids[n]` and failures reported against `/data/{n}`.

### Positive consequences

- Bulk operations behave exactly like their single-resource counterparts, so authorization,
  validation, and side effects cannot be bypassed by going bulk.
- Callers choose all-or-nothing or best-effort, and synchronous or asynchronous, explicitly.
- Per-resource failures are reported in the same error format as everything else.

### Negative consequences

- Every bulk API has to implement and document three properties, and test the combinations it
  supports.
- Matching set-based implementations to one-at-a-time outcomes takes care, particularly for
  failures.
