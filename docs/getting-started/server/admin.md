# Bitwarden Portal

## Configuring access

### Authentication

Bitwarden Portal authentication is done entirely through a passwordless flow, using a link sent
through email. The email address must be listed in the `adminSettings:admins` user secret to be
authorized.

If you’ve followed the [Server Setup Guide](./guide.md) this should already be configured and will
default to `admin@localhost`. If not, please go back and configure it now.

:::tip

See [User Secrets Reference](./user-secrets.md) for how to configure your user secrets.

:::

### Authorization

The Bitwarden Portal uses role-based access control to restrict access to application functionality.
In order to have access to the features within the Bitwarden Portal, you will need to assign your
account to a role. This is in addition to the authentication setup above.

Role membership is defined in the `adminSettings:role` section of the server application
configuration. Each role is represented as a comma-delimited list of account email addresses. **For
local development, the `secrets.json` that you set up when configuring your server environment
included the user `admin@localhost` with membership in the Owner role.** If you wish to change that
configuration, modify your user secrets using the settings defined below, updating the user secret
to contain your account email address.

| Role             | Setting                      | Default Value     |
| ---------------- | ---------------------------- | ----------------- |
| Owner            | `adminSettings:role:owner`   | `admin@localhost` |
| Admin            | `adminSettings:role:admin`   |                   |
| Customer Success | `adminSettings:role:cs`      |                   |
| Billing          | `adminSettings:role:billing` |                   |
| Sales            | `adminSettings:role:sales`   |                   |

:::info

Role-based access control is only enforced on cloud-hosted instances. There is no role-based access
control on self-hosted deployments.

:::

## Setup

1.  Navigate to the `server/src/admin` directory.
2.  Restore nuget packages:

    ```bash
    dotnet restore
    ```

3.  Install npm packages:

    ```bash
    npm ci
    ```

4.  Build the admin project:

    ```bash
    dotnet build
    ```

5.  Build out the `wwwroot` directory with the necessary stylesheets and libraries:

    ```bash
    npx gulp build
    ```

6.  Start the server:

    ```bash
    dotnet run
    ```

7.  Confirm it's working by using your favorite browser to navigate to your admin page. By default,
    this is [http://localhost:62911](http://localhost:62911).

## Logging in

1.  Navigate to your admin site. By default, this is
    [http://localhost:62911](http://localhost:62911).
2.  Enter `admin@localhost` as the email (or whatever email you’ve configured in your user secrets)
3.  Open MailCatcher (default is [http://localhost:1080](http://localhost:1080)) and click the login
    link.
