# Standard fields

When relevant, resources `MUST` use these names: `createdAt`, `createdBy`, `updatedAt`, `updatedBy`,
`deletedAt`, `deletedBy` (see [soft deletes](./deleting-resources.md#soft-deletes)), and `version`
(see [optimistic concurrency](./optimistic-concurrency.md)). Dates are ISO 8601 strings, and `*By`
fields hold the ID of the user responsible.
