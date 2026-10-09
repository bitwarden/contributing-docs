---
sidebar_position: 1
---

# Setup Guide

This page will show you how to set up a local Bitwarden server for development purposes.

The Bitwarden server is comprised of several services that can run independently. For a basic
development setup, you will need the **Api** and **Identity** services.

There are two ways to run the server locally:

- **[Aspire](#run-with-aspire) (recommended):** the `AppHost` project in the server repository uses
  [.NET Aspire](https://aspire.dev) to start the supporting containers, apply your user secrets,
  migrate the database, and run every server service from a single command.
- **[Manual setup](#run-manually):** you start the Docker Compose containers, run the helper
  scripts, and launch each service yourself. Use this if you need an
  [Entity Framework database](./database/ef/index.mdx) or another container that Aspire doesn't
  manage.

Both approaches share the same first steps and use the same `dev/secrets.json` file, so you can
switch between them.

:::info

Before you start: make sure you’ve installed the recommended
[Tools and Libraries](../tools/index.md), including:

- Docker Desktop
- Visual Studio 2022
- Powershell
- [.NET 10 SDK](https://dotnet.microsoft.com/download)
- [Rust](https://www.rust-lang.org/tools/install) latest stable version - (preferably installed via
  [rustup](https://rustup.rs/))
- Your preferred database management tool

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

## Configure user secrets

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
    cd dev
    cp secrets.json.example secrets.json
    ```

    </Community>

    <Bitwarden>
    - Copy the user secrets file from the shared Development collection (Your Bitwarden Vault) into
      the `dev` folder.
    - If you don't have access to the Development collection, contact our IT Manager to arrange
      access. Make sure you have first set up a Bitwarden account using your company email address.
    - This `secrets.json` is configured to use the local Azurite and MailCatcher instances and is
      recommended for this guide.

    </Bitwarden>

2.  Choose a password for your local SQL Server. You will use it for the SQL Server `sa` account in
    either setup.

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

3.  Update `secrets.json` with your own values:
    - `sqlServer` > `connectionString`: insert your SQL Server password where indicated

    <Community>
    - `installation` > `id` and `key`:
      [request a hosting installation Id and Key](https://bitwarden.com/host/) and insert them here
    - `licenseDirectory`: set this to an empty directory, this is where uploaded license files will
      be stored.

    </Community>

    <Bitwarden>
    - `licenseCertificatePath` and `licenseCertificatePassword`: to run your local server as a
      licensed instance, download the `Licensing Certificate - Dev` from the shared Engineering
      collection:
      1. Log in to your company-issued Bitwarden account
      2. On the "Vaults" page, scroll down to the "Licensing Certificate - Dev" item
      3. View attachments and only download `dev.pfx`
      4. Create a `~/.secrets/` folder and place `dev.pfx` inside
      5. Add the following under `globalSettings` in `secrets.json`, substituting your own path to
         `dev.pfx` and the password from the "Licensing Certificate - Dev" vault item:

         ```json
         "licenseCertificatePath": "/Users/<your name>/.secrets/dev.pfx",
         "licenseCertificatePassword": "<password from the vault item>"
         ```

    :::warning

    Do not import the "Licensing Certificate - Dev" into your keychain. Doing so may compromise all
    TLS traffic on your development machine.

    :::

    </Bitwarden>

4.  Once you have your `secrets.json` complete, run the below command from the `dev` folder to add
    the secrets to each Bitwarden server project.

    ```bash
    pwsh setup_secrets.ps1
    ```

The helper script also supports an optional `-clear` switch which removes all existing settings
before re-applying them:

```bash
pwsh setup_secrets.ps1 -clear
```

:::note

Aspire runs `setup_secrets.ps1 -clear` every time it starts. If you use Aspire, make your changes in
`dev/secrets.json` rather than with `dotnet user-secrets set` on an individual project, because
per-project changes are cleared on the next run.

:::

## Run with Aspire

The `AppHost` project orchestrates the whole local environment. When you start it, Aspire:

- starts SQL Server, Azurite, MailCatcher, and Redis containers
- applies `dev/secrets.json` to every project by running `setup_secrets.ps1 -clear`
- creates and migrates the database by running `migrate.ps1`
- bootstraps Azurite by running `setup_azurite.ps1`
- starts the Admin, Api, Billing, Events, EventsProcessor, Icons, Identity, Notifications, Scim, and
  Sso services once their dependencies are ready

The [AppHost README](https://github.com/bitwarden/server/blob/main/AppHost/README.md) contains the
full configuration reference.

### Set up Aspire

1.  Stop any Docker Compose containers from a previous manual setup. Aspire uses the same host ports
    (for example 1433 for SQL Server and 1080 for MailCatcher) and won't start while they are in
    use. From the `dev` folder, run:

    ```bash
    docker compose --profile cloud --profile mail --profile idp down
    ```

    :::note

    Aspire creates its own SQL Server data volume. Data in your Docker Compose database is not
    carried over.

    :::

2.  Install the PowerShell `Az` module, which the Azurite setup script needs. This may take a few
    minutes to complete without providing any user feedback (it may appear frozen).

    ```bash
    pwsh -Command "Install-Module -Name Az -Scope CurrentUser -Repository PSGallery -Force"
    ```

3.  Trust the ASP.NET Core development certificate, which the Aspire dashboard uses for HTTPS:

    ```bash
    dotnet dev-certs https --trust
    ```

4.  From the `dev` folder, navigate to the `AppHost` folder and store your SQL Server password in
    the AppHost's user secrets. This must be the same password you put in the `sqlServer` connection
    string in `secrets.json`.

    ```bash
    cd ../AppHost
    dotnet user-secrets set "Database:Password" "<your SQL Server password>"
    ```

    :::warning

    Keep passwords and tokens in user secrets. Don't add them to
    `AppHost/appsettings.Development.json`, which is checked in.

    :::

### Start the server

1.  From the `AppHost` folder, run:

    ```bash
    dotnet run
    ```

    :::tip

    If you have the [Aspire CLI](https://aspire.dev) installed, you can run `aspire run` from the
    root of the repository instead.

    :::

2.  The Aspire dashboard opens in your browser at
    [https://localhost:17271](https://localhost:17271). It shows the status, logs, traces, and
    environment variables of every resource.
3.  Wait for `setup-secrets` and `run-db-migrations` to finish. The services wait for both and then
    start.
4.  Test that the Identity service is alive by navigating to
    [http://localhost:33656/.well-known/openid-configuration](http://localhost:33656/.well-known/openid-configuration)
5.  Test that the Api service is alive by navigating to
    [http://localhost:4000/alive](http://localhost:4000/alive)

Aspire runs the database migrations and re-applies `dev/secrets.json` on every start. After you pull
changes or edit `secrets.json`, restart the AppHost, or restart the `setup-secrets` or
`run-db-migrations` resource from the dashboard.

To stop the server, press `Ctrl+C` in the terminal running the AppHost. The SQL Server, Azurite,
MailCatcher, and Redis containers are persistent and keep running between sessions, so later starts
are faster.

### Optional resources

Some resources don't start automatically. Start them from the Aspire dashboard when you need them:

- `web-frontend` runs the [web vault](../clients/web-vault/index.mdx) from a sibling `clients`
  checkout. You still need to complete the web vault setup, including `npm ci`.
- `idp` runs a SAML identity provider for [SSO](./sso/index.md) development.

To tunnel the Billing service through ngrok for Stripe webhooks, see
[Ingress Tunnels](./tunnel.md#ngrok-with-aspire).

### Change Aspire settings

Override AppHost settings with user secrets from the `AppHost` folder. For example, to move the Api
service to another port:

```bash
dotnet user-secrets set "Services:api:BasePort" "4001"
```

Common settings include:

| Setting                                    | Purpose                                                                     |
| ------------------------------------------ | --------------------------------------------------------------------------- |
| `Services:<name>:BasePort`                 | Port for a service, if the default conflicts with something on your machine |
| `ClientsPath`                              | Path to the `clients` repository's `apps` folder for `web-frontend`         |
| `SelfHost`                                 | Run in a [self-hosted configuration](./self-hosted/index.mdx)               |
| `AdditionalProjects:<name>:Path`           | Add another project to the orchestration without changing code              |
| `AdditionalProjects:<name>:ReferencedBy:0` | Give an existing service a reference to the additional project              |

Restart the AppHost to apply changes. Path settings are relative to the `AppHost` folder, so use
absolute paths if you work from a Git worktree.

## Run manually

If you aren't using Aspire, start the dependencies and services yourself.

### Configure Docker

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
    [configured user secrets](#configure-user-secrets).

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

### Create database

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

### Build and run the server

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

## Local services

Both setups provide the following local services.

### SQL Server

You can connect to the Microsoft SQL Server using your preferred database management tool with the
following credentials:

- Server: localhost
- Port: 1433
- Username: sa
- Password: the SQL Server password you chose when you
  [configured user secrets](#configure-user-secrets)

### Mailcatcher

The server uses emails for many user interactions. We provide a pre-configured instance of
[MailCatcher](https://mailcatcher.me/), which catches any outbound email and prevents it from being
sent to real email addresses. You can open its web interface at
[http://localhost:1080](http://localhost:1080).

### Redis

<Bitwarden>

:::note

Redis is required for Email and Authenticator two-factor authentication flows, as well as OTP
validation for new device and user verification scenarios when developing for the `cloud` profile.

:::

</Bitwarden>

Redis provides distributed caching capabilities. Available caching configurations have specific
fallbacks including process-scoped, in-memory caching, or database store for self-hosted
configurations.

For details on which features can take advantage of Redis and available configurations, including
connection string setting in `secrets.json`, see
[CACHING.md](https://github.com/bitwarden/server/blob/main/src/Core/Utilities/CACHING.md).

(Optional) [Monitor](https://redis.io/docs/latest/commands/monitor/) Redis activity using the Redis
CLI. With the manual setup, run this from the `dev` folder:

```bash
docker compose exec redis redis-cli
```

With Aspire, open the `redis` resource in the dashboard to find its container, then use
`docker exec` with that container name.

### Azurite

:::note

This section applies to Bitwarden developers only.

:::

[Azurite](https://github.com/Azure/Azurite) is an emulator for Azure Storage API and supports Blob,
Queues and Table storage. We use it to minimize the online dependencies required for developing in a
cloud environment.

Aspire bootstraps Azurite for you with its `azurite-setup` resource. With the manual setup, navigate
to the `dev` directory in your server repo and run the following commands:

1.  Install the `Az` module. This may take a few minutes to complete without providing any user
    feedback (it may appear frozen).

    ```bash
    pwsh -Command "Install-Module -Name Az -Scope CurrentUser -Repository PSGallery -Force"
    ```

2.  Run the setup script:

    ```bash
    pwsh setup_azurite.ps1
    ```

## Client connection

Connect a client to your local server by configuring the client’s Api and Identity endpoints. Refer
to
[https://bitwarden.com/help/article/change-client-environment/](https://bitwarden.com/help/article/change-client-environment/)
and the instructions for each client in the Contributing Documentation.

Now that the client is configured to use your local development server, you can proceed to use the
client to create an account and validate your local server changes.

:::info

If you cannot connect to the Api or Identity projects, check the terminal output or the Aspire
dashboard to confirm the ports they are running on.

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

### Aspire

Debug the `AppHost` project from your IDE. Visual Studio and Rider attach the debugger to each
service that the AppHost starts, so breakpoints in Api, Identity, and the other services work
without launching them separately. Rider requires the Aspire plugin.

### Visual Studio

To debug:

- On Windows, right-click on each project > click **Debug** > click **Start New Instance**
- On macOS, right-click each project > click **Start Debugging Project**

### Rider

Launch the Api project and the Identity project by clicking the "Play" button for each project
separately.
