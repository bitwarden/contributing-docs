---
sidebar_position: 2
---

# Database migrations

## Applying migrations

We use a `migrate.ps1` PowerShell script to apply migrations to the local development database. This
script handles the different database providers that we support.

For instructions on how to use `migrate.ps1`, see the Getting Started section for
[MSSQL](../../getting-started/server/database/mssql/index.md#updating-the-database) and
[Entity Framework](../../getting-started/server/database/ef/index.mdx#migrations)

## Creating migrations for new changes

Any database change must be scripted as a migration for both our primary DBMS - MSSQL - as well as
for Entity Framework. Follow the instructions below for each provider.

### MSSQL migrations

:::tip

We recommend reading [Evolutionary Database Design](./edd.mdx) and [T-SQL Code
Style][code-style-sql] first, since they have a major impact in how we write migrations.

:::

:::info

The separate database definitions in `src/Sql/.../dbo` serve as a "master" reference for the
intended and final state of the database at that time. This is crucial because the state of database
definitions at the current moment may differ from when a migration was added in the past. These
definitions act as a lint and validation step to ensure that migrations work as expected, and the
separation helps maintain clarity and accuracy in database schema management and synchronization
processes.

Additionally, an
[SQL database project](https://learn.microsoft.com/en-us/azure-data-studio/extensions/sql-database-project-extension-sdk-style-projects)
is in place; however, instead of using the auto-generated migrations from
[DAC](https://learn.microsoft.com/en-us/sql/relational-databases/data-tier-applications/data-tier-applications?view=sql-server-ver16),
we manually write migrations. This approach is chosen to enhance performance and prevent accidental
data loss, which is why we have both an `sqlproj` and standalone migrations.

:::

In accordance with the tenets of [Evolutionary Database Design](./edd.mdx), each change needs to be
considered to be split into two parts:

1. A backwards-compatible transition migration
2. A non-backwards-compatible final migration

It is possible that a change may not require a non-backwards-compatible end phase (i.e. all changes
may be backwards-compatible in their final form). In that case, only one phase of changes is
required.

#### Backwards compatible migration

1. Modify the source `.sql` files in `src/Sql/dbo`.
2. Write a migration script, and place it in `util/Migrator/DbScripts`. Each script must be prefixed
   with the current date.

#### Non-backwards compatible migration

1. Copy the relevant `.sql` files from `src/Sql/dbo` to `src/Sql/dbo_finalization`.
2. Remove the backwards compatibility that is no longer needed.
3. Write a new Migration and place it in `src/Migrator/DbScripts_finalization`. Name it
   `YYYY-0M-FinalizationMigration.sql`.
   - Typically migrations are designed to be run in sequence. However since the migrations in
     DbScripts_finalization can be run out of order, care must be taken to ensure they remain
     compatible with the changes to DbScripts. In order to achieve this we only keep a single
     migration, which executes all backwards incompatible schema changes.

### EF migrations

If you alter the database schema, you must create an EF migration script to ensure that EF databases
keep pace with these changes. Developers must do this and include the migrations with their PR.

To create these scripts, you must first update your data model in `Core/Entities` as desired. This
will be used to generate the migrations for each of our EF targets.

Once the model is updated, navigate to the `dev` directory in the `server` repo and execute the
`ef_migrate.ps1` PowerShell command. You should provide a name for the migration as the only
parameter:

```bash
pwsh ef_migrate.ps1 [NAME_OF_MIGRATION]
```

This will generate the migrations, which should then be included in your PR.

### [Not Yet Implemented] Manual MSSQL migrations

There may be a need for a migration to be run outside of our normal update process. These types of
migrations should be saved for very exceptional purposes. One such reason could be an Index rebuild.

1. Write a new Migration with a prefixed current date and place it in
   `src/Migrator/DbScripts_manual`
2. After it has been run against our Cloud environments and we are satisfied with the outcome,
   create a PR to move it to `DbScripts`. This will enable it to be run by our Migrator processes in
   self-host and clean installs of both cloud and self-host environments

[code-style-sql]: ../code-style/sql.md
