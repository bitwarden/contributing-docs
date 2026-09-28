---
sidebar_position: 15
---

# Read many

- HTTP verb `MUST` be `GET`.
- API path `SHOULD` be like `/api/v1/{resource plural}`.

**Example**

```
GET /api/v1/users
Accept: application/json
```

```json
{
  "data": [
    {
      "attributes": {
        "firstName": "Bob",
        "lastName": "Smith"
      },
      "id": "62bed180-1f78-45d4-8a56-c996936a2947",
      "type": "user"
    },
    {
      "attributes": {
        "firstName": "Alice",
        "lastName": "Jones"
      },
      "id": "cacba8c1-29fa-4018-8950-acd400ec76b7",
      "type": "user"
    }
  ]
}
```

**Success responses**

Upon success, APIs `MUST` return `200`.

| Status   | Description             | Response                 |
| -------- | ----------------------- | ------------------------ |
| `200 OK` | Request was successful. | The resources requested. |

**See also:**

- Advanced queries
- Filtering
- Paging
- Sorting
- Sparse fieldsets
