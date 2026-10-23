# Synchronous and asynchronous

Notation follows the [APIs index](../index.md#notation).

- **Synchronous:** the response carries the outcome.
- **Asynchronous:** the response is `202` and a [job](../jobs.md) the caller can use to follow
  progress and collect the outcome.

A service that supports both `MUST` respond synchronously unless the caller sends
`Prefer: respond-async`, as defined by [RFC 7240](https://www.rfc-editor.org/info/rfc7240/). A
service that honors the preference `SHOULD` return `Preference-Applied: respond-async`. A service
`MAY` also respond asynchronously, regardless of preference, to requests that exceed a documented
size. Callers `MUST` handle every response the API documents.
