---
sidebar_position: 26
---

# Advanced queries

The `filter` query parameters cover simple predicates, but they cannot express arbitrary `AND` and
`OR` combinations, and a long expression will exceed the practical limit on URL length. APIs that
need richer queries `MUST` expose a **search** operation that carries the expression in the request
body.

- HTTP verb `MUST` be `POST`.
- API path `MUST` be like `/api/v1/{resource plural}:search`.

The expression is written in [JSON Logic](https://jsonlogic.com/) and placed in a top-level `filter`
field. JSON Logic is adopted for its notation only. Its full operator set includes control flow,
iteration, and arithmetic, none of which belong in a query, so only the following operators are
supported:

| Operator             | Meaning                                             |
| -------------------- | --------------------------------------------------- |
| `var`                | Reference a field of the resource.                  |
| `==`, `!=`           | Equal, not equal.                                   |
| `>`, `>=`, `<`, `<=` | Numeric and date comparison.                        |
| `in`                 | Membership in a list, or a substring match.         |
| `and`, `or`          | Boolean composition, each taking two or more terms. |
| `!`                  | Negation.                                           |

A request that uses any other operator, or references a field the API does not support, `MUST` be
rejected with `422`.

**Example**

Find active or invited users whose KDF iterations are below the current minimum:

```
POST /api/v1/users:search?page[size]=50&sort=-createdAt
Accept: application/json
Content-Type: application/json
```

```json
{
  "filter": {
    "and": [
      { "<": [{ "var": "kdfIterations" }, 600000] },
      { "in": [{ "var": "status" }, ["ACTIVE", "INVITED"]] }
    ]
  }
}
```

The response `MUST` be identical in shape to the equivalent [read-many](./read-many.md) request.

[Learn more about JSON Logic](https://jsonlogic.com/)

**Success responses**

Upon success, APIs `MUST` return `200`.

| Status   | Description                | Response                                  |
| -------- | -------------------------- | ----------------------------------------- |
| `200 OK` | The search was successful. | The matching resources, paged and sorted. |
