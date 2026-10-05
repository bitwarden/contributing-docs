---
adr: "0043"
status: Proposed
date: 2026-10-05
tags: [server, server-sdk]
---

# 0043 - API standards for reading resources

<AdrTable frontMatter={frontMatter}></AdrTable>

{/* cspell:ignore ciphertext FIQL fieldsets */}

## Notation

This ADR uses [RFC 2119](https://www.rfc-editor.org/info/rfc2119/) keywords (`MUST`, `MUST NOT`,
`SHOULD`, `SHOULD NOT`, `MAY`) deliberately.

## Context and problem statement

[ADR-0036](./0036-service-to-service-api-standards.md) requires service-to-service APIs to conform
to a documented set of standards, and ADR-0039 builds those standards on IETF RFCs. This ADR sets
how resources are read: reading one and reading many, filtering, multi-value parameters and ranges,
sorting, sparse fieldsets, paging, and advanced queries. Payload shape and errors are set by
ADR-0040.

No RFC covers these topics, so the answers are ours. Most vault data is ciphertext, which cannot be
filtered or sorted, so each service declares exactly which fields can be queried.

## Considered options

- **Filtering:** `filter[{field}]` query parameters (chosen); plain `field=value` parameters, which
  collide with other parameters; OData `$filter`; RQL or FIQL.
- **Multi-value parameters:** a comma-delimited list with backslash escaping (chosen); repeated
  parameters (`?status=A&status=B`); bracket arrays (`status[]=A`); pipe-delimited values;
  percent-encoding instead of escaping.
- **Ranges:** bracket notation within one parameter (chosen); separate minimum and maximum
  parameters; operator suffixes such as `filter[age][gte]`.
- **Sorting:** one `sort` parameter with a hyphen for descending (chosen); separate `sortBy` and
  `order` parameters.
- **Sparse fieldsets:** one `fields` parameter (chosen); JSON:API's per-type `fields[TYPE]`; field
  masks.
- **Paging:** offset or cursor paging with `page[...]` parameters and metadata in `meta` (chosen);
  `offset` and `limit`; cursor paging only; a continuation token; RFC 8288 `Link` headers; OData
  `$top` and `$skip`.
- **Advanced queries:** a `:search` operation with a JSON Logic body (chosen); OData `$filter`;
  Google AIP-160's filter grammar; MongoDB-style query objects; a search body defined by each API;
  no advanced queries.

## Decision outcome

Chosen options are marked above. The parameter families `filter`, `page`, `sort`, and `fields` are
credited to [JSON:API](https://jsonapi.org/), the `:search` syntax to
[Google AIP-136](https://google.aip.dev/136), and the query notation to
[JSON Logic](https://jsonlogic.com/).

### Reading one and reading many

- The method `MUST` be `GET`.
- The path `SHOULD` be `/api/v1/{resource plural}` to read many, and
  `/api/v1/{resource plural}/{id}` to read one.
- On success, APIs `MUST` return `200` with the resource, or the array of resources, in `data`.

### Filtering

- Read-many APIs that accept search criteria `MUST` take them as `filter[{name}]` query parameters,
  where `name` `SHOULD` be a resource attribute.
- APIs `MAY` support wildcards. Those that do `MUST` support `*` for "starts with", "ends with", and
  "contains".
- APIs `MAY` filter on a nested attribute using dot notation, such as `address.city`.

### Multi-value parameters and ranges

- A parameter that accepts several values `MUST` take them as a comma-delimited list, and `MUST`
  apply "or" semantics. A single-value parameter can therefore gain multi-value support without
  changing its contract.
- On a parameter that accepts several values or a range, a comma that is part of a value `MUST` be
  escaped with a backslash, so `filter[displayName]=Smith\, Jr` is the single value `Smith, Jr`. An
  asterisk `MUST` be escaped likewise wherever wildcards are supported, and a backslash that is part
  of a value `MUST` then be escaped as `\\`. A single-value parameter is never split, so it needs no
  escaping.
- A range `MUST` be two comma-separated values, with `[` and `]` for inclusive bounds and `(` and
  `)` for exclusive bounds. `*` `MAY` stand for no limit. Ranges express "less than", "greater
  than", and their inclusive forms.

When a single-value parameter gains multi-value support, a caller sending an unescaped comma starts
sending two values. Confirm that the field's values cannot contain commas before making the change.

| Example                                                         | Meaning                          |
| --------------------------------------------------------------- | -------------------------------- |
| `filter[lastName]=Smith`                                        | Last name is "Smith".            |
| `filter[lastName]=S*`                                           | Last name begins with "S".       |
| `filter[lastName]=*mi*`                                         | Last name contains "mi".         |
| `filter[lastName]=Smith,Jones`                                  | Last name is "Smith" or "Jones". |
| `filter[failedLoginCount]=[3,*)`                                | Three or more failed logins.     |
| `filter[birthDate]=[2000-01-01T00:00:00Z,2001-01-01T00:00:00Z)` | Born in the year 2000.           |

### Sorting

APIs that support sorting `MUST` take one `sort` parameter holding a comma-delimited list of fields.
A field preceded by a hyphen `MUST` be sorted descending. For example, `sort=lastName,-createdAt`.

### Sparse fieldsets

APIs `MAY` let callers choose which fields to return. Those that do `MUST` take one `fields`
parameter holding a comma-delimited list, such as `fields=firstName,lastName`. `id` and `type` are
always returned.

### Paging

APIs `SHOULD` page, and those that do `MUST` support offset paging, cursor paging, or both.

- **Offset paging:** `page[number]` (one-based) and `page[size]`. The response `meta` `MUST` carry
  `pageCount`, `pageNumber`, `pageSize`, and `totalCount`.
- **Cursor paging:** `page[size]` and `page[after]`. The response `meta` `MUST` carry `pageSize`,
  `hasMore`, and `cursor`, the value to pass as `page[after]` for the next page. The final page
  `MUST` return `hasMore` as `false` and `MUST` omit `cursor`.
- A cursor `MUST` be treated as opaque. Callers `MUST NOT` construct, parse, or modify one, and a
  service `MAY` change its encoding without a new version.

```http
GET /api/v1/users?page[number]=1&page[size]=2
```

```json
{
  "data": [
    {
      "attributes": { "firstName": "Bob", "lastName": "Smith" },
      "id": "62bed180-1f78-45d4-8a56-c996936a2947",
      "type": "user"
    },
    {
      "attributes": { "firstName": "Alice", "lastName": "Jones" },
      "id": "cacba8c1-29fa-4018-8950-acd400ec76b7",
      "type": "user"
    }
  ],
  "meta": {
    "pageCount": 5,
    "pageNumber": 1,
    "pageSize": 2,
    "totalCount": 9
  }
}
```

### Advanced queries

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
  equivalent read-many response, including paging and sorting.

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

### Positive consequences

- Every collection is filtered, sorted, paged, and searched the same way.
- Each service declares exactly what can be queried, and rejects anything else rather than silently
  ignoring it.
- Advanced queries share their notation with bulk operations (see ADR-0046).

### Negative consequences

- The escaping rules for commas, asterisks, and backslashes are ours, and callers have to learn
  them.
- Offset paging over data that changes between requests can skip or repeat resources. Cursor paging
  avoids this, at the cost of no page numbers or totals.
- JSON Logic is unfamiliar to most engineers, and only a subset of it is allowed.
