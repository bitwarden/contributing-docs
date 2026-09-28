---
sidebar_position: 19
---

# Optimistic concurrency

- APIs that update resources `SHOULD` implement
  [optimistic concurrency](https://en.wikipedia.org/wiki/Optimistic_concurrency_control) to detect
  concurrent modifications. Those that do `MUST` do so using a `version` field marked `required` and
  not `readOnly`.
- The `version` field `SHOULD` be a simple integer that is incremented after every successful update
  but, regardless of what value is used, the field `MUST` be formatted as a string.
- If the value provided does not match the stored version, the API `MUST` respond `409 Conflict`.
- Upon successfully updating the resource, the API `MUST` update the version identifier.
