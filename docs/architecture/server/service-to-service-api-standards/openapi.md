---
sidebar_position: 3
---

# OpenAPI

APIs `MUST` be documented in [OpenAPI](https://www.openapis.org/) format.

- APIs `MUST` provide a description written with the API consumer as the audience in mind, free of
  implementation details.
- APIs `SHOULD` provide realistic example JSON for both the request and response.
- APIs `SHOULD` document which attributes are filterable and which are sortable.
- Fields that must always be present `MUST` be marked as `required`.
- Fields whose value may be null `MUST` be marked as `nullable`.
- Fields whose value is set by the server `MUST` be marked as `readOnly`. If a request includes a
  read-only field, the API `MUST` ignore it.

## Operation identifiers

Every operation `MUST` carry an explicit, stable `operationId`. "v1" APIs `SHOULD NOT` include the
version number but "v2" APIs `MUST` in order to generate stable clients (e.g. `getGroup`,
`getGroupV2`). These IDs are necessary for stable, generated clients:

1. Without the version, `/api/v1/groups/{id}` and `/api/v2/groups/{id}` collide into one method
   name.
1. Without an _explicit_ identifier, generators invent one from the route which can be brittle.
