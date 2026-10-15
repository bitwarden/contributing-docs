---
sidebar_position: 28
---

# Deprecation

- A deprecated API `MUST` be marked `deprecated: true` in [OpenAPI](./openapi.md), and its
  description `MUST` name the replacement.
- Every response from a deprecated API `MUST` include the `Deprecation` and `Sunset` headers, and
  `SHOULD` include a `Link` header naming the replacement.
- `Deprecation` is the time the API was deprecated, as `@` followed by seconds since the Unix epoch.
  `Sunset` is the date it stops working. It `MUST` be a real date, and `MUST NOT` pass without
  either removal or a published extension.

```http
Deprecation: @1688169599
Sunset: Sun, 30 Jun 2024 23:59:59 GMT
Link: <https://api.example.com/api/v2/users>; rel="successor-version"
```

The headers are defined by [RFC 9745](https://www.rfc-editor.org/info/rfc9745/) (`Deprecation`),
[RFC 8594](https://www.rfc-editor.org/info/rfc8594/) (`Sunset`), and
[RFC 8288](https://www.rfc-editor.org/info/rfc8288/) (`Link`).
