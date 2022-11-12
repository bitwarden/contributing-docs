# Migrations

:::note

We recommend reading [Evolutionary Database Design](./edd.md) first, since it has a major impact in
how we write migrations.

:::

## Repositories

We use the [Repository pattern][repository] with the MSSQL repositories being written using
[Dapper][dapper]. Each repository method in turn calls a _Stored Procedure_, which primarily fetches
data from _Views_.

## Changing the database

As we follow [Evolutionary Database Design](./edd.md) each change needs to be split into two parts.
A backwards compatible transition phase, and a non-backwards compatible.

### Best Practices

When writing a migration script there are a couple of best practices we follow. Please check the
[T-SQL Code Style][code-style-sql] for more details.

### Backwards Compatible

1. Modify the source `.sql` files in `src/Sql/dbo`.
2. Write a migration script, and place it in `util/Migrator/DbScripts`. Each script must be prefixed
   with the current date.

### Non-backwards Compatible

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
[code-style-sql]: ../../code-style/sql.md
