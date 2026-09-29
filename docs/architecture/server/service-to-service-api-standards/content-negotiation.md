---
sidebar_position: 9
---

# Content negotiation

- Services `MUST` respect the `Accept` media type requested by the caller. If the caller asks for
  XML and the server cannot return XML, the service `MUST` return `406 Not Acceptable`.
- Services `MUST` return `415 Unsupported Media Type` if the server can't process the specified
  `Content-Type`.
