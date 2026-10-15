# Unrecognized fields, query parameters, and headers

A service rolled back to fix a defect can receive fields from callers that have already upgraded. So
that callers do not have to be rolled back too, APIs `MUST` ignore unrecognized fields, query
parameters, and headers.

The exception is a parameter that shapes the result, because ignoring it returns something other
than what was asked for. APIs `MUST` reject with `422`:

- a `filter[{name}]`, `sort`, or `fields` parameter naming a field the API does not support,
- [paging](./paging.md) parameters when the API does not page, or for a paging style it does not
  implement, and
- on a [bulk operation](./bulk-operations.md#atomicity), an `atomic` value it does not support.
