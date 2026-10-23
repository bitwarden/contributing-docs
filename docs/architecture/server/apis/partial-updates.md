# Partial updates

Services `SHOULD NOT` support partial updates - see below for why. A service that _does_ support
them `MUST` use `PATCH` and `MUST` ignore any field that is not specified. In a partial update, an
absent field means "do not change" and an explicit `null` clears the value.

:::faq[Why should we not support partial updates?]

1. `PUT` with completely-replace semantics is simpler to implement and far more common.
2. UI teams tend to prefer read-modify-write semantics which works well with `PUT`.
3. Services that support `PATCH` frequently have to _also_ support `PUT` which creates two endpoints
   to do the same thing.
4. It is hard to tell the difference between "null this field out" vs. "do not update this field".

To be clear, teams _can_ support partial updates. We just think you will be better served by just
sticking to simple updates.

:::

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

:::faq[How do I support just adding or removing an element from a collection?]

You `MAY` implement the [JSON Patch](https://www.rfc-editor.org/info/rfc6902/) specification, which
was designed for exactly this. However, we think an [action](./acting-upon-resources.md) works just
as well and is simpler:

```http
POST /api/v1/groups/62bed180-1f78-45d4-8a56-c996936a2947/actions/add-collection
```

:::

## Where we depart from an RFC

**RFC:** [RFC 7396](https://www.rfc-editor.org/info/rfc7396/): an empty string sets the field to an
empty string.

**These standards:** An empty string is treated as not present, so the field is left unchanged. An
explicit `null` clears it.

**Why:**

- **One rule everywhere.** An empty string means "not present" in every request these standards
  describe. Following RFC 7396 here would make partial updates the one place where it does not.
- **Nothing lost.** Every outcome a caller needs is still available: set a value, clear it with
  `null`, or leave it unchanged by omitting it. The only thing that cannot be expressed is storing
  an empty string, which these standards never store.
- **Fewer bugs.** A distinction between an empty string and an absent field has to survive every
  serializer, language, and data store a value passes through. Treating them the same removes that
  class of bug, as the [JSON](./json.md) page explains in its answer to why empty strings are
  treated like `null`.
- **Just as easy to adopt.** A caller building a merge patch document with a standard library is
  unaffected unless it sends an empty string.
