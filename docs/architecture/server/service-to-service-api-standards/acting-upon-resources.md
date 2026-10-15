# Acting upon resources

{/* cspell:ignore kebab */}

Operations that do not fit creating, reading, updating, or deleting a resource are exposed as
actions on the resource. The path still names the resource acted on, the action reads clearly in
logs and routing rules, and transitions governed by business rules stay out of ordinary updates.

- The method `MUST` be `POST`, and the path `SHOULD` be
  `/api/v1/{resource plural}/{id}/actions/{action}`, with the action named in kebab-case.
- Actions impose no restriction on the shape of the request body.
- Actions `MUST NOT` be named `create`, `update`, `replace`, or `delete`, because bulk actions share
  a namespace with the other [bulk operations](./bulk-operations.md).
- A field that changes only through actions, typically a status whose transitions follow business
  rules, `MUST` be read-only, so that no update can bypass the action.
- On success, APIs `SHOULD` return `204` but `MAY` return `200` with the latest representation of
  the resource, or `202` with the [job](./jobs.md) scheduled to perform the action.

```http
POST /api/v1/users/62bed180-1f78-45d4-8a56-c996936a2947/actions/send-email
Content-Type: application/json
```

```json
{
  "subject": "Hello",
  "body": "World!"
}
```
