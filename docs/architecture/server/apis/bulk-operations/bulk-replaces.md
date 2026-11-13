# Bulk replaces

Notation follows the [APIs index](../index.md#notation).

Bulk replaces are the equivalent of [updating](../updating-resources.md) each resource in `data` -
`PUT` called once per resource, with the same "completely replace" semantics.

- Each item `MUST` carry its `id`.
- Services that implement [optimistic concurrency](../optimistic-concurrency.md) `MUST` check each
  item's `version`. A mismatch is a `409` failure of that item.
- If the single-resource `PUT` supports create-or-update, a bulk replace `MAY` as well.

**Example**

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
        "email": "bob@example.com",
        "name": "Bob Smith",
        "version": "4"
      },
      "id": "62bed180-1f78-45d4-8a56-c996936a2947",
      "type": "user"
    },
    {
      "attributes": {
        "email": "alice@example.com",
        "name": "Alice Jones",
        "version": "7"
      },
      "id": "cacba8c1-29fa-4018-8950-acd400ec76b7",
      "type": "user"
    }
  ]
}
```
