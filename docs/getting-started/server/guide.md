---
sidebar_position: 1
---

# Setup Guide

This page will show you how to set up a local Bitwarden server for development purposes.

The Bitwarden server is comprised of several services that can run independently. For a basic
development setup, you will need the **Api** and **Identity** services.

:::info

Before you start: make sure you’ve installed the recommended
[Tools and Libraries](../tools/index.md), including:

- Docker Desktop
- Visual Studio 2022
- Powershell
- [NET 8.0 SDK](https://dotnet.microsoft.com/download)
- Azure Data Studio

:::

:::info

A guide for developing in VS Code Dev Containers can be found [here](./guide-vscode) if you prefer
developing in a containerized environment.

:::

## Clone the repository

Clone the Bitwarden Server project and navigate to the root of the cloned repository:

```bash
git clone https://github.com/bitwarden/server.git
cd server
```

## Configure Git

1. Configure Git to ignore the Prettier revision:

   ```bash
   git config blame.ignoreRevsFile .git-blame-ignore-revs
   ```

2. _(Optional)_ Set up the pre-commit `dotnet format` hook:

   ```bash
   git config --local core.hooksPath .git-hooks
   ```

   Formatting requires a full build, which may be too slow to do every commit. As an alternative,
   you can run `dotnet format` from the command line when convenient (e.g. before requesting a PR
   review).

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

3.  Set the `MSSQL_PASSWORD` variable. This will be the password for your MSSQL database server.

    :::caution

    Your MSSQL password must comply with the following
    [password complexity guidelines](https://docs.microsoft.com/en-us/sql/relational-databases/security/password-policy?view=sql-server-ver15#password-complexity)

    - It must be at least eight characters long.
    - It must contain characters from three of the following four categories:
    - Latin uppercase letters (A through Z)
    - Latin lowercase letters (a through z)
    - Base 10 digits (0 through 9)
    - Non-alphanumeric characters such as: exclamation point (!), dollar sign ($), number sign (#),
      or percent (%).

    :::

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

    Which starts MSSQL, mail, and Azurite container. The additional Azurite container is required to
    emulate Azure used by the Bitwarden cloud environment.

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

### SQL Server

You can connect to the Microsoft SQL Server using Azure Data Studio with the following credentials:

- Server: localhost
- Port: 1433
- Username: sa
- Password: (the password you set in `dev/.env`)

### Mailcatcher

The server uses emails for many user interactions. We provide a pre-configured instance of
[MailCatcher](https://mailcatcher.me/), which catches any outbound email and prevents it from being
sent to real email addresses. You can open its web interface at
[http://localhost:1080](http://localhost:1080).

### Azurite

:::note

This section applies to Bitwarden developers only.

:::

[Azurite](https://github.com/Azure/Azurite) is an emulator for Azure Storage API and supports Blob,
Queues and Table storage. We use it to minimize the online dependencies required for developing in a
cloud environment.

To bootstrap the local Azurite instance, navigate to the `dev` directory in your server repo and run
the following commands:

1.  Install the `Az` module. This may take a few minutes to complete without providing any user
    feedback (it may appear frozen).

    ```bash
    pwsh -Command "Install-Module -Name Az -Scope CurrentUser -Repository PSGallery -Force"
    ```

2.  Run the setup script:

    ```bash
    pwsh setup_azurite.ps1
    ```

## Configure User Secrets

[User secrets](https://docs.microsoft.com/en-us/aspnet/core/security/app-secrets?view=aspnetcore-6.0)
are a method for managing application settings on a per-developer basis. They override the settings
in `appSettings.json` of each project. Your user secrets file should match the structure of the
`appSettings.json` file for the settings you intend to override.

We provide a helper script which simplifies setting user secrets for all projects in the server
repository.

1.  Get a template `secrets.json`. We need to get an initial version of `secrets.json`, which you
    will modify for your own secrets values.

    <Community>

    Navigate to the `dev` folder in your server repo and copy the example `secrets.json` file.

    ```bash
    cp secrets.json.example secrets.json
    ```

    </Community>

    <Bitwarden>

    - Copy the user secrets file from the shared Development collection (Your Bitwarden Vault) into
      the `dev` folder.
    - If you don't have access to the Development collection, contact our IT Manager to arrange
      access. Make sure you have first set up a Bitwarden account using your company email address.
    - This `secrets.json` is configured to use the dockerized Azurite and MailCatcher instances and
      is recommended for this guide.

    </Bitwarden>

2.  Update `secrets.json` with your own values:

    - `sqlServer` > `connectionString`: insert your password where indicated

    <Community>

    - `installation` > `id` and `key`:
      [request a hosting installation Id and Key](https://bitwarden.com/host/) and insert them here
    - `licenseDirectory`: set this to an empty directory, this is where uploaded license files will
      be stored.

    </Community>

3.  Once you have your `secrets.json` complete, run the below command to add the secrets to each
    Bitwarden server project.

    ```bash
    pwsh setup_secrets.ps1
    ```

The helper script also supports an optional `-clear` switch which removes all existing settings
before re-applying them:

```bash
pwsh setup_secrets.ps1 -clear
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

<Bitwarden>

## Install Licensing Certificate

To run your local server environment as a licensed instance, you will need to download the
`Licensing Certificate - Dev` from the shared Engineering collection and install it. This can be
done by double-clicking on the downloaded certificate.

:::note

Mac users: When prompted to save the downloaded certificate and PFX file in Keychain Access be sure
to select "Default Keychain > login" from the dropdown otherwise they will not be found when
attempting to "Build and Run the Server".

:::

1. Log in to your company-issued Bitwarden account
2. On the "Vaults" page, scroll down to the "Licensing Certificate - Dev" item
3. View attachments and download both files
4. Go to Keychain Access and set the dev.cer certificate to "Always Trust"
5. The dev.pfx file will ask for a password. You can get this by clicking and opening the Licensing
   Certificate - Dev item in the vault

</Bitwarden>

## Build and Run the Server

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
8.  Connect a client to your local server by configuring the client’s Api and Identity endpoints.
    Refer to
    [https://bitwarden.com/help/article/change-client-environment/](https://bitwarden.com/help/article/change-client-environment/)
    and the instructions for each client in the Contributing Documentation.

:::info

If you cannot connect to the Api or Identity projects, check the terminal output to confirm the
ports they are running on.

:::

:::note

We recommend continuing with the [Web Vault](../clients/web-vault/index.mdx) afterwards, since many
administrative operations can only be performed in it.

:::

## Debugging

:::info

On macOS, you must run `dotnet restore` for each Project before it can be launched in the a
debugger.

:::

### Visual Studio

To debug:

- On Windows, right-click on each project > click **Debug** > click **Start New Instance**
- On macOS, right-click each project > click **Start Debugging Project**

### Rider

Launch the Api project and the Identity project by clicking the "Play" button for each project
separately.
