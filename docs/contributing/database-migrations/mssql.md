---
sidebar_position: 1
---

# MSSQL

:::info

For instructions on how to apply database migrations, please refer to the
[Getting Started](../../getting-started/server/database/mssql/index.md) documentation.

:::

## SQL database project

We use a [SDK-style SQL project][MSBuildSQL] (`sqlproj`) to develop the database locally. This means
we have an up-to-date representation of the database in `src/Sql`, and any modifications needs to be
represented there as well. Since SDK-style SQL projects are still in preview the tooling is not yet
available Visual Studio. However it is available in [Visual Studio Code][vscode] and [Azure Data
Studio][azureds] with the [SQL Database Projects][SDPE] extension, which provides schema comparison
and more. You may also modify the `.sql` files directly with any text editor.

To make a database change, start by modifying the `.sql` files in `src/Sql/dbo`. These changes will
also need to be applied in a migration script. Migration scripts are located in
`util/Migrator/DbScripts`.

You can either generate the migration scripts automatically using the _Schema Comparison_
functionality or by manually writing them. Do note that the automatic method will only take you so
far and it will need to be manually edited to adhere to the code styles.

## Modifying the database

Since we follow [Evolutionary Database Design _(EDD)_](./edd.mdx), any migration that modifies
existing columns most likely needs to be split into at least two parts: a backwards compatible
transition phase, and a non-backwards compatible phase.

### Best practices

When writing a migration script there are a couple of best practices we follow. Please check the
[T-SQL Code Style][code-style-sql] for more details. But the most important aspect is ensuring the
script can be re-run on the database multiple times without producing any errors or data loss.

### Backwards compatible

Since we follow _EDD_ the first migration needs to retain backwards compatibility with existing
production code.

1. Modify the source `.sql` files in `src/Sql/dbo`.
2. Write a migration script, and place it in `util/Migrator/DbScripts`. Each script _must_ be
   prefixed with the current date.

Please take care to ensure any existing _Stored Procedure_ accepts the same input parameters which
ensures backwards compatibility. In the case a column is renamed, moved care needs to be taken to
ensure the existing sprocs first checks the new location before falling back to the old location. We
also need to ensure we continue updating the old data columns, since in case a rollback is necessary
no data should be lost.

### Data migration

We now need to write a script that migrates any data from the old location to the new locations.
This script should ideally be written in a way that supports batching, i.e. execute for X number of
rows at a time. This helps avoiding locking the database. When running the scripts against the
server please keep running it until it affects `0 rows`.

### Non-backwards compatible

These changes should be written from the perspective of "all data has been migrated". And any old
_Stored Procedures_ that were kept around for backwards compatibility should be removed. Any logic
for syncing old and new data should also be removed in this step.

Since `Sql/dbo` represents the current state we need to introduce a "future" state which we will
call `dbo_finalization`.

1. Copy the relevant `.sql` files from `src/Sql/dbo` to `src/Sql/dbo_finalization`.
2. Remove the backwards compatibility which is no longer needed.
3. Write a new Migration and place it in `src/Migrator/DbScripts_finalization`, name it
   `YYYY-0M-FinalizationMigration.sql`.
   - Typically migrations are designed to be run in sequence. However since the migrations in
     DbScripts_future can be run out of order, care must be taken to ensure they remain compatible
     with the changes to DbScripts. In order to achieve this we only keep a single migration, which
     executes all backwards incompatible schema changes.

### [Not Yet Implemented] Manual MSSQL migrations

There may be a need for a migration to be run outside of our normal update process. These types of
migrations should be saved for very exceptional purposes. One such reason could be an Index rebuild.

1. Write a new Migration with a prefixed current date and place it in
   `src/Migrator/DbScripts_manual`
2. After it has been run against our Cloud environments and we are satisfied with the outcome,
   create a PR to move it to `DbScripts`. This will enable it to be run by our Migrator processes in
   self-host and clean installs of both cloud and self-host environments

[repository]:
  https://docs.microsoft.com/en-us/dotnet/architecture/microservices/microservice-ddd-cqrs-patterns/infrastructure-persistence-layer-design
[dapper]: https://github.com/DapperLib/Dapper
[code-style-sql]: ../code-style/index.md#t-sql
[MSBuildSQL]:
  https://learn.microsoft.com/en-us/sql/azure-data-studio/extensions/sql-database-project-extension-sdk-style-projects?view=sql-server-ver16
[vscode]: https://code.visualstudio.com/
[azureds]:
  https://docs.microsoft.com/en-us/sql/azure-data-studio/download-azure-data-studio?view=sql-server-ver16
[SDPE]:
  https://docs.microsoft.com/en-us/sql/azure-data-studio/extensions/sql-database-project-extension?view=sql-server-ver16
