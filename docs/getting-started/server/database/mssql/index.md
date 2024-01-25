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

You should run the `migrate.ps1` helper script whenever you sync with the `main` branch or create a
new migration script. `migrate.ps1` tracks run migrations in `migrations_$DATABASENAME`, which is
typically `migrations_vault_dev`.

## Modifying the database

The process for modifying the database is described in
[Migrations](./../../../../contributing/database-migrations/).

## Troubleshooting

### New database, but skipping migrations

Migration records are stored by vault database name, which is typically either `vault_dev` or
`vault_dev_self_host`. If you’ve deleted these in order to start fresh, you should delete the
corresponding `migrations_$DATABASENAME` database.
