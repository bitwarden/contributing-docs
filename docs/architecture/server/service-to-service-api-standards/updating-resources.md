---
sidebar_position: 14
---

# Updating resources

- The method `MUST` be `PUT`, with complete-replacement semantics, and the path `SHOULD` be
  `/api/v1/{resource plural}/{id}`.
- APIs that support create-or-update `MUST` do so through `PUT`.
- If the request's `type` is not that of the resource named in the path, or its `id` is not the one
  in the path, the API `MUST` return `422`. This applies to [partial updates](./partial-updates.md)
  too.
- Resources `SHOULD` carry `updatedBy` and `updatedAt`.
- On success, APIs `SHOULD` return `200`, or `201` if the request created the resource, but `MAY`
  return `202` or `204`. A `200` or `201` carries the latest representation of the resource, a `202`
  the [job](./jobs.md) scheduled to update it, and a `204` nothing.

`PUT` is preferred because it is simpler to implement, far more common, and suits the
read-modify-write pattern client teams already use. Services that offer `PATCH` usually end up
offering `PUT` too, which is two endpoints doing the same thing.

Conflicting updates are detected with [optimistic concurrency](./optimistic-concurrency.md).
