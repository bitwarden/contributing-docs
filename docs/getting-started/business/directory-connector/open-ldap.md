# OpenLDAP Docker server

This method uses an [OpenLDAP Docker image](https://hub.docker.com/r/bitnami/openldap) to run a
local directory service that you can use for development.

This is also the method used to run integration tests in the pipeline.

## Requirements

- [mkcert](https://github.com/FiloSottile/mkcert) (available via Homebrew)

- [Web vault](../../clients/web-vault/index.mdx)

- [Server](../../server/guide.md)

- [Directory Connector](./index.mdx)

- A paid organization

## Quick start

### Start directory service

1. Open a terminal in the Directory Connector repository.

2. Configure the TLS certificates:

   ```bash
   npm run test:integration:setup
   ```

3. Start the OpenLDAP Docker container:

   ```bash
   docker compose up -d
   ```

### Configure Directory Connector

1. Run the Directory Connector Electron app (see the [build instructions](./index.mdx)).

2. Log in using the [organization API key](https://bitwarden.com/help/public-api/#authentication).

3. Use the configuration settings below:

#### Directory Settings

- **Type**: Active Directory / LDAP

- **Server Hostname**: localhost

- **Server Port**: 1389 (no encryption or StartTLS) or 1636 (SSL)

- **Root Path**: dc=bitwarden,dc=com

- **This server uses Active Directory:** [unchecked]

- **This server pages search results:** [unchecked]

- **This server uses an encrypted connection:** check if using StartTLS or SSL, then configure the
  certificate options that appear below. Certificates are located in `openldap/certs` in your local
  Directory Connector repository.

- **Username**: cn=admin,dc=bitwarden,dc=com

- **Password**: admin

#### Sync Settings

- **Member Attribute**: memberUid

- **Sync users**: [checked]

- **User Object Class**: person

- **User Email Attribute**: mail

- **Sync groups**: [checked]

- **Group Object Class**: posixGroup

- **Group Name Attribute**: cn

### Sync

:::caution

When you do a real sync, invitation emails will be sent out to all synced users. Make sure that
you're using [Mailcatcher](../../server/guide.md#mailcatcher) so you don't send live emails.

:::

1. Click the "Test Now" button in Directory Connector. You should get a list of users.

2. When you're ready, click "Sync Now" to perform a real sync. You should receive a confirmation
   message in Directory Connector, and see the newly invited users in the web vault.

### Integration tests

You can also run integration tests against the Docker container:

```bash
npm run test:integration
```

:::caution

The integration tests assert that the sync data received matches a set of static test data. Any
change to the OpenLDAP directory data will cause these tests to fail.

:::

## Other datasets

An LDIF file contains the configuration for your directory (such as users, groups, etc). You can
modify or use a custom LDIF file to customize your test data.

LDIF files can be placed in `openldap/ldifs` in your Directory Connector repository. You may have to
delete and recreate your Docker container for the changes to take effect (e.g.
`docker compose up -d --force-recreate`).

### Use example LDIF file

Sample LDIF files of different sizes are included in the `openldap/examples` folder in the Directory
Connector repository.

### Generate your own LDIF file

Alternatively, you can generate your own LDIF file using the following instructions. You don't need
to do this unless you have special requirements.

1. Download the [LDIF Generator](https://ldapwiki.com/wiki/Wiki.jsp?page=LDIF%20Generator)

2. Replace the `Data/mail-hosts.txt` file with our own [mail-hosts.txt](./mail-hosts.txt) file. This
   contains a high number of unique host names to avoid duplicate email addresses being generated.

3. Run `java -jar LDIFGen.jar`

4. Use the following settings:

   - Base Added: dc=bitwarden, dc=com

   - Generate OUs: Generic

   - Generate People: add

5. Click "Run"

6. The LDIF output may contain illegal characters in email addresses (such as spaces and
   apostrophes) - you should check this manually before using.
