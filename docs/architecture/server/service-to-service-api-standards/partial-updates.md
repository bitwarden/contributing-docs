---
sidebar_position: 18
---

# Partial updates

Services `SHOULD NOT` support partial updates — see [the FAQ](./frequently-asked-questions.md) for
why. A service that _does_ support them `MUST` use `PATCH` and `MUST` ignore any field that isn't
specified. In a partial update, an absent field means "do not change" and an explicit `null` clears
the value.

**Example**

```
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
