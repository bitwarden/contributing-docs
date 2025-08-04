# Local IdP

This article will show you how to set up a local SSO Identity Provider (IdP) for testing purposes.

This uses
[Docker Test SAML 2.0 Identity Provider](https://github.com/kenchan0130/docker-simplesamlphp).

## Prerequisites

1.  Bitwarden server set up and configured with the following server projects running:
    - Identity
    - API
    - SSO (located at `server/bitwarden_license/src/Sso`)

2.  Local web client running.

3.  An enterprise account created with the testing credit card located here:
    [Advanced Server Setup](../advanced-setup.md).

## Configure IdP

1.  Open your local web client and navigate to your organization → Settings → Single Sign-On.

2.  Tick the "Allow SSO authentication" box.

3.  Come up with and enter an SSO Identifier.

4.  Select "SAML 2.0" as the SSO type. Don't save or exit this page yet, you'll need to come back to
    it later.

5.  Open a new terminal and navigate to the `dev` folder in your server repository, e.g.

    ```bash
    cd ~/Projects/server/dev
    ```

6.  Open your `.env` file and set the following environment variables using the "SP Entity ID" and
    "Assertion Consumer Service (ACS) URL" values from the SSO configuration page opened in step #4
    above:

    ```bash
    IDP_SP_ENTITY_ID={SP Entity ID}
    IDP_SP_ACS_URL={ACS URL}
    ```

    :::note

    You should have created this `.env` file during your initial server setup. You can refer back to
    the `.env.example` file if required.

    :::

7.  (Optional) You may generate a certificate to sign SSO requests. You can do this with a script
    made for your OS of choice.

    ```bash
    # Mac
    ./create_certificates_mac.sh

    # Windows
    .\create_certificates_windows.ps1

    # Linux
    ./create_certificates_linux.sh
    ```

    Paste the thumbprint, for example `0BE8A0072214AB37C6928968752F698EEC3A68B5`, into your
    `secrets.json` file under `globalSettings` > `identityServer` > `certificateThumbprint`. Update
    your secrets as [shown here](../guide.md#configure-user-secrets).

8.  Make a copy of the provided `authsources.php.example` file, which contains the configuration for
    your IdP users.

    ```bash
    cp authsources.php.example authsources.php
    ```

    By default, this file has two users configured: `user1` and `user2`, and both have the password
    `password`. You can add or modify users by following this format, or just use the defaults. See
    [here](https://github.com/kenchan0130/docker-simplesamlphp#advanced-usage) for more information
    about customizing this file.

9.  Start the docker container:

    ```bash
    docker compose --profile idp up -d
    ```

10. You can test your user configuration by navigating to
    [http://localhost:8090/simplesaml](http://localhost:8090/simplesaml), then Authentication → test
    configured authentication sources → `example-userpass`. You should be able to log in with the
    users you’ve configured.

## Configure Bitwarden

1.  Go back to your window with the SSO configuration page open.
2.  Complete the following values in the SAML Identity Provider Configuration section:
    1.  Entity ID:
        ```
        http://localhost:8090/simplesaml/saml2/idp/metadata.php
        ```
    2.  Single Sign On Service URL:
        ```
        http://localhost:8090/simplesaml/saml2/idp/SSOService.php
        ```
    3.  X509 Public Certificate: get this by opening a new tab and navigating to the Entity ID URL
        above. It will open (or download) an XML file. Copy and paste the value _between_ the
        `<ds:X509Certificate>` tags (it should look like a B64 encoded string).

3.  Save your SSO configuration

Your SSO is now ready to go!

## Updating the IdP configuration

### Users

To add or change users, just edit `authsources.php`. Your changes will take effect immediately,
however any currently authenticated users will have to log out for changes to their account to take
effect.

To log out as a user, navigate to
[http://localhost:8090/simplesaml/module.php/core/authenticate.php?as=example-userpass](http://localhost:8090/simplesaml/module.php/core/authenticate.php?as=example-userpass)
and click Logout. Alternatively, you can use a private browsing session.

### SAML configuration

To change the Entity ID or ACS URL, edit the `.env` file and then restart the Docker container:

```bash
docker compose --profile idp up -d
```

## Troubleshooting

### Bitwarden server throws “unknown userId” error

You’re missing the `uid` claim for the user in `authsources.php`.
