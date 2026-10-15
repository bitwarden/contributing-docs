# Paging

APIs `SHOULD` page, and those that do `MUST` support offset paging, cursor paging, or both, and
`MUST` document a maximum `page[size]`.

- **Offset paging:** `page[number]` (one-based) and `page[size]`. The response `meta` `MUST` carry
  `pageNumber` and `pageSize`, and `SHOULD` carry `pageCount` and `totalCount`.
- **Cursor paging:** `page[size]` and `page[after]`. The response `meta` `MUST` carry `pageSize`,
  `hasMore`, and `cursor`, the value to pass as `page[after]` for the next page. The final page
  `MUST` return `hasMore` as `false` and `MUST` omit `cursor`.
- A cursor `MUST` be treated as opaque. Callers `MUST NOT` construct, parse, or modify one, and a
  service `MAY` change its encoding without a new version.

Offset paging over data that changes between requests can skip or repeat resources. Cursor paging
avoids this, at the cost of no page numbers or totals.

**Offset paging example**

```http
GET /api/v1/users?page[number]=1&page[size]=2
Accept: application/json
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

**Cursor paging example**

```http
GET /api/v1/users?page[size]=2&page[after]=dXNlcnM6NjJiZWQxODA
Accept: application/json
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
    "cursor": "dXNlcnM6Y2FjYmE4YzEtMjlmYQ",
    "hasMore": true,
    "pageSize": 2
  }
}
```

The `page` parameter family is credited to [JSON:API](https://jsonapi.org/).
