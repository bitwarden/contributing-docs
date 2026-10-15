# Bulk operations

A bulk operation creates, updates, replaces, deletes, or acts upon many resources in one request. It
is shorthand for calling the corresponding single-resource API once per resource, and is never a way
around that API's rules. Every bulk operation has three properties, and every combination of them is
legitimate:

- **[Targeting](#targeting):** how the caller names the resources (`data`, `ids`, or `filter`).
- **[Atomicity](#atomicity):** what happens when some resources fail (all-or-nothing or
  best-effort).
- **[Execution](#execution):** whether the caller waits for the outcome (synchronous or
  asynchronous).

## Operations

All bulk operations use `POST`.

| Operation    | Path                                      | Targeting                        |
| ------------ | ----------------------------------------- | -------------------------------- |
| Bulk create  | `/api/v1/{resource plural}:bulk-create`   | `data`                           |
| Bulk update  | `/api/v1/{resource plural}:bulk-update`   | `ids` or `filter`, plus `update` |
| Bulk replace | `/api/v1/{resource plural}:bulk-replace`  | `data`                           |
| Bulk delete  | `/api/v1/{resource plural}:bulk-delete`   | `ids` or `filter`                |
| Bulk action  | `/api/v1/{resource plural}:bulk-{action}` | `ids` or `filter`, plus `data`   |

Every bulk API `MUST` document in OpenAPI the targeting it accepts, the atomicity modes it supports
and which is the default, and whether it responds synchronously, asynchronously, or both.

Each operation says exactly what it does, can be authorized and validated as a whole, and can be
implemented as one set-based statement where the outcome allows. The `:verb` syntax is credited to
[Google AIP-136](https://google.aip.dev/136).

## Targeting

- `data` is an array of resources, each shaped exactly as the single-resource API expects. `ids` is
  an array of resource IDs. `filter` is an [advanced query](./advanced-queries.md) expression.
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

## Per-resource rules

- Each targeted resource `MUST` be held to the same authorization, validation, and business rules as
  the single-resource API, including rules that depend on the resource's current state.
- Each resource that changes `MUST` produce the same side effects as the single-resource API, such
  as events, notifications, and audit records.
- A service `MAY` implement a bulk operation however it likes, including as one set-based statement,
  provided the outcome, including which resources fail and why, is indistinguishable from applying
  the single-resource rules one resource at a time.

## Atomicity

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

```http
POST /api/v1/users:bulk-delete?atomic=false
```

## Execution

- Synchronous responses carry the outcome. Asynchronous responses are `202` with a [job](./jobs.md).
- A service that supports both `MUST` respond synchronously unless the caller sends
  `Prefer: respond-async` ([RFC 7240](https://www.rfc-editor.org/info/rfc7240/)), and `SHOULD`
  return `Preference-Applied: respond-async` when it honors it. It `MAY` respond asynchronously
  regardless, to requests over a documented size.
- Callers `MUST` handle every response the API documents.

Prefer synchronous for small, bounded sets of cheap work, and asynchronous for unbounded sets or
expensive work, such as calls to other services.

## Responses

- On success, a bulk API returns `200` with the outcome, `202` with a job, or `204` (all-or-nothing
  only) when every resource succeeded and nothing needs returning.
- A `200` response carries `meta.affectedCount`, the number of resources that succeeded (always),
  `meta.failedCount`, the number of resources that failed (best-effort), `data` with the latest
  representation of each resource that succeeded (creates `SHOULD` return it, for the generated IDs,
  and others `MAY`), and `errors` (best-effort only) with at least one error per failed resource.
  When `data` is returned for `data` or `ids` targeting, it `MUST` follow request order.
- Each [error](./errors.md) `MUST` identify its resource, by `source.pointer` into the request (such
  as `/data/2/attributes/email` or `/ids/2`) or, for `filter` targeting, by `meta.resource`. Its
  `status` `MUST` be what the single-resource API would have returned, such as `404`, `409`, or
  `422`.
- An all-or-nothing failure changes nothing and returns a standard error response with every
  failure. Its status `MUST` be `409` if every failure is a version conflict and `422` otherwise,
  never `404`, because the collection named in the path was found.
- When an asynchronous job completes, it `MUST` report the same counts and errors a synchronous
  response would have.
- A bulk create `MAY` accept a `lid` on each item to correlate created resources with request items.
  An API that accepts `lid` `MUST` echo it. `lid` is credited to [JSON:API](https://jsonapi.org/).

`207 Multi-Status` is not used: it comes from WebDAV and implies an XML body, and callers already
inspect `failedCount` and `errors` to learn which resources failed.

**Best-effort example**

A possible response to the [bulk create example](#bulk-create):

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

## Operation-specific rules

### Bulk create

A bulk create is the equivalent of creating each resource in `data`.

```http
POST /api/v1/users:bulk-create?atomic=false
Accept: application/json
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

### Bulk update

A bulk update applies the same change to every targeted resource. `update` `MUST` be present and has
[partial-update](./partial-updates.md) semantics, even on services that do not otherwise offer
`PATCH`. It `MUST` contain only fields the single-resource update accepts, and naming a read-only
field `MUST` be rejected with `422`. A single-resource update ignores read-only fields because the
caller sends back the whole resource it read, but a bulk update names only the fields to change, so
a read-only field there is a request that cannot be honored. Update rules `MUST` hold for each
resource both before and after the change. Bulk updates do not check `version`, but `MUST` change it
on every resource they change. A field that changes only through an action cannot be bulk-updated,
so changing it for many resources is a bulk action.

```http
POST /api/v1/users:bulk-update
Accept: application/json
Content-Type: application/json
```

```json
{
  "filter": {
    "in": [{ "var": "department" }, ["Eng", "R&D"]]
  },
  "update": {
    "department": "Engineering"
  }
}
```

### Bulk replace

A bulk replace is `PUT` once per resource. Each item `MUST` carry its `id`, services that check
versions `MUST` check each item's `version` (a mismatch is a `409` for that item), and a bulk
replace `MAY` create resources if the single-resource `PUT` can.

```http
POST /api/v1/users:bulk-replace
Accept: application/json
Content-Type: application/json
```

```json
{
  "data": [
    {
      "attributes": {
        "firstName": "Bob",
        "lastName": "Smith",
        "version": "4"
      },
      "id": "62bed180-1f78-45d4-8a56-c996936a2947",
      "type": "user"
    },
    {
      "attributes": {
        "firstName": "Alice",
        "lastName": "Jones",
        "version": "7"
      },
      "id": "cacba8c1-29fa-4018-8950-acd400ec76b7",
      "type": "user"
    }
  ]
}
```

### Bulk delete

A bulk delete follows the single-resource rules, including
[soft deletes](./deleting-resources.md#soft-deletes) and `permanent=true`.

```http
POST /api/v1/users:bulk-delete
Accept: application/json
Content-Type: application/json
```

```json
{
  "filter": {
    "and": [
      { "==": [{ "var": "status" }, "INVITED"] },
      { "<": [{ "var": "invitedAt" }, "2026-06-01T00:00:00Z"] }
    ]
  }
}
```

### Bulk action

Bulk action paths `MUST` be like `/api/v1/{resource plural}:bulk-{action}`, where `{action}` is the
name of the single-resource [action](./acting-upon-resources.md), as in
`/api/v1/users:bulk-send-email` for `/api/v1/users/{id}/actions/send-email`. `data` holds the body
the action accepts and applies to every targeted resource, and `MAY` be omitted if the action takes
none.

```http
POST /api/v1/users:bulk-send-email
Accept: application/json
Content-Type: application/json
```

```json
{
  "ids": ["62bed180-1f78-45d4-8a56-c996936a2947", "cacba8c1-29fa-4018-8950-acd400ec76b7"],
  "data": {
    "subject": "Hello",
    "body": "World!"
  }
}
```

Where each resource needs its own body, `data` `MUST` be an array used with `ids`, not `filter`, of
the same length, with `data[n]` the body for `ids[n]` and failures reported against `/data/{n}`.

```http
POST /api/v1/users:bulk-send-email
Accept: application/json
Content-Type: application/json
```

```json
{
  "ids": ["62bed180-1f78-45d4-8a56-c996936a2947", "cacba8c1-29fa-4018-8950-acd400ec76b7"],
  "data": [
    {
      "subject": "Hello.",
      "body": "Hi, John!"
    },
    {
      "subject": "Hello",
      "body": "Hi, Mary!"
    }
  ]
}
```
