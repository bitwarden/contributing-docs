# Content negotiation

- Services `MUST` honor the `Accept` media type and `MUST` return `406 Not Acceptable` when they
  cannot produce it.
- Services `MUST` return `415 Unsupported Media Type` when they cannot process the `Content-Type`.
