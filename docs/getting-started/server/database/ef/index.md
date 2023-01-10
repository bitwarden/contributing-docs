# Entity Framework

:::warning

Entity Framework support is still in beta and is not suitable for production databases.

:::

:::info

This page refers to setting up a Bitwarden instance to develop on, for instructions on testing out
our EF deployments for personal use, such as Bitwarden Unified, please see
[the help documentation](https://bitwarden.com/help/install-and-deploy-unified-beta/)

:::

## Background

Entity Framework (EF) is an ORM framework that acts as a wrapper around a database. It allows us to
support multiple (non-MSSQL) databases without having to maintain migration and query scripts for
each.

Our EF implementations currently support Postgres and mySQL.

## Setting up EF databases

The workflow here is broadly the same as with the MSSQL implementation. You will set up the Docker
container, configure user secrets, and then run `migrate.ps1` to run the migrations.

### Requirements

- A working local development server
- Docker
- A way to manage user secrets in the server project - see
  [User Secrets Reference](../../user-secrets.md)
- Database management software (e.g. pgAdmin4 for Postgres or DBeaver for mySQL)
- The `dotnet` cli
- The `dotnet` cli [Entity Framework Core tool](https://docs.microsoft.com/en-us/ef/core/cli/dotnet)

You can have multiple databases configured and switch between them by changing the value of the
`globalSettings:databaseProvider` user secret. You don’t have to delete your connection strings.

### Postgres

1.  In the `dev` folder of your server repository, run:

    ```bash
    docker compose --profile postgres up
    ```

2.  Add the following values to your API and Identity user secrets, changing information like root
    password as needed. If you already have these secrets, make sure you update the existing values
    instead of creating new ones:

    ```json
    "globalSettings:databaseProvider": "postgres",
    "globalSettings:postgreSql:connectionString": "Host=localhost;Username=postgres;Password=example;Database=vault_dev;Include Error Detail=true",
    ```

3.  In the `dev` folder run the following to update the database to the latest migration:

    ```bash
    pwsh migrate.ps1 -postgres
    ```

    The `-postgres` flag on `migrate.ps1` will run `dotnet ef` commands to perform the migrations.

4.  Optional: to verify that everything worked correctly:

    - Check the database tables to make sure everything has been created
    - Run the integration tests from the root of your server project using `dotnet test`. Note: this
      requires a configured MSSQL database. You may also need to also set up a MySql database for
      the tests to pass

### MySql

If you are using an M1 machine, you need to add `platform: linux/amd64` tag to the mysql service on
the docker-compose.yml file.

1.  In the `dev` folder of your server repository, run:

    ```bash
    docker compose --profile mysql up
    ```

2.  Add the following values to your API and Identity user secrets, changing information like root
    password as needed. If you already have these secrets, make sure you update the existing values
    instead of creating new ones:

    ```json
    "globalSettings:databaseProvider": "mysql",
    "globalSettings:mySql:connectionString": "server=localhost;uid=root;pwd=example;database=vault_dev",
    ```

3.  In the `dev` folder run the following to update the database to the latest migration:

    ```bash
    pwsh migrate.ps1 -mysql
    ```

    The `-mysql` flag on `migrate.ps1` will run `dotnet ef` commands to perform the migrations.

    :::note

    `pwsh migrate.ps1 -all` will run migrations for all database providers

    :::

4.  Optional: to verify that everything worked correctly:

    - Check the database tables to make sure everything has been created
    - Run the integration tests from the root of your server project using `dotnet test`. Note: this
      requires a configured MSSQL database. You may also need to also set up a Postgres database for
      the tests to pass

## Testing EF Changes

Since we allow for multiple databases it is important that any changes to EF repositories/models are
tested against all possible databases. You may want to use a database that is different from your
local development database because the tests may add or remove data. To apply migrations to a
database different from your global settings run the following commands from the root of your
repository:

```bash
# EntityFramework CLI Reference: https://learn.microsoft.com/en-us/ef/core/cli/dotnet

# Migrate Postgres database ex connection string: Host=localhost;Username=postgres;Password=SET_A_PASSWORD_HERE_123;Database=vault_dev_test
dotnet ef database update --startup-project util/PostgresMigrations --connection "[POSTGRES_CONNECTION_STRING]"

# Migrate MySql database ex connection string: server=localhost;uid=root;pwd=SET_A_PASSWORD_HERE_123;database=vault_dev_test
dotnet ef database update --startup-project util/MySqlMigrations --connection "[MYSQL_CONNECTION_STRING]"

cd test/Infrastructure.IntegrationTest


# https://learn.microsoft.com/en-us/aspnet/core/security/app-secrets?view=aspnetcore-6.0&tabs=windows#secret-manager
dotnet user-secrets set "Ef:Postgres" "[POSTGRES_CONNECTION_STRING]"
dotnet user-secrets set "Ef:MySql" "[MYSQL_CONNECTION_STRING]"

# You can also set the connection string for your normal development MS SQL database like below
dotnet user-secrets set "Dapper:SqlServer" "[MSSQL_CONNECTION_STRING]"
```

You can then run just those tests from the `test/Infrastructure.IntegrationTest` folder using
`dotnet test`.
