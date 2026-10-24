# Advanced queries

Notation follows the [APIs index](./index.md#notation).

The `filter` query parameters cover simple predicates, but they cannot express arbitrary `AND` and
`OR` combinations, and a long expression will exceed the practical limit on URL length. APIs that
need richer queries `MUST` expose a **search** operation that carries the expression in the request
body.

- HTTP verb `MUST` be `POST`.
- API path `MUST` follow the pattern `/api/v1/{resource plural}:search`.

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

JSON Logic is used rather than OData's `$filter` because:

1. OData's `$filter` is a string expression language, so both building and parsing it require string
   handling where JSON is already right there.
2. Composing a filter by concatenating strings means quoting and escaping, which is how injection
   bugs happen. Composing a JSON object does not.
3. OData brings a great deal more than filtering - metadata documents, `$expand`, batch, its own
   conventions - and we only want the filtering.

**Example**

Find users whose PBKDF2 key derivation function (KDF) iterations are below the current minimum:

```http
POST /api/v1/users:search?page[size]=50&sort=-creationDate
Accept: application/json
Content-Type: application/json
```

```json
{
  "filter": {
    "and": [
      { "<": [{ "var": "kdfIterations" }, 600000] },
      { "==": [{ "var": "kdf" }, "PBKDF2_SHA256"] }
    ]
  }
}
```

The response `MUST` be identical in shape to the equivalent
[read-many](./reading-resources.md#read-many) request.

[Learn more about JSON Logic](https://jsonlogic.com/)

**Success responses**

Upon success, APIs `MUST` return `200`.

| Status   | Description                | Response                                  |
| -------- | -------------------------- | ----------------------------------------- |
| `200 OK` | The search was successful. | The matching resources, paged and sorted. |

The same notation selects resources for [bulk operations](./bulk-operations/targeting.md).

The `:search` syntax is credited to [Google AIP-136](https://google.aip.dev/136), and the query
notation to [JSON Logic](https://jsonlogic.com/).
