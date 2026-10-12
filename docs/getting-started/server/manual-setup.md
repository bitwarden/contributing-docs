---
sidebar_position: 1.5
---

# Manual Setup

This page explains how to run the server without [Aspire](./guide.md#run-with-aspire) by starting
the Docker containers, helper scripts, and services yourself. Aspire is the recommended setup, so
only use this page if Aspire doesn't work for you.

Before you start, complete the [Setup Guide](./guide.md) up to and including
[Configure user secrets](./guide.md#configure-user-secrets).

## Configure Docker

We provide a [Docker Compose](https://docs.docker.com/compose/) configuration, which is used during
development to provide the required dependencies. This is split up into multiple service profiles to
facilitate easy customization.

1.  Some Docker settings are configured in the environment file, `dev/.env`. Copy the example
    environment file:

    ```bash
    cd dev
    cp .env.example .env
    ```

2.  Open `.env` with your preferred editor.

3.  Set the `MSSQL_PASSWORD` variable to the SQL Server password you chose when you
    [configured user secrets](./guide.md#configure-user-secrets).

4.  You can change the other variables or use their default values. Save and quit this file.
5.  Start the Docker containers.

    Using PowerShell, navigate to the cloned server repo location, into the `dev` folder and run the
    docker command below.

    <Community>

    ```bash
    docker compose --profile mssql --profile mail up -d
    ```

    Which starts the MSSQL and local mail server containers, which should be suitable for most
    community contributions.

    </Community>

    <Bitwarden>

    ```bash
    docker compose --profile cloud --profile mail up -d
    ```

    Which starts MSSQL, mail, Redis, and Azurite container. The additional Azurite container is
    required to emulate Azure used by the Bitwarden cloud environment.

    </Bitwarden>

After you’ve run the `docker compose` command, you can use the
[Docker Dashboard](https://docs.docker.com/desktop/dashboard/) to manage your containers. You should
see your containers running under the `bitwardenserver` group.

:::caution

Changing `MSSQL_PASSWORD` variable after first running docker compose will require a re-creation of
the storage volume.

**Warning: this will delete your development database.**

To do this, run

```bash
docker compose --profile mssql down
docker volume rm bitwardenserver_mssql_dev_data
```

After that, rerun the docker compose command from Step 5.

:::

## Bootstrap Azurite

:::note

This section applies to Bitwarden developers only.

:::

To bootstrap the local [Azurite](./guide.md#azurite) instance, navigate to the `dev` directory in
your server repo and run the following commands:

1.  Install the `Az` module. This may take a few minutes to complete without providing any user
    feedback (it may appear frozen).

    ```bash
    pwsh -Command "Install-Module -Name Az -Scope CurrentUser -Repository PSGallery -Force"
    ```

2.  Run the setup script:

    ```bash
    pwsh setup_azurite.ps1
    ```

## Create database

You now have the MSSQL server running in Docker. The next step is to create the database that will
be used by the Bitwarden server.

We provide a helper script which will create the development database `vault_dev` and also run all
migrations.

Navigate to the `dev` folder in your server repo and perform the following steps:

1.  Create the database and run all migrations:

    ```bash
    pwsh migrate.ps1
    ```

2.  You should receive confirmation that the migration scripts have run successfully:

    ```
    info: Bit.Migrator.DbMigrator[12482444]
          Migrating database.
    info: Bit.Migrator.DbMigrator[12482444]
          Migration successful.
    ```

:::note

You’ll need to re-run the migration helper script regularly to keep your local development database
up-to-date. See [MSSQL Database](./database/mssql/index.md) for more information.

:::

## Build and run the server

You are now ready to build and run your development server.

1.  Open a new terminal window in the root of the repository.
2.  Restore the nuget packages required for the Identity service:

    ```bash
    cd src/Identity
    dotnet restore
    ```

3.  Start the Identity service:

    ```bash
    dotnet run
    ```

4.  Test that the Identity service is alive by navigating to
    [http://localhost:33656/.well-known/openid-configuration](http://localhost:33656/.well-known/openid-configuration)
5.  In another terminal window, restore the nuget packages required for the Api service:

    ```bash
    cd src/Api
    dotnet restore
    ```

6.  Start the Api Service:

    ```bash
    dotnet run
    ```

7.  Test that the Api service is alive by navigating to
    [http://localhost:4000/alive](http://localhost:4000/alive)

When the services are running, continue with [Client connection](./guide.md#client-connection).

## Debugging

:::info

On macOS, you must run `dotnet restore` for each Project before it can be launched in the a
debugger.

:::

### Visual Studio

To debug, right-click on each project > click **Debug** > click **Start New Instance**.

### Rider

Launch the Api project and the Identity project by clicking the "Play" button for each project
separately.
