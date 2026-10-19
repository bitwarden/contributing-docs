# Resource fields

Every resource `MUST` include the following fields:

| Field        | Description                                                                      | Type     |
| ------------ | -------------------------------------------------------------------------------- | -------- |
| `attributes` | Details about the resource.                                                      | `object` |
| `id`         | The unique ID of the resource. Even if the ID is numeric, it `MUST` be a string. | `string` |
| `type`       | The _singular_ name of the resource (e.g. `user`).                               | `string` |

The only exception is when a resource is being created via `POST`, or via a
[bulk create](./bulk-operations.md#bulk-creates), against an API that will generate the ID. In this
case, the `id` field `MUST` be omitted.

:::faq[Why do I have to specify the ID in the path _and_ the JSON body?]

1. So that the JSON is comprehensive and self-describing.
2. Establishing just one rule to "always include it" is easier to remember than multiple rules for
   when it is required and when it is not required.

:::

:::faq[Why do I have to specify the type? You can infer that from the URL path.]

1. So that the JSON is comprehensive and self-describing.
2. Establishing just one rule to "always include it" is easier to remember than multiple rules for
   when it is required and when it is not required.

:::

- Every request and response body that carries resources `MUST` be a JSON object that holds them in
  `data`: one resource, or an array of resources.
- Response metadata, such as paging state and counts, `MUST` be placed in a top-level `meta` object.
- Each kind of resource in a service `MUST` have its own `type`: no two share one.
- Errors are carried in a top-level `errors` array (see [errors](./errors.md)). Bodies that carry
  something other than resources, such as [advanced queries](./advanced-queries.md),
  [action](./acting-upon-resources.md) bodies, [bulk targeting](./bulk-operations.md#targeting), and
  JSON Patch documents, have shapes of their own, set by the pages that define them.

:::faq[Why is there an envelope? Can't the API just return the object?]

1. The envelope gives pagination, counts, and other response metadata somewhere to live that is not
   mixed in with the resource itself.
2. It is a serialization concern, not a programming model concern. Handlers take and return plain
   model classes; how those serialize is the framework's business. No application code should ever
   see `data` or `attributes`.

:::

In a request, the service checks `type` and `id` against the path, so a request sent to the wrong
resource is rejected rather than applied to it.

The shape is credited to [JSON:API](https://jsonapi.org/).
