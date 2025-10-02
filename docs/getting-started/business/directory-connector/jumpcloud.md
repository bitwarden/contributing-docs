# JumpCloud

[JumpCloud](https://jumpcloud.com/) provides an LDAP-as-a-service with a free tier that you can use
for testing.

:::info

The JumpCloud free tier is limited to 10 users and you won't get the nice pre-generated data you get
with the [OpenLDAP](./open-ldap.md) setup.

:::

## Setup JumpCloud

1. Create an account with JumpCloud and log in

2. Create a user and bind that user to a directory. There should be a default directory you can use
   for this called JumpCloud LDAP. Refer to the
   [JumpCloud help documentation](https://support.jumpcloud.com/support/s/article/using-jumpclouds-ldap-as-a-service1#createuser)
   for instructions

3. Create an Administrator user and bind that user to the same directory. You'll use this user to
   authenticate Directory Connector with JumpCloud

## Configure

1. Run the Directory Connector Electron app (see the [build instructions](./index.mdx))

2. Log in using the [organization API key](https://bitwarden.com/help/public-api/#authentication)

3. Use the configuration settings below

### Directory Settings

For these settings, you'll need your JumpCloud organization ID. You can find this in the JumpCloud
Admin Console → User Authentication → LDAP → [your LDAP server].

- **Type**: Active Directory / LDAP

- **Server Hostname**: ldap.jumpcloud.com

- **Server Port**: 636

- **Root Path**: o=[Your JumpCloud Organization ID],dc=jumpcloud,dc=com

- **This server uses Active Directory:** [unchecked]

- **This server pages search results:** [unchecked]

- **This server uses an encrypted connection:** [checked]
  - **Use SSL** [checked]

  - **Do not verify server certificates** [checked]

- **Username**: uid=[Admin User],ou=Users,o=[Your JumpCloud organization ID],dc=JumpCloud,dc=com

- **Password**: [Admin User's password]

### Sync Settings

- **Sync Users**: [checked]

- **User Path**: ou=Users,o=[Your JumpCloud Organization ID]

- **User Object Class**: inetOrgPerson

- **User Email Attribute**: mail

- **Sync Groups**: [checked]

- **Group Path**: o=[Your JumpCloud Organization ID]

- **Group Object Class**: groupOfNames

- **Group Name Attribute**: memberOf

## Sync

:::caution

When you do a real sync, invitation emails will be sent out to all synced users. Make sure that
you're using [Mailcatcher](../../server/guide.md#mailcatcher) so you don't send live emails.

:::

1. Click the "Test Now" button in Directory Connector. You should get a list of users

2. When you're ready, click "Sync Now" to perform a real sync. You should receive a confirmation
   message in Directory Connector, and see the newly invited users in the web vault
