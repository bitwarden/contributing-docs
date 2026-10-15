# Request validation

Requests `MUST` be validated exhaustively before processing, and APIs `SHOULD` report every failure
at once. Validation covers:

- Every required field, parameter, and header is present, not `null`, and not an empty string.
- Every field, parameter, and header has, or converts to, its declared type.
- Field names given in `sort` or `fields` exist.
- Constrained values are among those enumerated.
- Minimum values, maximum values, and maximum lengths are respected.
- Identifiers that refer to other resources, owned by this service or another, are valid.
- Each resource's `type` is one the endpoint accepts, and its `id`, where the path names a resource,
  is the one in the path.

`Bitwarden.Server.Sdk` is expected to perform this validation so that no request reaches a handler
without conforming to its declared model.
