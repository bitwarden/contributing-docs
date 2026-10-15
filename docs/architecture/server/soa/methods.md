# Methods

APIs `MUST` use the standard method semantics of
[RFC 9110](https://www.rfc-editor.org/info/rfc9110/):

- `GET` fetches a resource. It is safe and idempotent, and never changes state.
- `POST` [creates](./creating-resources.md) a resource.
- `PUT` [replaces](./updating-resources.md) a resource completely, and is also how create-or-update
  is done.
- `PATCH` [partially updates](./partial-updates.md) a resource.
- `DELETE` [deletes](./deleting-resources.md) a resource.

The only exceptions are [actions](./acting-upon-resources.md),
[advanced queries](./advanced-queries.md), and [bulk operations](./bulk-operations.md), which use
`POST` whether or not they create anything.
