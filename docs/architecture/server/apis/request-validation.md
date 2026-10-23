# Request validation

Notation follows the [APIs index](./index.md#notation).

Requests `MUST` be exhaustively validated before attempting to process the request and `SHOULD`
return all errors at once (not stop after the first error is encountered). Exhaustive validation
includes the following:

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

With some enhancements, developers should get all of the above "for free" from the
`Bitwarden.Server.Sdk` which will <u>guarantee</u> that no request reaches developer code that does
not conform to the declared request model.

:::
