---
sidebar_position: 2
---

# Entity Framework

:::info

For instructions on how to apply database migrations, please refer to the
[Getting Started](../../getting-started/server/database/ef/index.mdx) documentation.

:::

If you alter the database schema, you must create an EF migration script to ensure that EF databases
keep pace with these changes. Developers must do this and include the migrations with their PR.

To create these scripts, you must first update your data model in `Core/Entities` as desired. This
will be used to generate the migrations for each of our EF targets. Additionally, for table changes
it is strongly recommended to define or update an `IEntityTypeConfiguration<T>` to accurately
represent any constraints needed on the data model.

Once the model is updated, navigate to the `dev` directory in the `server` repo and execute the
`ef_migrate.ps1` PowerShell command. You should provide a name for the migration as the only
parameter:

```bash
pwsh ef_migrate.ps1 [NAME_OF_MIGRATION]
```

This will generate the migrations, which should then be included in your PR.
