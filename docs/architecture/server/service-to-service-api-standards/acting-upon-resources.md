---
sidebar_position: 21
---

# Acting upon resources

APIs that don't fit cleanly into the CRUD paradigm can typically be modeled as **actions**.

- HTTP verb `MUST` be `POST`.
- API path `SHOULD` be like `/api/v1/{resource plural}/{id}/actions/{action}`.

```
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

> Unlike the CRUD APIs, _actions_ impose no restrictions on the shape of the JSON posted.

**Success responses**

Upon success, APIs `SHOULD` return `204` but `MAY` return `200` or `202`.

| Status           | Description                | Response                                                       |
| ---------------- | -------------------------- | -------------------------------------------------------------- |
| `200 OK`         | The action was successful. | The latest representation of the resource.                     |
| `202 Accepted`   | The action is scheduled.   | The [job](./jobs.md) that was scheduled to execute the action. |
| `204 No Content` | The action was successful. | Nothing.                                                       |
