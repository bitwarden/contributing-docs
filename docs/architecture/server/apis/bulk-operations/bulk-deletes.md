# Bulk deletes

Notation follows the [APIs index](../index.md#notation).

Bulk deletes are the equivalent of [deleting](../deleting-resources.md) each targeted resource.

On a service that supports [soft deletes](../deleting-resources.md#soft-deletes), a bulk delete
follows the same rules: it soft-deletes by default and hard-deletes when the caller passes
`permanent=true`.

**Example**

```http
POST /api/v1/users:bulk-delete
Accept: application/json
Content-Type: application/json
```

```json
{
  "filter": {
    "and": [
      { "==": [{ "var": "emailVerified" }, false] },
      { "<": [{ "var": "creationDate" }, "2026-06-01T00:00:00Z"] }
    ]
  }
}
```
