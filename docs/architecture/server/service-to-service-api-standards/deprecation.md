---
sidebar_position: 31
---

# Deprecation

Deprecation announces that an API should no longer be called, tells callers what they _should_ be
calling, instead, and, ideally, how much time they have to migrate.

- Every deprecated API `MUST` be marked `deprecated: true` in the service's OpenAPI spec and the
  `description` field `MUST` name the replacement.
- Every response from a deprecated API `MUST` include the `Deprecation` and `Sunset` headers and
  `SHOULD` include a `Link` header naming the replacement.

> Learn more about the [Deprecation](https://www.rfc-editor.org/info/rfc9745/) and
> [Sunset](https://www.rfc-editor.org/info/rfc8594/) headers.

**Example**

```http
Deprecation: @1688169599
Sunset: Sun, 30 Jun 2024 23:59:59 GMT
Link: </api/v2/groups>; rel="successor-version"
```

| Header        | Description                                                                                                                                   |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `Deprecation` | When the operation became deprecated, as an HTTP structured field date — `@` followed by seconds since the Unix epoch.                        |
| `Sunset`      | When it will stop working, as an HTTP date. It `MUST` be a real date, and it `MUST NOT` pass without either removal or a published extension. |
| `Link`        | Points at the replacement.                                                                                                                    |
