---
sidebar_position: 11
---

# Resource fields

Every resource `MUST` include the following fields:

| Field        | Description                                                                      | Type     |
| ------------ | -------------------------------------------------------------------------------- | -------- |
| `attributes` | Details about the resource.                                                      | `object` |
| `id`         | The unique ID of the resource. Even if the ID is numeric, it `MUST` be a string. | `string` |
| `type`       | The _singular_ name of the resource (e.g. `user`).                               | `string` |

The only exception is when a resource is being created via `POST`, or via a
[bulk create](./bulk-operations.md#bulk-creates), against an API that will generate the ID. In this
case, the `id` field `MUST` be omitted.
