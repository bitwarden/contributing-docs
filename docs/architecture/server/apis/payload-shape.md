# Payload shape

Notation follows the [APIs index](./index.md#notation).

## Envelope

1. Every request and response body that carries non-binary resources `MUST` be a JSON object that
   holds them in `data`: one resource, or an array of resources.
2. Response metadata, such as paging state and counts, `MUST` be placed in a top-level `meta`
   object.
3. Errors are carried in a top-level `errors` array, as [errors](./errors.md) describes. Bodies that
   carry something other than resources, such as [advanced queries](./advanced-queries.md),
   [action](./acting-upon-resources.md) bodies, [bulk targeting](./bulk-operations.md#targeting),
   and JSON Patch documents, have shapes of their own, set by the pages that define them.

**Example**

The last page of a paged list of users:

```json
{
  "data": [
    {
      "attributes": {
        "emailAddresses": [
          {
            "address": "bob@example.com",
            "type": "WORK"
          },
          {
            "address": "bob.smith@example.net",
            "type": "PERSONAL"
          }
        ],
        "firstName": "Bob",
        "lastName": "Smith"
      },
      "id": "62bed180-1f78-45d4-8a56-c996936a2947",
      "type": "user"
    },
    {
      "attributes": {
        "emailAddresses": [
          {
            "address": "alice@example.com",
            "type": "WORK"
          }
        ],
        "firstName": "Alice",
        "lastName": "Jones"
      },
      "id": "cacba8c1-29fa-4018-8950-acd400ec76b7",
      "type": "user"
    }
  ],
  "meta": {
    "pageCount": 9,
    "pageNumber": 9,
    "pageSize": 50,
    "totalCount": 402
  }
}
```

:::note

1. Resources are held in an envelope because it gives pagination, counts, and other response
   metadata somewhere to live that is not mixed in with the resource itself. The envelope is a
   serialization concern, not a programming model concern. Handlers take and return plain model
   classes, how those serialize is the framework's business, and no application code should ever see
   `data` or `attributes`.

:::

## Resource fields

Every resource `MUST` include the following fields:

| Field        | Description                                                                      | Type     |
| ------------ | -------------------------------------------------------------------------------- | -------- |
| `attributes` | Details about the resource.                                                      | `object` |
| `id`         | The unique ID of the resource. Even if the ID is numeric, it `MUST` be a string. | `string` |
| `type`       | The _singular_ name of the resource, such as `user`.                             | `string` |

**Example**

```json
{
  "attributes": {
    "emailAddresses": [
      {
        "address": "bob@example.com",
        "type": "WORK"
      },
      {
        "address": "bob.smith@example.net",
        "type": "PERSONAL"
      }
    ],
    "firstName": "Bob",
    "lastName": "Smith"
  },
  "id": "62bed180-1f78-45d4-8a56-c996936a2947",
  "type": "user"
}
```

The only exception is when a resource is being created via `POST`, or via a
[bulk create](./bulk-operations.md#bulk-creates), against an API that will generate the ID. In this
case, the `id` field `MUST` be omitted.

Each kind of resource in a service `MUST` have its own `type`: no two share one.

In a request, the service checks `type` and `id` against the path, so a request sent to the wrong
resource is rejected rather than applied to it.

Every resource carries `id` and `type`, even where the URL path implies them, because:

1. The JSON is then comprehensive and self-describing.
2. The context in which the JSON is consumed cannot be completely known in advance.
3. Some APIs are polymorphic, so `type` cannot be inferred from the path. For example,
   `GET /api/v1/users` might return some resources whose type is `employee` and others whose type is
   `contractor`.
4. One rule to "always include it" is easier to remember than multiple rules for when it is required
   and when it is not.

The shape is credited to [JSON:API](https://jsonapi.org/).
