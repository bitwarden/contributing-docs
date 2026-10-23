# Optimistic concurrency

Notation follows the [APIs index](./index.md#notation).

- APIs that update resources `SHOULD` implement
  [optimistic concurrency](https://en.wikipedia.org/wiki/Optimistic_concurrency_control) to detect
  concurrent modifications. Those that do `MUST` do so using a `version` field marked `required` and
  not `readOnly`.
- The `version` field `SHOULD` be a simple integer that is incremented after every successful update
  but, regardless of what value is used, the field `MUST` be formatted as a string.
- If the value provided does not match the stored version, the API `MUST` respond `409 Conflict`.
- Upon successfully updating the resource, the API `MUST` update the version identifier.

## Where we depart from an RFC

[RFC 9110](https://www.rfc-editor.org/info/rfc9110/) conditional requests use an `ETag` response
header, an `If-Match` request header, and `412 Precondition Failed` on a mismatch. These standards
instead use a `version` field in the resource, sent back on update, and `409 Conflict` on a
mismatch. They depart from conditional requests because:

- **Sanctioned by the same RFC.** RFC 9110 describes this exact case under `409`: a representation
  sent with `PUT` that conflicts with an earlier change, where versioning is in use. Conditional
  requests are an alternative, not a requirement.
- **Simpler for callers.** The version is part of the resource the caller already reads and sends
  back. There is no header to capture and replay, and generated clients expose it as an ordinary
  property.
- **Works for bulk operations.** A bulk replace carries many resources in one request, each with its
  own version. One `If-Match` header cannot.
- **Travels with the data.** The version stays with the resource wherever the resource goes: events,
  local copies, logs, and caches.
- **Nothing lost.** A service can still return `ETag` for HTTP caching.
