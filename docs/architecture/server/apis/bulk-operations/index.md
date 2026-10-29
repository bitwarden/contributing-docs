# Bulk operations

Notation follows the [APIs index](../index.md#notation).

A bulk operation creates, updates, deletes, or acts upon many resources in one request. It is
shorthand for calling the corresponding single-resource API once per resource, and is never a way
around that API's [rules](./per-resource-rules.md).

Every bulk operation has three properties, and every combination of them is legitimate. Business
rules, data volumes, and what the caller needs back decide which combination an API implements. This
standard decides how each combination looks.

| Property                                         | Options                     | Governs                                       |
| ------------------------------------------------ | --------------------------- | --------------------------------------------- |
| [Targeting](./targeting.md)                      | `data`, `ids`, `filter`     | How the caller names the resources.           |
| [Atomicity](./all-or-nothing-and-best-effort.md) | All-or-nothing, best-effort | What happens when some of the resources fail. |
| [Execution](./synchronous-and-asynchronous.md)   | Synchronous, asynchronous   | Whether the caller waits for the outcome.     |

Every bulk API `MUST` document, in its OpenAPI description, the targeting it accepts, the atomicity
modes it supports and which is the default, and whether it responds synchronously, asynchronously,
or both.

All bulk operations use `POST`:

| Operation                          | API path                                  | Targeting                                       |
| ---------------------------------- | ----------------------------------------- | ----------------------------------------------- |
| [Bulk create](./bulk-creates.md)   | `/api/v1/{resource plural}:bulk-create`   | `data`                                          |
| [Bulk update](./bulk-updates.md)   | `/api/v1/{resource plural}:bulk-update`   | `ids` or `filter`, plus `update`                |
| [Bulk replace](./bulk-replaces.md) | `/api/v1/{resource plural}:bulk-replace`  | `data`                                          |
| [Bulk delete](./bulk-deletes.md)   | `/api/v1/{resource plural}:bulk-delete`   | `ids` or `filter`                               |
| [Bulk action](./bulk-actions.md)   | `/api/v1/{resource plural}:bulk-{action}` | `ids` or `filter`, plus `data`, or `data` alone |

Each operation says exactly what it does, can be authorized and validated as a whole, and can be
implemented as one set-based statement where the outcome allows. The `:verb` syntax is credited to
[Google AIP-136](https://google.aip.dev/136).

## Choosing semantics

| When…                                                                                                                | Consider…      |
| -------------------------------------------------------------------------------------------------------------------- | -------------- |
| A partial result would leave related resources inconsistent, or the caller treats the set as one.                    | All-or-nothing |
| Each resource stands alone and the caller can report or retry individual failures, as in an import.                  | Best-effort    |
| The set is small and bounded, and each resource is cheap to process.                                                 | Synchronous    |
| The set is unbounded, or each resource is expensive to process, such as by raising events or calling other services. | Asynchronous   |
