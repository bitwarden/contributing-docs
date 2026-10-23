# Jobs

Notation follows the [APIs index](./index.md#notation).

APIs that accept work to be completed later `MUST` return `202 Accepted` with a **job**: a resource
representing the accepted work and its progress. This applies to creates, updates, deletes, actions,
and bulk operations alike.

:::info

The job resource, including its fields, its states, and how a caller follows its progress, is not
yet defined.

:::
