---
sidebar_position: 29
---

# Errors

Errors `MUST` be returned as an array of error objects within a top-level `errors` field. Each error
populates the following fields, except that at most one `source` member applies to any one error:

| Field              | Description                                                                                                       | Type     |
| ------------------ | ----------------------------------------------------------------------------------------------------------------- | -------- |
| `code`             | A stable, machine-readable error code.                                                                            | `string` |
| `detail`           | A human-readable explanation specific to this occurrence. May be localized.                                       | `string` |
| `id`               | A unique identifier for this particular occurrence of the problem.                                                | `string` |
| `meta.resource`    | The `type` and `id` of the resource that failed, in a [bulk operation](./bulk-operations.md#bulk-responses).      | `object` |
| `source`           | A reference to the primary source of the error.                                                                   | `object` |
| `source.header`    | The name of the request header that caused the error.                                                             | `string` |
| `source.parameter` | The query parameter that caused the error.                                                                        | `string` |
| `source.pointer`   | A [JSON Pointer](https://www.rfc-editor.org/info/rfc6901/) to the field in error (e.g. `/data/attributes/title`). | `string` |
| `status`           | The HTTP status code applicable to this problem.                                                                  | `string` |
| `title`            | A short, human-readable summary of the problem that doesn't change from occurrence to occurrence.                 | `string` |

**Example**

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

> A `500` response `MUST NOT` include any detail about the failure. `title` and `detail` `MUST` be
> generic, and `source` `MUST` be omitted. Exception messages, stack traces, type names, connection
> strings, and dependency identities are all disclosure risks and belong in traces and logs, which
> are not reachable by the caller. The `id` field is how a caller and an operator correlate a report
> with the logged detail.
