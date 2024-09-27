---
sidebar_custom_props:
  access: bitwarden
sidebar_position: 2
---

# Advanced Server Setup

Once you have your server up and running, there may be some additional configuration required to
activate all of Bitwarden's features.

## Premium Features

The user secrets file includes a test Stripe key, which will allow you to "buy" premium features
without actually being charged.

1. Connect to your local server with the web client
2. When purchasing a subscription or premium, use the credit card payment method using testing data
   from [Stripe documentation](https://stripe.com/docs/testing#cards):

   | Brand      | Number                | CVC         | Date            |
   | ---------- | --------------------- | ----------- | --------------- |
   | Visa       | `4111 1111 1111 1111` | Any 3 digit | Any future date |
   | Mastercard | `5555 5555 5555 4444` | Any 3 digit | Any future date |

3. Your credit card details will only need to pass the front-end form validation (e.g. your credit
   card number will need to be the correct number of characters).
4. Buy premium features to your heart's content

:::info

Stripe has a [policy](https://support.stripe.com/questions/test-mode-subscription-data-retention) to
**automatically cancel** test subscriptions after 90 days and then **delete** cancelled test
subscriptions after a further 30 days. This can cause unexpected billing behaviors for long-lived
premium users and organizations on your local server.

To correct this, you must re-subscribe the organization/user to a premium plan to create a new test
subscription.

1. From the Bitwarden Portal, remove the organization/user gateway information and set their plan to
   "Free"
2. From the web client, add a new test payment method to the organization/user
3. Re-purchase the desired premium features as you would normally

:::

## Emails

Docker compose will spin up a local smtp server that can be used, but it’s also possible to use
other services such as Mailtrap, or Amazon to debug the amazon integration.

- Amazon Simple Email Service - the user secrets vault item includes a separate attachment called
  `additional-keys-for-cloud-services.json`. Add the `amazon` key to your user secrets to use
  Amazon's mail service. Caution: this will send emails to real live email addresses!
- [bytemark/docker-smtp](https://github.com/BytemarkHosting/docker-smtp) - a local SMTP server
  running on Docker.

## File Uploads (File Sends and Attachments)

File uploads are stored using one of two methods.

- Azure Storage is used by our production cloud instance.

  - Docker will create a local [Azurite](https://github.com/Azure/Azurite) instance which emulates
    the Azure Storage API. And is used for the primary testing.
  - We also have a test Azure Storage account for development use. The user secrets for this are
    attached to the the "Server User Secrets" shared vault item. You'll need to copy the `send` and
    `attachment` keys into your own user secrets.

- Direct upload is used by self-hosted instances and stores the file directly on the server. The
  following settings will allow you to upload files, but not download them. Put the following
  settings under `globalSettings` (update the paths as required):

  ```json
  "send": {
      "baseDirectory": "/Users/<your name>/Projects/localStorageDev",
      "baseUrl": "file:///Users/<your name>/Projects/localStorageDev"
  },
  "attachment": {
      "baseDirectory": "/Users/<your name>/Projects/localStorageDev",
      "baseUrl": "file:///Users/<your name>/Projects/localStorageDev"
  }
  ```

:::note

To properly test uploading and downloading files using direct upload, you need to set up a local
file server.

:::

## PayPal

If you just need premium features, it's easier to pay by card (see the instructions above). However,
you may need to test the PayPal integration specifically.

1. Make sure you are using the `secrets.json` from the shared Engineering collection. These secrets
   provide access to the PayPal sandbox account, which will be automatically used when running the
   server locally.
2. You need 2 PayPal sandbox accounts for testing:
   - a seller - this will be our sandbox account. Login details are available in the shared
     Engineering collection. You can log in to this account to see a record of (fake) money received
     by Bitwarden in any transactions you process.
   - a buyer - this will use your sandbox account.
3. [Create a new PayPal sandbox account](https://www.sandbox.paypal.com) using your work email
   address. You can then
   [create fake buyer accounts](https://developer.paypal.com/docs/api-basics/sandbox/accounts/) with
   any particular personal information you might require (e.g. country, payment methods). This is
   particularly useful when testing sales tax. You can use the
   [credit card generator](https://developer.paypal.com/developer/creditCardGenerator/) to generate
   "valid" fake credit card details if required.
4. Log in to your web vault and navigate to a payment page. All PayPal payment features should work
   using your sandbox account, or the fake buyer account you created.

Note: if you are testing sales tax, you will first have to create sales tax rates via the Admin
portal.

## YubiKey 2FA

In order to locally test YubiKey 2FA, you must first configure your local user secrets with a
ClientId and Key from Yubico. This is used to authenticate the API call to Yubico to validate the
OTP provided.

The steps for setting up your local server for YubiKey validation are:

1. Acquire a ClientId and Key from Yubico [here](https://upgrade.yubico.com/getapikey/). Note that
   this requires that you have a YubiKey in order to provide an OTP. If you do not have a YubiKey
   please contact your manager.

2. Update the `globalSettings:yubico:key` and `globalSettings:yubico:clientid` user secrets in the
   `Identity` project. You can either use the [update script](./secrets/index.md) or manually
   update:
   ```bash
      dotnet user-secrets set globalSettings:yubico:key [Key]
      dotnet user-secrets set globalSettings:yubico:clientid [ClientId]
   ```

## Reverse Proxy Setup

Running a reverse proxy can be used to simulate running multiple server services in a distributed
manner. The [Docker Compose](https://docs.docker.com/compose/) configuration in the `/dev` folder
already has a configuration prepared for the Api and Identity services (can be expanded for other
services).

1. The reverse proxy container is setup to use an
   [nginx](https://nginx.org/en/docs/beginners_guide.html#conf_structure) config file located at
   `dev/reverse-proxy.conf`. Copy the example reverse proxy configuration:

   ```bash
   cd dev
   cp reverse-proxy.conf.example reverse-proxy.conf
   ```

2. Optionally modify `reverse-proxy.conf` to support the number of desired services and their ports.
   By default it supports two **Api** and two **Identity** services running on ports **4000/4002**
   and **33656/33658**, respectively.

3. Ensure environment variables `API_PROXY_PORT` and `IDENTITY_PROXY_PORT` are present in
   `dev/.env`. See `dev/.env.example` for defaults.

4. Launch the reverse proxy using docker compose.

   ```bash
   docker compose --profile proxy up -d
   ```

5. Spin up the required services locally, using a unique port for each running instance. **The ports
   must match the ports in the `reverse-proxy.conf` in the `upstream` configuration blocks.**

   - **Command line** _(in separate terminals)_
     ```bash
     # 1st instance
     cd src/Api
     dotnet run --urls=http://localhost:4000/
     ```
     ```bash
     # 2nd instance: --no-build can avoid conflicts with the first instance
     cd src/Api
     dotnet run --urls=http://localhost:4002/ --no-build
     ```
   - **Rider** - Create new launch configurations for the desired services with each using a
     different port in the `ASPNETCORE_URLS` environment variable. Then run/debug each configuration
     simultaneously.
   - **Visual Studio** - You can add additional run configurations for each service to use unique
     ports, similar to Rider. _You may need to run multiple instances of Visual Studio in order to
     run/debug the same project._

     > _Be careful of accidental commits of launch configuration changes_

6. Update any clients to use the reverse proxy instead of the service(s) directly. These ports are
   defined in `dev/.env` and `dev/reverse-proxy.conf`.
   - **Api** - `http://localhost:4100`
   - **Identity** - `http://localhost:33756`

If you need to add additional services (besides Api and Identity), add them to the
`dev/reverse-proxy.conf` and make sure the necessary ports are exposed in the
`dev/docker-compose.yml` file for the `reverse-proxy` container.

## NuGet with GitHub Packages

Server-side projects and solutions may use
[Bitwarden-shared .NET extension libraries hosted on GitHub Packages](https://github.com/orgs/bitwarden/packages?repo_name=dotnet-extensions)
and _prerelease_ packages offered via GitHub Packages require authentication for access.

First, [generate](https://github.com/settings/tokens/new) a GitHub personal access token (classic)
with the `packages:read` scope only. You can set an expiration date but it may be easier to leave it
without one considering the scope. Copy the token value and run:

```bash
IFS= read -rs GITHUB_PAT < /dev/tty
```

along with pasting the value and pressing Enter. Next, run:

```bash
dotnet nuget add source --username bitwarden --password $GITHUB_PAT --store-password-in-clear-text --name github --configfile ~/.nuget/NuGet/NuGet.Config "https://nuget.pkg.github.com/bitwarden/index.json"
```

which will set up the necessary global source and credentials. Any NuGet restores will now also
utilize our GitHub Packages setup for NuGet.
