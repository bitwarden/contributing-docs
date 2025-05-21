---
sidebar_position: 2
---

# Database migrations

In accordance with the tenets of [Evolutionary Database Design](./edd.mdx), each change needs to be
considered to be split into two parts:

1. A backwards-compatible migration
2. A breaking-change migration

Migrations must follow Bitwarden's [self-hosted server release policy](release-policy). This implies
a staged migration cycle, as follows:

1. Release the backwards-compatible migration
2. Wait at least 1 major server version
3. Release the breaking-change migration

:::note

When your change does not introduce breaking changes (i.e. all changes are backwards-compatible in
their final form), only one phase of changes is required.

:::

## Applying migrations

We use a `migrate.ps1` PowerShell script to apply migrations to the local development database. This
script handles the different database providers that we support.

For instructions on how to use `migrate.ps1`, see the Getting Started section for
[MSSQL](../../getting-started/server/database/mssql/index.md#updating-the-database) and
[Entity Framework](../../getting-started/server/database/ef/index.mdx#migrations)

## Creating migrations for new changes

Any database change must be scripted as a migration for both our primary DBMS - MSSQL - as well as
for Entity Framework. Follow the instructions below for each provider.

### MSSQL migrations

:::tip

We recommend reading [T-SQL Code Style][code-style-sql] first, since it has a major impact in how we
write migrations.

:::

The separate database definitions in `src/Sql/.../dbo` serve as the source of truth for the intended
and final state of the database at that time. This is crucial because the state of database
definitions at the current moment may differ from when a migration was added in the past. These
definitions act as a lint and validation step to ensure that migrations work as expected, and the
separation helps maintain clarity and accuracy in database schema management and synchronization
processes.

Additionally, a
[SQL database project](https://learn.microsoft.com/en-us/azure-data-studio/extensions/sql-database-project-extension-sdk-style-projects)
is in place; however, instead of using the auto-generated migrations from
[DAC](https://learn.microsoft.com/en-us/sql/relational-databases/data-tier-applications/data-tier-applications?view=sql-server-ver16),
we manually write migrations. This approach is chosen to enhance performance and prevent accidental
data loss, which is why we have both a `sqlproj` and standalone migrations.

1. Modify the source `.sql` files in `src/Sql/dbo`.
2. Write a migration script, and place it in `util/Migrator/DbScripts`. Each script must be prefixed
   with the current date.

### EF migrations

If you alter the database schema, you must create an EF migration script to ensure that EF databases
keep pace with these changes. Developers must do this and include the migrations with their PR.

To create these scripts, you must first update your data model in `Core/Entities` as desired. This
will be used to generate the migrations for each of our EF targets.

Once the model is updated, navigate to the `dev` directory in the `server` repo and execute the
`ef_migrate.ps1` PowerShell command. You should provide a name for the migration as the only
parameter:

```bash
pwsh ef_migrate.ps1 [NAME_OF_MIGRATION]
```

This will generate the migrations, which should then be included in your PR.

[release-policy]:
  https://bitwarden.com/help/bitwarden-software-release-support/#bitwarden-self-hosted-server
[code-style-sql]: ../code-style/sql.md
