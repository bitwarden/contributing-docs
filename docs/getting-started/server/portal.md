# Bitwarden Portal

## Configuring access

### Authentication

Bitwarden Portal authentication is done entirely through a passwordless flow, using a link sent
through email. The email address must be listed in the `adminSettings:admins` user secret to be
authorized.

If you’ve followed the [Server Setup Guide](./guide.md) this should already be configured, with the
following accounts having access:

- `owner@localhost`
- `admin@localhost`
- `cs@localhost`
- `billing@localhost`
- `sales@localhost`

If not, please go back and configure it now.

:::tip

See [User Secrets Reference](./user-secrets.md) for how to configure your user secrets.

:::

### Authorization

The Bitwarden Portal uses role-based access control to restrict access to application functionality.
In order to have access to the features within the Bitwarden Portal, you will need to assign your
account to a role. This is in addition to the authentication setup above.

Role membership is defined in the `adminSettings:role` section of the server application
configuration. Each role's members are represented as a comma-delimited list of account email
addresses. For local development, your user secrets will be defined with the following account in
each role:

| Role             | Setting                      | Default `secrets.json` Value |
| ---------------- | ---------------------------- | ---------------------------- |
| Owner            | `adminSettings:role:owner`   | `owner@localhost`            |
| Admin            | `adminSettings:role:admin`   | `admin@localhost`            |
| Customer Success | `adminSettings:role:cs`      | `cs@localhost`               |
| Billing          | `adminSettings:role:billing` | `billing@localhost`          |
| Sales            | `adminSettings:role:sales`   | `sales@localhost`            |

If you wish to change the membership for any role, you can
[edit your user secrets](./user-secrets.md) to specify the desired value.

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

7.  Confirm it's working by using your favorite browser to navigate to the portal URL. By default,
    this is [http://localhost:62911](http://localhost:62911).

## Logging in

1.  Navigate to your portal URL. By default, this is
    [http://localhost:62911](http://localhost:62911).
2.  Enter `admin@localhost` as the email (or whatever email you’ve configured in your user secrets)
3.  Open MailCatcher (default is [http://localhost:1080](http://localhost:1080)) and click the login
    link.
