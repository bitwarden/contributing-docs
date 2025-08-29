---
sidebar_position: 1
---

# MSSQL

:::info

For instructions on how to apply database migrations, please refer to the
[Getting Started](../../../getting-started/server/database/mssql/index.md#updating-the-database)
documentation.

:::

## SQL database project

We use a
[SDK-style SQL project](https://learn.microsoft.com/en-us/sql/azure-data-studio/extensions/sql-database-project-extension-sdk-style-projects?view=sql-server-ver16)
(`.sqlproj`) to develop the database locally -- this means we have an up-to-date representation of
the database in `src/Sql`, and any modifications need to be represented there as well. SDK-style SQL
projects are available in Visual Studio Code that provides schema comparison and more. You may also
modify the `.sql` files directly with any text editor.

To make a database change, start by modifying the `.sql` files in `src/Sql/dbo`. These changes will
also need to be applied in a migration script. Migration scripts are located in
`util/Migrator/DbScripts`.

You can either generate the migration scripts automatically using the _Schema Comparison_
functionality or by manually writing them. Do note that the automatic method will only take you so
far and it will need to be manually edited to adhere to the code styles.

For added safeguards we have automated linting and validation to ensure the SQL project is always up
to date with the migrations.

The separate database definitions in `src/Sql/.../dbo` serve as a "master" reference for the
intended and final state of the database at that time. This is crucial because the state of database
definitions at the current moment may differ from when a migration was added in the past. These
definitions act as a lint and validation step to ensure that migrations work as expected, and the
separation helps maintain clarity and accuracy in database schema management and synchronization
processes.

## Modifying the database

In accordance with the tenets of [Evolutionary Database Design](../edd.mdx)) every change must be
considered as split into two parts:

1. A backwards-compatible transition migration
2. A non-backwards-compatible final migration

Most changes are entirely backwards-compatible in their final form. If this is the case, only one
phase of changes is required. With the use of beta testing, partial roll-outs,
[feature flags](../../feature-flags.md), etc. the often-chosen path is to spread a change across
several major releases with a calculated future state that can perform a "cleanup" migration that is
backwards-compatible but still represents an overall-_incompatible_ change beyond the boundaries of
what we need for individual release safety.

### Backwards compatible migration

1. Modify the source `.sql` files in `src/Sql/dbo`.
2. Write a migration script, and place it in `util/Migrator/DbScripts`. Each script must be prefixed
   with the current date.

Tips to ensure backwards compatibility:

- any existing stored procedure accepts the same input parameters and that new parameters have
  nullable defaults
- when a column is renamed the existing stored procedures first check (coalesce) the new location
  before falling back to the old location
- continued updating of the old data columns since in case of a rollback no data should be lost

:::tip

We recommend reading [Building Migration Scripts](building-migration-scripts) before writing you
first migration script, to ensure that you follow best practices for each database entity.

:::

### Non-backwards compatible migration

These changes should be written from the perspective of "all data has been migrated" and any old
stored procedures that were kept around for backwards compatibility should be removed. Any logic for
syncing old and new data should also be removed in this step.

Since the `dbo` schema represents the current state we need to introduce a "future" state that we
will call `dbo_finalization`.

1. Copy the relevant `.sql` files from `src/Sql/dbo` to `src/Sql/dbo_finalization`.
2. Remove the backwards compatibility logic that is no longer needed e.g. dual reads and writes to
   columns.
3. Write a new Migration and place it in `src/Migrator/DbScripts_finalization`. Name it
   `YYYY-0M-FinalizationMigration.sql`.
   - Typically migrations are designed to be run in sequence. However since the migrations in
     `DbScripts_finalization` can be run out of order, care must be taken to ensure they remain
     compatible with the changes to `DbScripts`. In order to achieve this we only keep a single
     migration, which executes all backwards incompatible schema changes.

Upon execution any finalization scripts will be
[automatically moved](../edd.mdx#online-environments) for proper history.
