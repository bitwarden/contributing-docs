---
sidebar_position: 23
---

# Advanced queries

`filter` parameters cannot express arbitrary combinations of "and" and "or", and long expressions
exceed practical URL lengths. APIs that need richer queries `MUST` offer a search operation that
carries the expression in the body.

- The method `MUST` be `POST`, and the path `MUST` be `/api/v1/{resource plural}:search`.
- The expression `MUST` be written in JSON Logic, in a top-level `filter` field. Only these
  operators are supported: `var`, `==`, `!=`, `>`, `>=`, `<`, `<=`, `in` (membership or substring),
  `and` and `or` (two or more terms each), and `!`.
- A request using any other operator, or referencing a field the API does not support, `MUST` be
  rejected with `422`.
- On success, APIs `MUST` return `200`, and the response `MUST` have the same shape as the
  equivalent read-many response, including [paging](./paging.md) and [sorting](./sorting.md).

```http
POST /api/v1/users:search?page[size]=50&sort=-createdAt
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

JSON Logic is adopted for its notation only. Its full operator set includes control flow, iteration,
and arithmetic, none of which belong in a query. It is preferred to a string grammar such as OData's
`$filter` because a JSON object is built and parsed without string handling, and composing a filter
by concatenating strings is how injection bugs happen.

The same notation selects resources for [bulk operations](./bulk-operations.md#targeting).

The `:search` syntax is credited to [Google AIP-136](https://google.aip.dev/136), and the query
notation to [JSON Logic](https://jsonlogic.com/).
