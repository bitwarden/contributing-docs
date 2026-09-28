---
sidebar_position: 14
---

# Creating resources

- HTTP verb `MUST` be `POST`.
- API path `SHOULD` be like `/api/v1/{resource plural}`.

**Example**

```
POST /api/v1/users
Content-Type: application/json
```

```json
{
  "data": {
    "attributes": {
      "firstName": "Bob",
      "lastName": "Smith"
    },
    "type": "user"
  }
}
```

**Success responses**

Upon success, APIs `SHOULD` return `201` but `MAY` return `202` or `204`.

| Status           | Description                          | Response                                           |
| ---------------- | ------------------------------------ | -------------------------------------------------- |
| `201 Created`    | Resource was created.                | The latest representation of the resource.         |
| `202 Accepted`   | Resource is scheduled to be created. | The job that was scheduled to create the resource. |
| `204 No Content` | Resource was created.                | Nothing.                                           |
