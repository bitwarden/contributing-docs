# OpenLDAP Docker server

This method uses an [OpenLDAP Docker image](https://github.com/osixia/docker-openldap) to run a
local directory service that you can use for development.

## Requirements

- [Web vault](../../clients/web-vault/index.mdx)

- [Server](../../server/guide.mdx)

- [Directory Connector](./index.mdx)

- An Enterprise organization

## LDIF file

An LDIF file contains the configuration for your directory (such as users, groups, etc).

### Download example LDIF file

For most use cases, you can download one of these sample LDIF files to get you up and running
quickly:

- [20 users](./directory-20.ldif)

- [50 users](./directory-50.ldif)

- [100 users](./directory-100.ldif)

- [250 users](./directory-250.ldif)

- [500 users](./directory-500.ldif)

### Generate your own LDIF file

Alternatively, you can generate your own LDIF file using the following instructions. You don't need
to do this unless you have special requirements.

1. Download the [LDIF Generator](https://ldapwiki.com/wiki/LDIF%20Generator)

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

## Start Open LDAP

1. Open a terminal in your local server repository

2. Go to the `dev` folder:

   ```bash
   cd dev
   ```

3. Copy your LDIF file into this folder and call it `directory.ldif`:

   ```bash
   cp path/to/file.ldif ./directory.ldif
   ```

4. Start the OpenLDAP Docker container

   ```bash
   docker-compose --profile ldap up -d
   ```

   If you ever change the LDIF file, you can force Docker to use the new file by running this
   command again with the `--force-recreate` flag.

## Configure Directory Connector

1. Run the Directory Connector Electron app (see the [build instructions](./index.mdx))

2. Log in using the [organization API key](https://bitwarden.com/help/public-api/#authentication)

3. Use the configuration settings below

### Directory Settings

- **Type**: Active Directory / LDAP

- **Server Hostname**: localhost

- **Server Port**: 389

- **Root Path**: dc=bitwarden,dc=com

- **This server uses Active Directory:** [unchecked]

- **This server pages search results:** [unchecked]

- **This server uses an encrypted connection:** [unchecked]

- **Username**: cn=admin,dc=bitwarden,dc=com

- **Password**: admin

### Sync Settings

- **User Path**: [blank]

- **User Object Class**: person

- **User Email Attribute**: mail

- **Group Path**: [blank]

- **Group Object Class**: organizationalUnit

- **Group Name Attribute**: ou

## Sync

:::caution

When you do a real sync, invitation emails will be sent out to all synced users. Make sure that
you're using [Mailcatcher](../../server/guide.mdx#mailcatcher) so you don't send live emails.

:::

1. Click the "Test Now" button in Directory Connector. You should get a list of users

2. When you're ready, click "Sync Now" to perform a real sync. You should receive a confirmation
   message in Directory Connector, and see the newly invited users in the web vault
