---
sidebar_position: 20
---

# Deleting resources

- HTTP verb `MUST` be `DELETE`.
- API path `SHOULD` be like `/api/v1/{resource plural}/{id}`.

**Example**

```
DELETE /api/v1/users/62bed180-1f78-45d4-8a56-c996936a2947
```

**Success responses**

Upon success, APIs `SHOULD` return `204` but `MAY` return `202`.

| Status           | Description                              | Response                                                        |
| ---------------- | ---------------------------------------- | --------------------------------------------------------------- |
| `202 Accepted`   | The resource is scheduled to be deleted. | The [job](./jobs.md) that was scheduled to delete the resource. |
| `204 No Content` | The resource was deleted.                | Nothing.                                                        |

## Soft deletes

Services `MAY` support "soft deletes" for any number of reasons. Services that do, `SHOULD` follow
the following guidelines:

- Delete APIs perform a soft delete by default and read-many APIs exclude soft-deletes by default.
- Read-one APIs `SHOULD` return `404` for a soft-deleted resource unless the caller passes
  `includeDeleted=true`.
- If callers can request that a delete be "hard", callers pass `permanent=true` query parameter.
- If callers can request that soft-deletes be included in responses, callers pass
  `includeDeleted=true` query parameter.
- Soft-deleted resources `SHOULD` carry a `deletedAt` field.

**Examples**

```
DELETE /api/v1/users/62bed180-1f78-45d4-8a56-c996936a2947?permanent=true
GET /api/v1/users?includeDeleted=true
```
