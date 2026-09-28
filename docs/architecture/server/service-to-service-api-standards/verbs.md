---
sidebar_position: 13
---

# Verbs

APIs `MUST` use the standard verb semantics:

| Verb     | Meaning                                                                                                           |
| -------- | ----------------------------------------------------------------------------------------------------------------- |
| `DELETE` | Delete a resource.                                                                                                |
| `GET`    | Fetch a resource. Safe, idempotent, and never changes state.                                                      |
| `PATCH`  | Partially update a resource.                                                                                      |
| `POST`   | Create a resource.                                                                                                |
| `PUT`    | Update a resource with "completely replace" semantics. APIs that support create-or-update `MUST` do so via `PUT`. |

The only exceptions are [actions](./acting-upon-resources.md),
[advanced queries](./advanced-queries.md), and [bulk operations](./bulk-operations.md), which use
`POST` whether or not they create a resource.
