---
sidebar_position: 1
---

# OpenAPI

APIs `MUST` be described in OpenAPI.

- Descriptions `MUST` be written for the consumer and free of implementation details.
- APIs `SHOULD` provide realistic request and response examples, and `SHOULD` document which
  attributes can be [filtered](./filtering.md) and [sorted](./sorting.md).
- Fields that are always present `MUST` be marked `required`, fields that may be null `MUST` be
  marked `nullable`, and fields set by the server `MUST` be marked `readOnly`. An API `MUST` ignore
  a read-only field in a request.

## Operation identifiers

Every operation `MUST` have an explicit, stable `operationId`. Version 1 operations `SHOULD NOT`
include the version, and later versions `MUST` (for example `getGroup`, then `getGroupV2`), so that
generated clients do not collide on one method name or depend on names a generator invents.
