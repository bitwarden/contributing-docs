# Errors

Notation follows the [APIs index](./index.md#notation).

Errors `MUST` be returned as an array of error objects within a top-level `errors` field. Each error
populates the following fields, except that at most one `source` member applies to any one error:

| Field              | Description                                                                                                         | Type     |
| ------------------ | ------------------------------------------------------------------------------------------------------------------- | -------- |
| `code`             | A stable, machine-readable error code.                                                                              | `string` |
| `detail`           | A human-readable explanation specific to this occurrence. May be localized.                                         | `string` |
| `id`               | A unique identifier for this particular occurrence of the problem.                                                  | `string` |
| `meta.resource`    | The `type` and `id` of the resource that failed, in a [bulk operation](./bulk-operations/bulk-responses.md).        | `object` |
| `source`           | A reference to the primary source of the error.                                                                     | `object` |
| `source.header`    | The name of the request header that caused the error.                                                               | `string` |
| `source.parameter` | The query parameter that caused the error.                                                                          | `string` |
| `source.pointer`   | A [JSON Pointer](https://www.rfc-editor.org/info/rfc6901/) to the field in error, such as `/data/attributes/title`. | `string` |
| `status`           | The HTTP status code applicable to this problem.                                                                    | `string` |
| `title`            | A short, human-readable summary of the problem that does not change from occurrence to occurrence.                  | `string` |

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

A `500` response `MUST NOT` include any detail about the failure. Its `title` and `detail` `MUST` be
generic, and `source` `MUST` be omitted, because exception messages, stack traces, type names,
connection strings, and dependency identities are all disclosure risks. That detail belongs in
traces and logs, which the caller cannot reach, and the `id` field is how a caller and an operator
correlate a report with the logged detail.

The error object is credited to [JSON:API](https://jsonapi.org/).

## Where we depart from an RFC

[RFC 9457](https://www.rfc-editor.org/info/rfc9457/) Problem Details reports one problem per
response, identified by a `type` URI and served as `application/problem+json`, and multiple failures
require an extension member that each API defines. These standards instead return an array of error
objects in a top-level `errors` field, each with a `code`, `status`, `title`, `detail`, `id`, and a
`source` that points at a body field, a query parameter, or a header. They depart from RFC 9457
because:

- **Simpler for callers.** Every error response has the same shape whether it reports one failure or
  twenty, so a caller writes one parser. Problem Details needs an extension, defined by us, as soon
  as there is more than one failure, and RFC 9457 itself uses one for exactly this case.
- **More precise.** `source` can name a query parameter or a header as well as a body field. Problem
  Details has no standard member for any of the three.
- **Works for bulk operations.** The same error objects report per-resource failures inside a
  best-effort `200` response. Problem Details describes a failed response as a whole, and RFC 9457
  advises against using it to batch disparate problems.
- **Easier to maintain.** A stable `code` string identifies the error. Problem Details identifies it
  by a `type` URI, and RFC 9457 encourages URIs that resolve to documentation for each error type.
- **No harder to adopt.** The framework produces the error response either way. Handlers never build
  one by hand.
