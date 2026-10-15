# Optimistic concurrency

- APIs that update resources `SHOULD` detect conflicting updates. Those that do `MUST` use a
  `version` field marked `required` and not `readOnly`.
- `version` `SHOULD` be an integer incremented on every successful update, and `MUST` be formatted
  as a string whatever its value.
- If the value sent does not match the stored version, the API `MUST` return `409 Conflict`.
- On every successful update, the API `MUST` change the version.

This departs from [RFC 9110](https://www.rfc-editor.org/info/rfc9110/)'s conditional requests
(`ETag`, `If-Match`, `412`), for these reasons:

- **Described by the same RFC.** RFC 9110 gives this exact case as its example of `409`: a
  representation sent with `PUT` that conflicts with an earlier change, where versioning is in use.
  Conditional requests are an alternative, not a requirement.
- **Simpler for callers.** The version is part of the resource the caller already reads and sends
  back. There is no header to capture and replay, and generated clients expose it as an ordinary
  property.
- **Works for bulk operations.** A [bulk replace](./bulk-operations.md#operation-specific-rules)
  carries many resources, each with its own version. One `If-Match` header cannot.
- **Travels with the data.** The version stays with the resource in events, local copies, logs, and
  caches.
- **Nothing lost.** A service can still return `ETag` for HTTP caching.
