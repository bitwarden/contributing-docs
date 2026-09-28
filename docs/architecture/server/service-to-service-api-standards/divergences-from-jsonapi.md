---
sidebar_position: 32
---

# Divergences from JSON:API

- Request and responses use the `application/json` media type, not `application/vnd.api+json`.
- We do not support [compound documents](https://jsonapi.org/format/#document-compound-documents) or
  the related `include` query parameter.
- Paged responses are not required to include `links`.
- For sparse fieldsets, callers specify the fields to include via a `fields` query parameter. We do
  not support the `fields[{type}]` form.
- Unrecognized query parameters are ignored rather than rejected with `400`, and the result-shaping
  subset is rejected with `422`. See
  [Unrecognized fields, query parameters, and headers](./unrecognized-fields-query-parameters-and-headers.md).
- Implementation-specific query parameters are not required to contain a non-`a-z` character.
- Resources are updated with `PUT` and complete-replace semantics rather than `PATCH`. `PATCH`,
  where a service supports it, follows the specification's partial-update semantics.
- We do not support `relationships` objects. A reference to another resource is an `attributes`
  member holding its ID.
- A best-effort [bulk response](./bulk-operations.md#bulk-responses) carries both `data` and
  `errors`, which JSON:API does not allow to coexist.
- We do not adopt the [Atomic Operations](https://jsonapi.org/ext/atomic/) extension. See
  [the FAQ](./frequently-asked-questions.md).
