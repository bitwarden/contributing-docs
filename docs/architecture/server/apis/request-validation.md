# Request validation

Notation follows the [APIs index](./index.md#notation).

Requests `MUST` be exhaustively validated before attempting to process the request and `SHOULD`
return all errors at once, rather than stopping at the first error. Exhaustive validation includes
the following:

- Every required field, parameter, and header is present, not set to null, and not an empty string.
- The data type of every field, parameter, and header is the correct data type. In the case of
  parameters and headers, since those always originate as strings, it also means "can be converted
  to the declared type".
- Field names specified by `sort` or `fields` parameters are valid field names.
- Values provided for constrained fields are among the enumerated values.
- Values provided for fields that restrict the minimum value, the maximum value, and/or the maximum
  length are within those constraints.
- Identifiers that refer to other resources, whether managed by the service or some other service,
  are valid.
- Each resource's `type` is one the endpoint accepts, and its `id`, where the path names a resource,
  is the one in the path.

:::tip

With some enhancements, `Bitwarden.Server.Sdk` is expected to perform all of the above validation,
so that no request reaches developer code without conforming to the declared request model.

:::
