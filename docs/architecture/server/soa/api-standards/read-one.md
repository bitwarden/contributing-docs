---
sidebar_position: 16
---

# Read one

- HTTP verb `MUST` be `GET`.
- API path `SHOULD` follow the pattern `/api/v1/{resource plural}/{id}`.

**Example**

```
GET /api/v1/users/62bed180-1f78-45d4-8a56-c996936a2947
Accept: application/json
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

Upon success, APIs `MUST` return `200`.

| Status   | Description             | Response                |
| -------- | ----------------------- | ----------------------- |
| `200 OK` | Request was successful. | The resource requested. |
