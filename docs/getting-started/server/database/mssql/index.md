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
[Migrations](./../../../../contributing/database-migrations/).

## Running self-hosted locally

### SQL Server (Dapper)

To set up a self-hosted instance locally, you should follow the instructions
[here](../self-hosted/). Assuming you've defined your user secrets as described in the
[User Secrets](../../user-secrets/) documentation, you'll find that if you don't define the
`readOnlyConnectionString` override as shown below, your self-hosted instance will fall back to use
the regular/default connection string. This can result in unexpected behavior as your self-hosted
instance will be reading from the wrong database.

You can simply copy whatever value you have for `connectionString` and copy it to
`readOnlyConnectionString` in your secrets.json file.

```json
{
  "dev:selfHostOverride:globalSettings:sqlServer:connectionString": "Server=localhost;Database=vault_dev_self_host;User Id=sa;Password=your_password_here",
  "dev:selfHostOverride:globalSettings:sqlServer:readOnlyConnectionString": "Server=localhost;Database=vault_dev_self_host;User Id=sa;Password=your_password_here"
}
```
