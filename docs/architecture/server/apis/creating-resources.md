# Creating resources

Notation follows the [APIs index](./index.md#notation).

- HTTP verb `MUST` be `POST`.
- API path `SHOULD` follow the pattern `/api/v1/{resource plural}`.

If the request's `type` is not one the collection accepts, the API `MUST` return `422`.

**Example**

```http
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

| Status           | Description                          | Response                                                        |
| ---------------- | ------------------------------------ | --------------------------------------------------------------- |
| `201 Created`    | Resource was created.                | The latest representation of the resource.                      |
| `202 Accepted`   | Resource is scheduled to be created. | The [job](./jobs.md) that was scheduled to create the resource. |
| `204 No Content` | Resource was created.                | Nothing.                                                        |

A successful create returns the new resource because the caller usually needs the server-generated
ID and the stored representation, and getting both in one response saves a second call.

Creating many resources at once is a [bulk create](./bulk-operations.md#bulk-creates).
