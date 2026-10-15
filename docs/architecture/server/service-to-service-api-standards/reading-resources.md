---
sidebar_position: 13
---

# Reading resources

- The method `MUST` be `GET`.
- The path `SHOULD` be `/api/v1/{resource plural}` to read many, and
  `/api/v1/{resource plural}/{id}` to read one.
- On success, APIs `MUST` return `200` with the resource, or the array of resources, in `data`.

Read-many APIs are narrowed, ordered, and divided with [filtering](./filtering.md),
[sorting](./sorting.md), [sparse fieldsets](./sparse-fieldsets.md), and [paging](./paging.md).
Queries that these cannot express use an [advanced query](./advanced-queries.md).

Each service declares exactly which fields can be queried, because every query it supports has to be
indexed and authorized.
