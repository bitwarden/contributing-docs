# Creating resources

- The method `MUST` be `POST`, and the path `SHOULD` be the collection, `/api/v1/{resource plural}`.
- When the service generates the ID, the request `MUST` omit `id`.
- If the request's `type` is not one the collection accepts, the API `MUST` return `422`.
- APIs that support create-or-update `MUST` do so through [`PUT`](./updating-resources.md).
- On success, APIs `SHOULD` return `201` but `MAY` return `202` or `204`.

A successful create returns the new resource because the caller usually needs the server-generated
ID and the stored representation, and getting both in one response saves a second call.

| Status           | Meaning                                  | Body                                         |
| ---------------- | ---------------------------------------- | -------------------------------------------- |
| `201 Created`    | The resource was created.                | The latest representation of the resource.   |
| `202 Accepted`   | The resource is scheduled to be created. | The [job](./jobs.md) scheduled to create it. |
| `204 No Content` | The resource was created.                | Nothing.                                     |

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

Creating many resources at once is a [bulk create](./bulk-operations.md).
