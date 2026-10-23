# OpenAPI

APIs `MUST` be documented in [OpenAPI](https://www.openapis.org/) format.

- APIs `MUST` provide a description written with the API consumer as the audience in mind, free of
  implementation details.
- APIs `SHOULD` provide realistic example JSON for both the request and response.
- APIs `SHOULD` document which attributes are filterable and which are sortable.
- Fields that must always be present `MUST` be marked as `required`.
- Fields whose value may be null `MUST` be marked as `nullable`.
- Fields whose value is set by the server `MUST` be marked as `readOnly`. The one exception is
  `version`, which `MUST NOT` be marked `readOnly` because callers send it back on update, as
  [optimistic concurrency](./optimistic-concurrency.md) explains.
- If a single-resource request includes a read-only field, the API `MUST` ignore it. A
  [bulk update](./bulk-operations.md#bulk-updates) that names a read-only field is instead rejected
  with `422`.

## Operation identifiers

Every operation `MUST` carry an explicit, stable
[`operationId`](https://spec.openapis.org/oas/latest.html#operation-object). "v1" APIs `SHOULD NOT`
include the version number but "v2" APIs `MUST` in order to generate stable clients (e.g.
`getGroup`, `getGroupV2`). These IDs are necessary for stable, generated clients:

1. Without the version, `/api/v1/groups/{id}` and `/api/v2/groups/{id}` collide into one method
   name.
2. Without an _explicit_ identifier, generators invent one from the route which can be brittle.
