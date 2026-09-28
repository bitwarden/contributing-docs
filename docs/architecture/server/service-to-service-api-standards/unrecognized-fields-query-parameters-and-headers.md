---
sidebar_position: 6
---

# Unrecognized fields, query parameters, and headers

Sometimes a new, optional field, query parameter, or header is added to an API. Consumers upgrade to
new clients and start passing the new fields/parameters/headers and everything is great until a
security issue is discovered. The service is rolled back to the previous version but consumers are
still using newer versions of the client.

To keep from having to _also_ revert all of the consumers, APIs `MUST` ignore unrecognized fields,
parameters, and headers.

The exception is a parameter that shapes the result. Ignoring an unrecognized field means doing less
than the caller asked; ignoring one of these means returning something other than what was asked
for. APIs `MUST` reject the request with `422` when given:

- a `filter[{name}]`, `sort`, or `fields` parameter naming a field they do not support, or
- paging parameters when the API does not support paging, or for a paging style it does not
  implement, or
- on a [bulk operation](./bulk-operations.md#all-or-nothing-and-best-effort), an `atomic` value it
  does not support.
