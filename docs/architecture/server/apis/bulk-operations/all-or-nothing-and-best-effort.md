# All-or-nothing and best-effort

Notation follows the [APIs index](../index.md#notation).

- **All-or-nothing:** no resource changes unless every resource succeeds. If any resource fails, the
  request fails and the response reports every failure, not just the first.
- **Best-effort:** each resource succeeds or fails on its own. One resource's failure `MUST NOT`
  prevent or undo another's success.

A service `MAY` support either mode or both. Callers choose with the `atomic` query parameter:
`atomic=true` for all-or-nothing, `atomic=false` for best-effort.

- A service that supports both modes `MUST` default to all-or-nothing.
- Every bulk API `MUST` recognize `atomic`, even if it supports only one mode, and `MUST` reject
  with `422` a value it does not support. Ignoring the parameter would change the outcome rather
  than merely do less - see
  [Unrecognized fields, query parameters, and headers](../unrecognized-fields-query-parameters-and-headers.md).
- Problems with the request itself - a malformed `filter`, too many items, both `ids` and `filter` -
  are not per-resource failures. They reject the whole request in either mode, before any resource
  is processed.

**Example**

```http
POST /api/v1/users:bulk-delete?atomic=false
```
