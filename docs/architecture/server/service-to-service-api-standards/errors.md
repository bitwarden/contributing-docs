---
sidebar_position: 26
---

# Errors

Errors `MUST` be returned as an array of error objects in a top-level `errors` field. Each error
has:

| Field              | Description                                                                                             |
| ------------------ | ------------------------------------------------------------------------------------------------------- |
| `code`             | A stable, machine-readable error code.                                                                  |
| `detail`           | A human-readable explanation of this occurrence. May be localized.                                      |
| `id`               | A unique identifier for this occurrence.                                                                |
| `meta.resource`    | In a [bulk operation](./bulk-operations.md#responses), the `type` and `id` of the resource that failed. |
| `source.header`    | The request header that caused the error.                                                               |
| `source.parameter` | The query parameter that caused the error.                                                              |
| `source.pointer`   | A JSON Pointer to the field in error, such as `/data/attributes/title`.                                 |
| `status`           | The HTTP status code that applies, as a string.                                                         |
| `title`            | A short summary that does not change from occurrence to occurrence.                                     |

At most one `source` member applies to any one error.

```json
{
  "errors": [
    {
      "id": "9f3c1e2a-7d40-4c8b-9b17-2f5a1c6e83d1",
      "status": "422",
      "code": "resource-not-found",
      "title": "Referenced resource does not exist",
      "detail": "'e3d2eb3e-755c-41cd-86f0-0e0649043ef6' is not a group in this organization.",
      "source": {
        "pointer": "/data/attributes/groups/0"
      }
    }
  ]
}
```

A `500` response `MUST NOT` disclose anything about the failure. `title` and `detail` `MUST` be
generic and `source` `MUST` be omitted. Exception messages, stack traces, type names, connection
strings, and dependency identities belong in logs and traces. The `id` correlates a caller's report
with them.

The error object is credited to [JSON:API](https://jsonapi.org/). It departs from
[RFC 9457](https://www.rfc-editor.org/info/rfc9457/) Problem Details, for these reasons:

- **Simpler for callers.** Every error response has one shape, whether it reports one failure or
  twenty. Problem Details needs an extension member as soon as there is more than one failure.
- **More precise.** `source` can name a query parameter or a header as well as a body field. Problem
  Details has no standard member for any of them.
- **Works for bulk operations.** The same objects report per-resource failures inside a best-effort
  `200` response (see [bulk operations](./bulk-operations.md#responses)). RFC 9457 advises against
  batching disparate problems.
- **Easier to maintain.** A `code` string identifies the error, where Problem Details uses a `type`
  URI that RFC 9457 encourages to resolve to documentation.
- **No harder to adopt.** The framework produces error responses either way.
