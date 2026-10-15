# Reading resources

- The method `MUST` be `GET`.
- The path `SHOULD` be `/api/v1/{resource plural}` to read many, and
  `/api/v1/{resource plural}/{id}` to read one.
- On success, APIs `MUST` return `200` with the resource, or the array of resources, in `data`.

**Read many example**

```http
GET /api/v1/users
Accept: application/json
```

```json
{
  "data": [
    {
      "attributes": {
        "firstName": "Bob",
        "lastName": "Smith"
      },
      "id": "62bed180-1f78-45d4-8a56-c996936a2947",
      "type": "user"
    },
    {
      "attributes": {
        "firstName": "Alice",
        "lastName": "Jones"
      },
      "id": "cacba8c1-29fa-4018-8950-acd400ec76b7",
      "type": "user"
    }
  ]
}
```

**Read one example**

```http
GET /api/v1/users/62bed180-1f78-45d4-8a56-c996936a2947
Accept: application/json
```

```json
{
  "data": {
    "attributes": {
      "firstName": "Bob",
      "lastName": "Smith"
    },
    "id": "62bed180-1f78-45d4-8a56-c996936a2947",
    "type": "user"
  }
}
```

Read-many APIs are narrowed, ordered, and divided with [filtering](./filtering.md),
[sorting](./sorting.md), [sparse fieldsets](./sparse-fieldsets.md), and [paging](./paging.md).
Queries that these cannot express use an [advanced query](./advanced-queries.md).

Each service declares exactly which fields can be queried, because every query it supports has to be
indexed and authorized.
