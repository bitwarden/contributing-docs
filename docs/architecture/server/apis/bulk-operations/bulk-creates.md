# Bulk creates

Notation follows the [APIs index](../index.md#notation).

Bulk creates are the equivalent of [creating](../creating-resources.md) each resource in `data`.

**Example**

```http
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

The best-effort example on the [bulk responses](./bulk-responses.md) page is a possible response.
