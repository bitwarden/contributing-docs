# Verbs

Notation follows the [APIs index](./index.md#notation).

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

The verb semantics are credited to [RFC 9110](https://www.rfc-editor.org/info/rfc9110/) HTTP
Semantics.
