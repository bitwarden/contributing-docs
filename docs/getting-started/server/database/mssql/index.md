---
sidebar_position: 1
---

# MSSQL

Bitwarden primarily stores data in MSSQL (Microsoft SQL Server). The data access layer in the Server
is written using [Dapper](https://github.com/DapperLib/Dapper) which is a lightweight object mapper
for .NET.

## Creating the database

See [Server Setup Guide](../../guide.md).

## Updating the database

The `dev/migrate.ps1` helper script uses our
[MsSql Migrator Utility](https://github.com/bitwarden/server/tree/main/util/MsSqlMigratorUtility) to
run migrations. You should run the helper script whenever you sync with the `main` branch or create
a new migration script. Migrations that have already been run are tracked in the `Migration` table
of your database.

## Modifying the database

The process for modifying the database is described in
[Migrations](./../../../../contributing/database-migrations/mssql.md).
