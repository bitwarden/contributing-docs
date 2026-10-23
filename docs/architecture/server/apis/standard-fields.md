# Standard fields

Notation follows the [APIs index](./index.md#notation).

When relevant, resources `MUST` use the following field names:

| Field          | Description                                                                                                           | Type     |
| -------------- | --------------------------------------------------------------------------------------------------------------------- | -------- |
| `createdBy`    | The ID of the user that created the resource.                                                                         | `string` |
| `creationDate` | The date/time the resource was created, in ISO 8601 format.                                                           | `string` |
| `deletedBy`    | The ID of the user that deleted the resource.                                                                         | `string` |
| `deletedDate`  | The date/time the resource was deleted, in ISO 8601 format. See [Soft deletes](./deleting-resources.md#soft-deletes). | `string` |
| `revisionDate` | The date/time the resource was last updated, in ISO 8601 format.                                                      | `string` |
| `updatedBy`    | The ID of the user that last updated the resource.                                                                    | `string` |
| `version`      | The current version of the resource. See [Optimistic concurrency](./optimistic-concurrency.md).                       | `string` |
