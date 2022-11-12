# Admin Portal

## Configuring users

Admin Portal authentication is done entirely through a passwordless flow, using a link sent through
email. The email address must be listed in the `adminSettings:admins` user secret to be authorized.

If you’ve followed the [Server Setup Guide](./guide.md) this should already be configured and will
default to `admin@localhost`. If not, please go back and configure it now.

:::info

See [User Secrets Reference](./user-secrets.md) for how to configure your user secrets.

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
