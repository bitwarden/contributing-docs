# Payload shape

- Every request and response body that carries resources `MUST` be a JSON object that holds them in
  `data`: one resource, or an array of resources.
- Response metadata, such as paging state and counts, `MUST` be placed in a top-level `meta` object.
- Every resource `MUST` carry `id` (a string, even when the identifier is numeric), `type` (the
  singular name of the resource, such as `user`), and `attributes` (everything else). The only
  exception: `id` `MUST` be omitted when [creating](./creating-resources.md) a resource whose ID the
  service generates.
- Each kind of resource in a service `MUST` have its own `type`: no two share one.
- Errors are carried in a top-level `errors` array (see [errors](./errors.md)). Bodies that carry
  something other than resources, such as [advanced queries](./advanced-queries.md),
  [action](./acting-upon-resources.md) bodies, [bulk targeting](./bulk-operations.md#targeting), and
  JSON Patch documents, have shapes of their own, set by the pages that define them.

```json
{
  "data": {
    "attributes": {
      "firstName": "Bob",
      "lastName": "Smith"
    },
    "id": "62bed180-1f78-45d4-8a56-c996936a2947",
    "type": "user"
  }
}
```

Why this shape:

- Metadata needs somewhere to live that is not mixed into the resource, and it cannot all go into
  headers.
- One shape serves requests and responses, single resources and collections, so a caller learns it
  once.
- `id` and `type` are always present, so any resource is self-describing, and one rule ("always
  include them") is easier to remember than rules about when they may be left out.
- In a request, the service checks `type` and `id` against the path, so a request sent to the wrong
  resource is rejected rather than applied to it.
- The envelope is a serialization concern. Handlers take and return plain models, and the framework
  in `Bitwarden.Server.Sdk` handles `data` and `attributes`.

The shape is credited to [JSON:API](https://jsonapi.org/).
