---
sidebar_position: 17
---

# Deleting resources

- The method `MUST` be `DELETE`, and the path `SHOULD` be `/api/v1/{resource plural}/{id}`.
- On success, APIs `SHOULD` return `204` but `MAY` return `202` with the [job](./jobs.md) scheduled
  to delete the resource.

## Soft deletes

Services `MAY` support soft deletes. Those that do `SHOULD` follow these rules:

- `DELETE` soft-deletes by default, and read-many APIs exclude soft-deleted resources by default.
- Read-one APIs `SHOULD` return `404` for a soft-deleted resource unless the caller passes
  `includeDeleted=true`.
- Callers request a hard delete with `permanent=true`, and ask for soft-deleted resources to be
  included with `includeDeleted=true`.
- Soft-deleted resources `SHOULD` carry `deletedBy` and `deletedAt`.

```http
DELETE /api/v1/users/62bed180-1f78-45d4-8a56-c996936a2947?permanent=true
GET /api/v1/users?includeDeleted=true
```
