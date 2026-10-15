---
sidebar_position: 15
---

# Partial updates

- Services `SHOULD NOT` support partial updates. A service that does `MUST` use `PATCH`.
- In a partial update, an absent field means "do not change", and an explicit `null` clears the
  value.
- On success, APIs `SHOULD` return `200` but `MAY` return `202` or `204`.
- To add or remove one element of a collection, an [action](./acting-upon-resources.md) is simpler
  and preferred, as in `POST /api/v1/groups/{id}/actions/add-collection`. APIs `MAY` instead
  implement [RFC 6902](https://www.rfc-editor.org/info/rfc6902/) JSON Patch.

**Example**

```http
PATCH /api/v1/users/62bed180-1f78-45d4-8a56-c996936a2947
Accept: application/json
Content-Type: application/json
```

```json
{
  "data": {
    "attributes": {
      "firstName": "Bobby"
    },
    "id": "62bed180-1f78-45d4-8a56-c996936a2947",
    "type": "user"
  }
}
```

These semantics are credited to [RFC 7396](https://www.rfc-editor.org/info/rfc7396/) JSON Merge
Patch, with one departure. RFC 7396 stores an empty string as an empty string. These standards treat
an empty string as not present, so the field is left unchanged. The reasons:

- **One rule everywhere.** An empty string means "not present" in every request (see
  [JSON values](./json-values.md)). Following RFC 7396 would make partial updates the only
  exception.
- **Nothing lost.** A caller can still set a value, clear it with `null`, or leave it unchanged by
  omitting it. Only storing an empty string cannot be expressed, and these standards never store
  one.
- **Just as easy to adopt.** A caller using a standard merge patch library is unaffected unless it
  sends an empty string.
