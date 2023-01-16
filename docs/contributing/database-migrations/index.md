---
sidebar_position: 2
---

# Database Migrations

## MSSQL Migrations

:::tip

We recommend reading [Evolutionary Database Design](./edd.mdx) first, since it has a major impact in
how we write migrations.

:::

### Instructions

When writing a migration script there are several best practices we follow. Please check the [T-SQL
Code Style][code-style-sql] for more details.

Also, as we adhere to [Evolutionary Database Design](./edd.mdx), each change needs to be considered
to be split into two parts:

1. A backwards-compatible transition migration
2. A non-backwards-compatible final migration

It is possible that a change may not require a non-backwards-compatible end phase (i.e. all changes
may be backwards-compatible in their final form). In that case, only one phase of changes is
required.

### Backwards Compatible Migration

1. Modify the source `.sql` files in `src/Sql/dbo`.
2. Write a migration script, and place it in `util/Migrator/DbScripts`. Each script must be prefixed
   with the current date.

### Non-backwards Compatible Migration

1. Copy the relevant `.sql` files from `src/Sql/dbo` to `src/Sql/dbo_future`.
2. Remove the backwards compatibility that is no longer needed.
3. Write a new Migration and place it in `src/Migrator/DbScripts_future`. Name it
   `YYYY-0M-FutureMigration.sql`.
   - Typically migrations are designed to be run in sequence. However since the migrations in
     DbScripts_future can be run out of order, care must be taken to ensure they remain compatible
     with the changes to DbScripts. In order to achieve this we only keep a single migration, which
     executes all backwards incompatible schema changes.

## EF Migrations

If you alter the database schema, you must create an EF migration script to ensure that EF databases
keep pace with these changes. Developers must do this and include the migrations with their PR.

### Instructions

1.  Update your data model in `Core/Entities` as desired
2.  Ensure your user secrets in `API` have the correct provider configured in the `databaseProvider`
    field. The value should match the provider you are generating migrations for.
3.  Open a terminal in the root of the project you want to generate a migration for (either
    `util/PostgresMigrations` or `util/MySqlMigrations`)
4.  Generate the migration. This should have the same name as the corresponding MSSQL migration
    (except for the date, which the the tool will prepend automatically):

    ```bash
    dotnet ef migrations add [NAME_OF_MIGRATION]
    ```

[repository]:
  https://docs.microsoft.com/en-us/dotnet/architecture/microservices/microservice-ddd-cqrs-patterns/infrastructure-persistence-layer-design
[dapper]: https://github.com/DapperLib/Dapper
[code-style-sql]: ../code-style/sql.md
