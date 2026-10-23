# Partial updates

Notation follows the [APIs index](./index.md#notation).

1. Services `SHOULD NOT` support partial updates.
2. A service that _does_ support them `MUST` use `PATCH` and `MUST` ignore any field that is not
   specified. In a partial update, an absent field means "do not change" and an explicit `null`
   clears the value.
3. An API that needs to add or remove a single element of a collection `MAY` implement
   [JSON Patch](https://www.rfc-editor.org/info/rfc6902/), which was designed for exactly this, or
   model the change as an [action](./acting-upon-resources.md), such as
   `POST /api/v1/groups/{id}/actions/add-collection`. An action is usually the better choice because
   it works just as well and is simpler.

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

**Success responses**

Upon success, APIs `SHOULD` return `200` but `MAY` return `202` or `204`.

| Status           | Description                              | Response                                                        |
| ---------------- | ---------------------------------------- | --------------------------------------------------------------- |
| `200 OK`         | The resource was updated.                | The latest representation of the resource.                      |
| `202 Accepted`   | The resource is scheduled to be updated. | The [job](./jobs.md) that was scheduled to update the resource. |
| `204 No Content` | The resource was updated.                | Nothing.                                                        |

These semantics are credited to [RFC 7396](https://www.rfc-editor.org/info/rfc7396/) JSON Merge
Patch, with one departure.

:::note

1. Partial updates are discouraged because `PUT` with completely-replace semantics is simpler to
   implement and far more common, and UI teams tend to prefer read-modify-write semantics, which
   work well with `PUT`. Services that support `PATCH` frequently have to _also_ support `PUT`,
   which creates two endpoints that do the same thing, and it is hard to tell the difference between
   "null this field out" and "do not update this field".

:::

## Where we depart from an RFC

[RFC 7396](https://www.rfc-editor.org/info/rfc7396/) sets a field to an empty string when the
request sends one. These standards instead treat an empty string as not present, so the field is
left unchanged, and an explicit `null` clears it. They depart from RFC 7396 because:

- **One rule everywhere.** An empty string means "not present" in every request these standards
  describe. Following RFC 7396 here would make partial updates the one place where it does not.
- **Nothing lost.** Every outcome a caller needs is still available: set a value, clear it with
  `null`, or leave it unchanged by omitting it. The only thing that cannot be expressed is storing
  an empty string, which these standards never store.
- **Fewer bugs.** A distinction between an empty string and an absent field has to survive every
  serializer, language, and data store a value passes through. Treating them the same removes that
  class of bug, as the note on the [JSON](./json.md) page explains.
- **Just as easy to adopt.** A caller building a merge patch document with a standard library is
  unaffected unless it sends an empty string.
