import Tabs from "@theme/Tabs"; import TabItem from "@theme/TabItem";

# Building migration scripts

There are specific ways migration scripts should be structured. We do so to adhere to the following
guiding principles:

:white_check_mark: **The script must be idempotent**: Always ensure a migration can be run multiple
times without causing errors or duplicating data. We never intend to run scripts multiple times on
an environment, but the scripts must support it.

:white_check_mark: **The script must avoid breaking changes**: Migrations should never delete or
rename columns that are still in use by deployed code.

:white_check_mark: **The script must maintain schema integrity**: The schema of the database defined
in code should map exactly to the schema of the database in all deployed environments.

:white_check_mark: **The script must be backwards compatible**: Code should be able to work with
both the old and new schema during a rolling deployment. See
[our MSSQL docs](../../database-migrations/mssql.md) for how we put this into practice.

## Script best practices by database entity

:::tip

Migration scripts may not be something that you do often, and it is important that we follow our
guidelines to protect against potential downtimes during release or data loss. **When writing a
script, check each of the entities you're working with against the recommendations below before you
introduce a pull request with your changes.**

:::

<details id="tables">
<summary><h3>Tables</h3></summary>

### Creating a table

When creating a table, you must first check if the table exists:

```sql
IF OBJECT_ID('[dbo].[{table_name}]') IS NULL
BEGIN
    CREATE TABLE [dbo].[{table_name}] (
        [Id]                UNIQUEIDENTIFIER NOT NULL,
        ...
        CONSTRAINT [PK_{table_name}] PRIMARY KEY CLUSTERED ([Id] ASC)
    );
END
GO
```

### Deleting a table

When deleting a table, use `IF EXISTS` to avoid an error if the table doesn't exist.

```sql
DROP IF EXISTS [dbo].[{table_name}]
GO
```

</details>

<details id="columns">
<summary><h3>Columns</h3></summary>

### Adding a column to a table

You must first check to see if the column exists before adding it to the table.

```sql
IF COL_LENGTH('[dbo].[{table_name}]', '{column_name}') IS NULL
BEGIN
    ALTER TABLE [dbo].[{table_name}]
        ADD [{column_name}] {DATATYPE} {NULL|NOT NULL};
END
GO
```

#### Nullability

When adding a new `NOT NULL` column to an existing table, please re-evaluate the need for it to
truly be required. Do not be afraid of using `Nullable\<T\>` primitives in C# and in the application
layer, which is almost always going to be better than taking up unnecessary space in the DB per row
with a default value, especially for new functionality or features where it will take a very long
time to be useful for most row-level data, if at all.

If you do decide to add a `NOT NULL` column, **use a DEFAULT constraint** instead of creating the
column, updating rows and changing the column. This is especially important for the largest tables
like `dbo.User` and `dbo.Cipher`. Our version of SQL Server in Azure uses metadata for default
constraints. This means we can update the default column value **without** updating every row in the
table (which will use a lot of DB I/O).

This is slow:

```sql
IF COL_LENGTH('[dbo].[Table]', 'Column') IS NULL
BEGIN
    ALTER TABLE
        [dbo].[Table]
    ADD
        [Column] INT NULL
END
GO

UPDATE
    [dbo].[Table]
SET
    [Column] = 0
WHERE
    [Column] IS NULL
GO

ALTER TABLE
    [dbo].[Column]
ALTER COLUMN
    [Column] INT NOT NULL
GO
```

This is better:

```sql
IF COL_LENGTH('[dbo].[Table]', 'Column' IS NULL
BEGIN
    ALTER TABLE
        [dbo].[Column]
    ADD
        [Column] INT NOT NULL CONSTRAINT D_Table_Column DEFAULT 0
END
GO
```

#### Column order

When you make corresponding updates to the database schema in code, **always add new columns to the
end of the column list**. Adding columns in between existing ones creates schema disparities between
the schema defined in code and the actual column order in our local, staging, and production
environments, since the column `ADD` will always add to the end of the table definition.

This can cause subtle and hard-to-debug issues, particularly when using non-parameterized SQL that
relies on implicit column order or performing bulk inserts/updates where tools assume column order
consistency.

While well-written code shouldn't depend on column order, some third-party tools and legacy
practices might.

### Changing a column data type

You must wrap the `ALTER TABLE` statement in a conditional block, so that subsequent runs of the
script will not modify the data type again.

```sql
IF EXISTS (
    SELECT *
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE COLUMN_NAME = '{column_name}' AND
        DATA_TYPE = '{datatype}' AND
        TABLE_NAME = '{table_name}')
BEGIN
    ALTER TABLE [dbo].[{table_name}]
    ALTER COLUMN [{column_name}] {NEW_TYPE} {NULL|NOT NULL}
END
GO
```

### Adjusting metadata

When adjusting a table, you should also check to see if that table is referenced in any views. If
the underlying table in a view has been modified, you should run `sp_refreshview` to re-generate the
view metadata.

```sql
EXECUTE sp_refreshview N'[dbo].[{view_name}]'
GO
```

</details>

<details id="views">
<summary><h3>Views</h3></summary>

### Creating or modifying a view

We recommend using the `CREATE OR ALTER` syntax for adding or modifying a view.

```sql
CREATE OR ALTER VIEW [dbo].[{view_name}]
AS
SELECT
    *
FROM
    [dbo].[{table_name}]
GO
```

### Deleting a view

When deleting a view, use `IF EXISTS` to avoid an error if the table doesn't exist.

```sql
DROP IF EXISTS [dbo].[{view_name}]
GO
```

### Adjusting metadata

When altering views, you may also need to refresh modules (stored procedures or functions) that
reference that view or function so that SQL Server to update its statistics and compiled references
to it.

```sql
IF OBJECT_ID('[dbo].[{procedure_or_function}]') IS NOT NULL
BEGIN
    EXECUTE sp_refreshsqlmodule N'[dbo].[{procedure_or_function}]';
END
GO
```

</details>

<details id="functions-and-sps">
<summary><h3>Functions and stored procedures</h3></summary>

### Creating or modifying a function or stored procedure

We recommend using the `CREATE OR ALTER` syntax for adding or modifying a function or stored
procedure.

```sql
CREATE OR ALTER {PROCEDURE|FUNCTION} [dbo].[{sproc_or_func_name}]
...
GO
```

### Deleting a function or stored procedure

When deleting a function or stored procedure, use `IF EXISTS` to avoid an error if it doesn't exist.

```sql
DROP IF EXISTS [dbo].[{sproc_or_func_name}]
GO
```

:::warning

When changing a stored procedure, ensure that the corresponding
[Entity Framework](../../getting-started/server/database/ef/index.mdx) model is updated.

:::

</details>

<details id="indices">
<summary><h3>Indices</h3></summary>

When creating indexes, especially on heavily used tables, our production database can easily become
offline, unusable, hit 100% CPU and many other bad behaviors. It is often best to do this using
online index builds so as not to lock the underlying table. This may cause the index operation to
take longer, but you will not create an underlying schema table lock which prevents all reads and
connections to the table and instead only locks the table of updates during the operation.

A good example is when creating an index on `dbo.Cipher` or `dbo.OrganizationUser`, those are
heavy-read tables and the locks can cause exceptionally high CPU, wait times and worker exhaustion
in Azure SQL.

```sql
CREATE NONCLUSTERED INDEX [IX_OrganizationUser_UserIdOrganizationIdStatus]
   ON [dbo].[OrganizationUser]([UserId] ASC, [OrganizationId] ASC, [Status] ASC)
   INCLUDE ([AccessAll])
   WITH (ONLINE = ON); -- ** THIS ENSURES ONLINE **
```

</details>
