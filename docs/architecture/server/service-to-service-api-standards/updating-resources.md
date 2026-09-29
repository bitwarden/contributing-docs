---
sidebar_position: 17
---

# Updating resources

- HTTP verb `MUST` be `PUT`.
- API path `SHOULD` follow the pattern `/api/v1/{resource plural}/{id}`.
- Resources `SHOULD` carry `updatedBy` and `updatedAt` fields.

**Example**

```
PUT /api/v1/users/62bed180-1f78-45d4-8a56-c996936a2947
Accept: application/json
Content-Type: application/json
```

```json
{
  "data": {
    "attributes": {
      "firstName": "Bob",
      "lastName": "Smith"
    },
    "id": "62bed180-1f78-45d4-8a56-c996936a2947",
    "type": "user"
  }
}
```

**Success responses**

Upon success, APIs `SHOULD` return `200` — or `201` if the request created the resource — but `MAY`
return `202` or `204`.

| Status           | Description                              | Response                                           |
| ---------------- | ---------------------------------------- | -------------------------------------------------- |
| `200 OK`         | The resource was updated.                | The latest representation of the resource.         |
| `201 Created`    | The resource was created.                | The latest representation of the resource.         |
| `202 Accepted`   | The resource is scheduled to be updated. | The job that was scheduled to update the resource. |
| `204 No Content` | The resource was updated.                | Nothing.                                           |
