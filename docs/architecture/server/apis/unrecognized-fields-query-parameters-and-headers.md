# Unrecognized fields, query parameters, and headers

1. APIs `MUST` ignore unrecognized fields, query parameters, and headers.
2. APIs `MUST` reject the request with `422`, rather than ignore it, when given a parameter that
   shapes the result:
   - a `filter[{name}]`, `sort`, or `fields` parameter naming a field they do not support,
   - paging parameters when the API does not support paging, or for a paging style it does not
     implement, or
   - on a [bulk operation](./bulk-operations.md#all-or-nothing-and-best-effort), an `atomic` value
     it does not support.

:::note

1. A service that is rolled back, for example to remove a security issue, can receive fields,
   parameters, and headers from callers that have already upgraded to a newer client. Ignoring them
   means those callers do not have to be rolled back too.
2. Ignoring an unrecognized field means doing less than the caller asked. Ignoring a parameter that
   shapes the result means returning something other than what the caller asked for.

:::
