---
sidebar_position: 27
---

# Bulk operations

A bulk operation creates, updates, deletes, or acts upon many resources in one request. It is
shorthand for calling the corresponding single-resource API once per resource, and is never a way
around that API's [rules](#per-resource-rules).

Every bulk operation has three properties, and every combination of them is legitimate. Business
rules, data volumes, and what the caller needs back decide which combination an API implements; this
standard decides how each combination looks.

| Property                                     | Options                     | Governs                                       |
| -------------------------------------------- | --------------------------- | --------------------------------------------- |
| [Targeting](#targeting)                      | `data`, `ids`, `filter`     | How the caller names the resources.           |
| [Atomicity](#all-or-nothing-and-best-effort) | All-or-nothing, best-effort | What happens when some of the resources fail. |
| [Execution](#synchronous-and-asynchronous)   | Synchronous, asynchronous   | Whether the caller waits for the outcome.     |

Every bulk API `MUST` document, in its OpenAPI description, the targeting it accepts, the atomicity
modes it supports and which is the default, and whether it responds synchronously, asynchronously,
or both.

All bulk operations use `POST`:

| Operation                      | API path                                  | Targeting                        |
| ------------------------------ | ----------------------------------------- | -------------------------------- |
| [Bulk create](#bulk-creates)   | `/api/v1/{resource plural}:bulk-create`   | `data`                           |
| [Bulk update](#bulk-updates)   | `/api/v1/{resource plural}:bulk-update`   | `ids` or `filter`, plus `update` |
| [Bulk replace](#bulk-replaces) | `/api/v1/{resource plural}:bulk-replace`  | `data`                           |
| [Bulk delete](#bulk-deletes)   | `/api/v1/{resource plural}:bulk-delete`   | `ids` or `filter`                |
| [Bulk action](#bulk-actions)   | `/api/v1/{resource plural}:bulk-{action}` | `ids` or `filter`, plus `data`   |

## Targeting

- **`data`** is an array of resources, each shaped exactly as the corresponding single-resource API
  expects it. It is used where each resource carries its own content: creates and replaces.
- **`ids`** is an array of resource IDs.
- **`filter`** is an [advanced query](./advanced-queries.md) expression.

A request `MUST` supply exactly one form of targeting, whichever forms the operation accepts.

> **Why `ids` when a `filter` can say `{ "in": [{ "var": "id" }, [...]] }`?** Because of what
> happens to an ID that matches nothing. With `ids`, the caller named the resource, so a missing one
> is a failure and is reported back. With `filter`, the caller described a set, and a resource that
> isn't in it simply isn't in it.

- A `filter` `MUST NOT` be empty.
- `ids` and `data` `MUST NOT` name the same resource twice.
- An empty `ids` or `data` array is valid and affects nothing.
- A request carrying more items than the documented maximum `MUST` be rejected with `422`.
- Targeting `MUST NOT` widen the caller's reach. Every `ids` and `filter` is implicitly restricted
  to the current organization and to the resources the caller may see. A `filter` `MUST NOT` match a
  resource the caller should not know exists, and an ID naming such a resource `MUST` be reported
  exactly as a nonexistent one would be.

## Per-resource rules

[Targeting](#targeting) decides which resources a caller can reach. Per-resource rules decide what
the caller may do to each of them. Both always apply.

- Each targeted resource `MUST` be held to the same authorization, validation, and business rules as
  the corresponding single-resource API — including rules that depend on the resource's current
  state, such as which status transitions are allowed.
- Each resource that changes `MUST` produce the same side effects — events, notifications, audit
  records — as the single-resource API would.

A service `MAY` implement a bulk operation however it likes — including as a single set-based
statement — provided the outcome, including which resources fail and why, is indistinguishable from
applying the single-resource API's rules one resource at a time.

## All-or-nothing and best-effort

- **All-or-nothing:** no resource changes unless every resource succeeds. If any resource fails, the
  request fails and the response reports every failure, not just the first.
- **Best-effort:** each resource succeeds or fails on its own. One resource's failure `MUST NOT`
  prevent or undo another's success.

A service `MAY` support either mode or both. Callers choose with the `atomic` query parameter:
`atomic=true` for all-or-nothing, `atomic=false` for best-effort.

- A service that supports both modes `MUST` default to all-or-nothing.
- Every bulk API `MUST` recognize `atomic`, even if it supports only one mode, and `MUST` reject
  with `422` a value it does not support. Ignoring the parameter would change the outcome rather
  than merely do less — see
  [Unrecognized fields, query parameters, and headers](./unrecognized-fields-query-parameters-and-headers.md).
- Problems with the request itself — a malformed `filter`, too many items, both `ids` and `filter` —
  are not per-resource failures. They reject the whole request in either mode, before any resource
  is processed.

**Example**

```
POST /api/v1/users:bulk-delete?atomic=false
```

## Synchronous and asynchronous

- **Synchronous:** the response carries the outcome.
- **Asynchronous:** the response is `202` and a [job](./jobs.md) the caller can use to follow
  progress and collect the outcome.

A service that supports both `MUST` respond synchronously unless the caller sends
`Prefer: respond-async` ([RFC 7240](https://www.rfc-editor.org/info/rfc7240/)). A service that
honors the preference `SHOULD` return `Preference-Applied: respond-async`. A service `MAY` also
respond asynchronously, regardless of preference, to requests that exceed a documented size. Callers
`MUST` handle every response the API documents.

## Choosing semantics

| When…                                                                                               | Consider…      |
| --------------------------------------------------------------------------------------------------- | -------------- |
| A partial result would leave related resources inconsistent, or the caller treats the set as one.   | All-or-nothing |
| Each resource stands alone and the caller can report or retry individual failures (e.g. an import). | Best-effort    |
| The set is small and bounded, and each resource is cheap to process.                                | Synchronous    |
| The set is unbounded, or each resource is expensive to process (events, calls to other services).   | Asynchronous   |

## Bulk responses

**Success responses**

| Status           | Description                                                                                             | Response                                               |
| ---------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `200 OK`         | The request was processed. If all-or-nothing, every resource succeeded; if best-effort, any number did. | As described below.                                    |
| `202 Accepted`   | The request is scheduled.                                                                               | The [job](./jobs.md) that was scheduled to process it. |
| `204 No Content` | All-or-nothing only. Every resource succeeded.                                                          | Nothing.                                               |

A `200` response carries:

- `meta.affectedCount` — the number of resources that succeeded. `MUST` be present.
- `meta.failedCount` — the number of resources that failed. `MUST` be present for best-effort.
- `data` — for creates, updates, and replaces, the latest representation of each resource that
  succeeded. Bulk creates `SHOULD` return it, because the caller needs the generated IDs; other
  operations `MAY`. When present with `data` or `ids` targeting, it `MUST` follow request order.
- `errors` — best-effort only. At least one [error](./errors.md) for each resource that failed.

Each error `MUST` identify the resource that failed:

- by `source.pointer` into the request, where the resource appears there (e.g.
  `/data/2/attributes/email` or `/ids/2`), or
- by `meta.resource`, a `type` and `id`, where it does not (i.e. `filter` targeting).

An error's `status` `MUST` be what the single-resource API would have returned for that resource —
for example, `404` for an ID that doesn't exist, `409` for a version conflict, or `422` for a broken
business rule.

To correlate created resources with request items, a bulk create `MAY` accept a
[`lid`](https://jsonapi.org/format/#document-resource-object-identification) on each item. An API
that accepts `lid` `MUST` echo it on the created resource.

**Best-effort example**

```json
{
  "data": [
    {
      "attributes": {
        "email": "bob@example.com"
      },
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
      "source": {
        "pointer": "/data/1/attributes/email"
      }
    }
  ],
  "meta": {
    "affectedCount": 1,
    "failedCount": 1
  }
}
```

**All-or-nothing failure.** Nothing has changed. The response is a standard [error](./errors.md)
response carrying every failure. Its status `MUST` be `409` if every failure is a version conflict
and `422` otherwise. It is never `404`, because the resource named by the URL path — the collection
— was found.

**Asynchronous outcome.** When the job completes, it `MUST` report the same `affectedCount`,
`failedCount`, and `errors` a synchronous response would have.

## Bulk creates

Bulk creates are the equivalent of [creating](./creating-resources.md) each resource in `data`.

**Example**

```
POST /api/v1/users:bulk-create?atomic=false
Accept: application/json
Content-Type: application/json
```

```json
{
  "data": [
    {
      "attributes": {
        "email": "bob@example.com"
      },
      "lid": "bob",
      "type": "user"
    },
    {
      "attributes": {
        "email": "alice@example.com"
      },
      "lid": "alice",
      "type": "user"
    }
  ]
}
```

The [best-effort example](#bulk-responses) above is a possible response.

## Bulk updates

Bulk updates apply the same change to every targeted resource.

- `update` `MUST` be present and holds the fields being changed.
- `update` has [partial update](./partial-updates.md) semantics: an absent field is not changed and
  an explicit `null` clears the value. This holds even on services that do not otherwise offer
  `PATCH`.
- `update` `MUST` contain only fields the single-resource update accepts. A request whose `update`
  names a read-only field `MUST` be rejected with `422`. A single-resource update ignores read-only
  fields because the caller sends back the whole resource it read. In a bulk update, the caller
  names only the fields it wants changed, so a read-only field there is a request that cannot be
  honored.
- The single-resource update rules `MUST` be applied to each resource, both as it is and as it would
  be after the change.
- Bulk updates do not check [`version`](./optimistic-concurrency.md), but `MUST` increment it on
  every resource they change.

> **A bulk update is never a way around an action.** A field that changes only through
> [actions](./acting-upon-resources.md) — typically a `status` whose transitions are governed by
> business rules — is read-only, and so cannot be set by a bulk update. Changing it for many
> resources is a [bulk action](#bulk-actions) (e.g. `POST /api/v1/users:bulk-disable`), which
> applies the action's transition rules to each resource.

**Example**

```
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

## Bulk replaces

Bulk replaces are the equivalent of [updating](./updating-resources.md) each resource in `data` —
`PUT` called once per resource, with the same "completely replace" semantics.

- Each item `MUST` carry its `id`.
- Services that implement [optimistic concurrency](./optimistic-concurrency.md) `MUST` check each
  item's `version`. A mismatch is a `409` failure of that item.
- If the single-resource `PUT` supports create-or-update, a bulk replace `MAY` as well.

**Example**

```
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

## Bulk deletes

Bulk deletes are the equivalent of [deleting](./deleting-resources.md) each targeted resource.

On a service that supports [soft deletes](./deleting-resources.md#soft-deletes), a bulk delete
follows the same rules: it soft-deletes by default and hard-deletes when the caller passes
`permanent=true`.

**Example**

```
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

## Bulk actions

Bulk actions are the equivalent of invoking an [action](./acting-upon-resources.md) upon each
targeted resource.

- API path `MUST` be like `/api/v1/{resource plural}:bulk-{action}`, where `{action}` is the name of
  the single-resource action — e.g. `/api/v1/users:bulk-send-email` for
  `/api/v1/users/{id}/actions/send-email`.
- Because bulk actions share a namespace with the other bulk operations, actions `MUST NOT` be named
  `create`, `update`, `replace`, or `delete`.
- `data` holds exactly what the single-resource action would accept as its body, and is applied to
  every targeted resource. It `MAY` be omitted if the action takes no body.

**Example**

```
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

### Input that differs per resource

Actions that require per-resource bodies specify the data as an array.

- It `MUST` be used with `ids`, not `filter`, and `MUST` be the same length. `data[n]` is the body
  for `ids[n]`.
- A failure is reported against `/data/{n}`.

**Example**

```
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
