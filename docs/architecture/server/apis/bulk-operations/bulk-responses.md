# Bulk responses

Notation follows the [APIs index](../index.md#notation).

**Success responses**

| Status           | Description                                                                                             | Response                                                |
| ---------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| `200 OK`         | The request was processed. If all-or-nothing, every resource succeeded. If best-effort, any number did. | As described below.                                     |
| `202 Accepted`   | The request is scheduled.                                                                               | The [job](../jobs.md) that was scheduled to process it. |
| `204 No Content` | All-or-nothing only. Every resource succeeded.                                                          | Nothing.                                                |

Best-effort results use `200` rather than `207 Multi-Status` because `207` comes from WebDAV and
carries an XML body by definition. Callers already have to inspect `meta.failedCount` and `errors`
to learn which resources failed, so a distinct status code adds nothing but another case to handle.

A `200` response carries:

- `meta.affectedCount` - the number of resources that succeeded. `MUST` be present.
- `meta.failedCount` - the number of resources that failed. `MUST` be present for best-effort.
- `data` - for creates, updates, and replaces, the latest representation of each resource that
  succeeded. Bulk creates `SHOULD` return it, because the caller needs the generated IDs. Other
  operations `MAY`. When present with `data` or `ids` targeting, it `MUST` follow request order.
- `errors` - best-effort only. At least one [error](../errors.md) for each resource that failed.

Each error `MUST` identify the resource that failed:

- by `source.pointer` into the request, where the resource appears there, such as
  `/data/2/attributes/email` or `/ids/2`, or
- by `meta.resource`, a `type` and `id`, where it does not, as with `filter` targeting.

An error's `status` `MUST` be what the single-resource API would have returned for that resource -
for example, `404` for an ID that does not exist, `409` for a version conflict, or `422` for a
broken business rule.

To correlate created resources with request items, a bulk create `MAY` accept a
[lid](https://jsonapi.org/format/#document-resource-object-identification) on each item. An API that
accepts `lid` `MUST` echo it on the created resource. `lid` is credited to
[JSON:API](https://jsonapi.org/).

**Best-effort example**

```json
{
  "data": [
    {
      "attributes": {
        "email": "bob@example.com"
      },
      "id": "62bed180-1f78-45d4-8a56-c996936a2947",
      "lid": "bob",
      "type": "user"
    }
  ],
  "errors": [
    {
      "id": "9f3c1e2a-7d40-4c8b-9b17-2f5a1c6e83d1",
      "status": "422",
      "code": "email-in-use",
      "title": "Email address is already in use",
      "detail": "'alice@example.com' is already a user in this organization.",
      "source": {
        "pointer": "/data/1/attributes/email"
      }
    }
  ],
  "meta": {
    "affectedCount": 1,
    "failedCount": 1
  }
}
```

**All-or-nothing failure.** Nothing has changed. The response is a standard [error](../errors.md)
response carrying every failure. Its status `MUST` be `409` if every failure is a version conflict
and `422` otherwise. It is never `404`, because the resource named by the URL path - the
collection - was found.

**Asynchronous outcome.** When the job completes, it `MUST` report the same `affectedCount`,
`failedCount`, and `errors` a synchronous response would have.
