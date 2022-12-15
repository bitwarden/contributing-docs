# SCIM

SCIM stands for _System for Cross-domain Identity Management_, and uses a direct link between the
Bitwarden server and an identity provider (IdP) to synchronize users and groups from the IdP to the
Bitwarden server.

:::note

In some ways, SCIM is similar to Directory Connector. However, Directory Connector works by polling
for changes (e.g. performing scheduled syncs), whereas SCIM works by pushing changes directly to
Bitwarden as they occur.

:::

## Requirements

- A [local development server](./guide.mdx)
- [Web vault](../clients/web-vault/index.mdx)
- An enterprise organization
- Mailcatcher or a similar local mailservice so that you don't spam real email addresses with test
  invites (this is included in the server setup guide)

## Steps

### Enable SCIM for your organization

1. Log in to the web vault and navigate to your organization -> Manage -> SCIM Provisioning
2. Tick "Enable SCIM" and click save. Your SCIM URL and API Key should appear. Leave this window
   open for future reference

### Start the SCIM project

3. Start the SCIM project in your local server repository:

   ```bash
   cd bitwarden_license/src/Scim
   dotnet run
   ```

4. Verify that the SCIM project started successfully by navigating to `http://localhost:44559/alive`

### Expose your local port

SCIM requires a direct connection between your SCIM project and the IdP. Therefore, you need to
expose your local port to the internet. The process below uses [ngrok](https://ngrok.com/), but you
can use any similar tool.

1. Navigate to <https://ngrok.com/> and sign up for an account

2. Follow the [official instructions](https://dashboard.ngrok.com/get-started/setup) to download
   ngrok and connect it to your account.

3. Expose your local port using ngrok:

   ```bash
   ngrok http 44559
   ```

4. ngrok's interface should display a "Forwarding" url, for example:

   ```
   https://abcd-123-456-789.au.ngrok.io -> http://localhost:44559
   ```

5. Verify that the forwarding url works by navigating to the forwarding url with `/alive` on the
   end. For example, `https://abcd-123-456-789.au.ngrok.io/alive`.

### Configure IdP

This guide uses JumpCloud as a test IdP. Okta is also suitable for testing, although you should be
able to use any IdP that supports SCIM.

You can also refer to the
[JumpCloud SCIM help documentation](https://support.jumpcloud.com/support/s/article/Custom-SCIM-Identity-Management)
if required.

1. Create an account and log in to the
   [JumpCloud admin interface](https://console.jumpcloud.com/login/admin)

2. Click "SSO" on the left-hand side, then click the Plus button to create a new application.

3. Search for "Bitwarden" in the list of applications and click "Configure"

4. In the "General Info" tab, add a display name

5. In the "Identity Management" tab, scroll down to the "Configuration Settings" section and
   complete it as follows:

   - **API Type**: SCIM API
   - **SCIM Version**: SCIM 2.0
   - **Base URL**: use the SCIM URL from your web vault, but replace `localhost` with your ngrok
     forwarding url. For example,
     `https://abcd-123-456-789.au.ngrok.io/v2/d24f1dcd-d3fb-4810-977e-adf00009f0ca`
   - **Token Key**: use the SCIM API Key from your web vault
   - **Test user email**: use any email address that doesn't already have a user account. JumpCloud
     will use this to perform test operations when you test the connection

6. Click "Test Connection" and wait for JumpCloud to complete its tests. You should see the HTTP
   requests coming through in your ngrok window.

7. Click "Activate" once the tests have passed.

8. In the "User Groups" tab, link this connection with the "All Users" group.

### Test

You should be set up and ready to go! You can test your SCIM integration by adding and removing
users in JumpCloud. Make sure that your users belong to the All Users group. You should see your
changes reflected in Bitwarden almost immediately.

You can also suspend and activate users in JumpCloud, which corresponds to the revoked and restore
operations in Bitwarden.
