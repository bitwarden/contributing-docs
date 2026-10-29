# Acting upon resources

Notation follows the [APIs index](./index.md#notation).

Operations that do not fit creating, reading, updating, or deleting a resource are exposed as
**actions** on the resource. Modeling each operation as a distinct API makes it easy to discover,
and lets it be authorized independently of the standard update.

- HTTP verb `MUST` be `POST`.
- API path `SHOULD` follow the pattern `/api/v1/{resource plural}/{id}/actions/{action}`, with the
  action named in kebab-case.
- Unlike the CRUD APIs, _actions_ impose no restrictions on the shape of the JSON posted.
- A field that changes only through actions, such as a status whose transitions follow business
  rules, `MUST` be read-only, so that no update can bypass the action.

```http
POST /api/v1/users/62bed180-1f78-45d4-8a56-c996936a2947/actions/send-email
Accept: application/json
Content-Type: application/json
```

```json
{
  "subject": "Hello",
  "body": "World!"
}
```

**Success responses**

Upon success, APIs `SHOULD` return `204` but `MAY` return `200` or `202`.

| Status           | Description                | Response                                                       |
| ---------------- | -------------------------- | -------------------------------------------------------------- |
| `200 OK`         | The action was successful. | The latest representation of the resource.                     |
| `202 Accepted`   | The action is scheduled.   | The [job](./jobs.md) that was scheduled to execute the action. |
| `204 No Content` | The action was successful. | Nothing.                                                       |
