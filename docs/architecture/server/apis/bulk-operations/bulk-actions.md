# Bulk actions

Notation follows the [APIs index](../index.md#notation).

Bulk actions are the equivalent of invoking an [action](../acting-upon-resources.md) upon each
targeted resource.

- API path `MUST` follow the pattern `/api/v1/{resource plural}:bulk-{action}`, where `{action}` is
  the name of the single-resource action - e.g. `/api/v1/users:bulk-send-email` for
  `/api/v1/users/{id}/actions/send-email`.
- Because bulk actions share a namespace with the other bulk operations, actions `MUST NOT` be named
  `create`, `update`, `replace`, or `delete`.
- `data` holds exactly what the single-resource action would accept as its body, and is applied to
  every targeted resource. It `MAY` be omitted if the action takes no body.

**Example**

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

## Input that differs per resource

Actions that require per-resource bodies specify the data as an array.

- It `MUST` be used with `ids`, not `filter`, and `MUST` be the same length. `data[n]` is the body
  for `ids[n]`.
- A failure is reported against `/data/{n}`.

**Example**

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
