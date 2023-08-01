---
sidebar_position: 1
---

# MSSQL

:::info

For instructions on how to apply database migrations, please refer to the
[Getting Started](../../getting-started/server/database/mssql) documentation.

:::

## SQL Database project

:::warning

TODO: Update

:::

We use a [SQL Database project][SSDT] (`sqlproj`) to develop the database locally. This means we
have an up-to-date representation of the database in `src/Sql`, and any modifications needs to be
represented there as well. These projects behave slightly different depending on which OS you are
using.

=== "Windows" Visual Studio provides built in support for Database projects with their SQL Server
Data Tools. This is usually the optimal development environment with built in support for schema
comparison and much more.

=== "Mac & Linux" Visual Studio for Mac unfortunately does not support Database projects, however
you may instead use [Visual Studio Code](vscode) or [Azure Data Studio](azureds) with the
[SQL Database Projects](SDPE) extension, which provides schema comparison and more. You may also
modify the `.sql` files directly with any text editor.

    Do note that when adding or renaming SQL files you might need to manually update the references
    in the `.sqlproj` file.

To make a database change, start by modify the `.sql` files in `src/Sql/dbo`. These changes will
also needs to be applied in a migration script. Migration scrips lives in `util/Migrator/DbScripts`.

You can either generate the migration scripts automatically using the _Schema Comparison_
functionality or by manually writing them. Do note that the automatic method will only take you so
far and it will need improved to adhere to the code styles.

## Modifying the database

Since we follow [Evolutionary Database Design _(EDD)_](./edd.md) any migration that modifies
existing columns most likely needs to be split into at least two parts. A backwards compatible
transition phase, and a non-backwards compatible.

### Best Practices

When writing a migration script there are a couple of best practices we follow. Please check the
[T-SQL Code Style][code-style-sql] for more details. But the most important aspect is ensuring the
script can be re-run on the database multiple times without producing any errors or data loss.

### Backwards Compatible

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

### Data Migration

We now need to write a script that migrates any data from the old location to the new locations.
This script should ideally be written in a way that supports batching, i.e. execute for X number of
rows at a time. This helps avoiding locking the database. When running the scripts against the
server please keep running it until it affects `0 rows`.

### Non-backwards Compatible

These changes should be written from the perspective of "all data has been migrated". And any old
_Stored Procedures_ that were kept around for backwards compatibility should be removed. Any logic
for syncing old and new data should also be removed in this step.

Since `Sql/dbo` represents the current state we need to introduce a "future" state which we will
call `dbo_future`.

1. Copy the relevant `.sql` files from `src/Sql/dbo` to `src/Sql/dbo_future`.
2. Remove the backwards compatibility which is no longer needed.
3. Write a new Migration and place it in `src/Migrator/DbScripts_future`, name it
   `YYYY-0M-FutureMigration.sql`.
   - Typically migrations are designed to be run in sequence. However since the migrations in
     DbScripts_future can be run out of order, care must be taken to ensure they remain compatible
     with the changes to DbScripts. In order to achieve this we only keep a single migration, which
     executes all backwards incompatible schema changes.

[repository]:
  https://docs.microsoft.com/en-us/dotnet/architecture/microservices/microservice-ddd-cqrs-patterns/infrastructure-persistence-layer-design
[dapper]: https://github.com/DapperLib/Dapper
[code-style-sql]: ../../code-style/index.md#t-sql
[SSDT]:
  https://docs.microsoft.com/en-us/previous-versions/sql/sql-server-data-tools/hh272702(v=vs.103)?redirectedfrom=MSDN
[vscode]: https://code.visualstudio.com/
[azureds]:
  https://docs.microsoft.com/en-us/sql/azure-data-studio/download-azure-data-studio?view=sql-server-ver16
[SDPE]:
  https://docs.microsoft.com/en-us/sql/azure-data-studio/extensions/sql-database-project-extension?view=sql-server-ver16
