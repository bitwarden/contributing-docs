# Targeting

Notation follows the [APIs index](../index.md#notation).

- `data` is an array of items, used where each resource carries its own content. For creates and
  replaces, each item is a resource shaped exactly as the corresponding single-resource API expects
  it. For
  [actions whose body differs per resource](./bulk-actions.md#input-that-differs-per-resource), each
  item is the target's `id` and the action's `body`.
- `ids` is an array of resource IDs.
- `filter` is an [advanced query](../advanced-queries.md) expression.

A request `MUST` supply exactly one form of targeting, whichever forms the operation accepts.

`ids` exists alongside `filter`, even though a filter can say `{ "in": [{ "var": "id" }, [...]] }`,
because of what happens to an ID that matches nothing. With `ids`, the caller named the resource, so
a missing one is a failure and is reported back. With `filter`, the caller described a set, and a
resource that is not in it simply is not in it.

- A `filter` `MUST NOT` be empty.
- `ids` and `data` `MUST NOT` name the same resource twice.
- An empty `ids` or `data` array is valid and affects nothing.
- A request carrying more items than the documented maximum `MUST` be rejected with `422`.
- Targeting `MUST NOT` widen the caller's reach. Every `ids` and `filter` is implicitly restricted
  to the current organization and to the resources the caller may see. A `filter` `MUST NOT` match a
  resource the caller should not know exists, and an ID naming such a resource `MUST` be reported
  exactly as a nonexistent one would be.
