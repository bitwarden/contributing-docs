---
toc_max_heading_level: 4
---

# T-SQL

## Repositories

We use the [Repository pattern][repository] with the MSSQL repositories being written using
[Dapper][dapper]. Each repository method in turn calls a _Stored Procedure_, which primarily fetches
data from _Views_.

## Deployment Scripts

There are specific ways deployment scripts should be structured. The goal for these standards is to
ensure that the scripts should be re-runnable. We never intend to run scripts multiple times on an
environment, but the scripts should support it.

### Tables

#### Creating a table

When creating a table, you must first check if the table exists:

```sql
IF OBJECT_ID('[dbo].[{table_name}]') IS NULL
BEGIN
    CREATE TABLE [dbo].[{table_name}] (
        [Id]                UNIQUEIDENTIFIER NOT NULL,
        '...
        CONSTRAINT [PK_{table_name}] PRIMARY KEY CLUSTERED ([Id] ASC)
    );
END
GO
```

#### Adding a column to a table

You must first check to see if the column exists before adding it to the table.

```sql
IF COL_LENGTH('[dbo].[{table_name}]', '{column_name}') IS NULL
BEGIN
    ALTER TABLE [dbo].[{table_name}]
        ADD [{column_name}] {DATATYPE} {NULL|NOT NULL};
END
GO
```

When adding a new `NOT NULL` column to an existing table, please re-evaluate the need for it to
truly be required. Do not be afraid of using Nullable<T\> primitives in C# and in the application
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

#### Changing a column data type

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

#### Adjusting metadata

When adjusting a table, you should also check to see if that table is referenced in any views. If
the underlying table in a view has been modified, you should run `sp_refreshview` to re-generate the
view metadata.

```sql
EXECUTE sp_refreshview N'[dbo].[{view_name}]
```

### Create or Modify a View

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

#### Adjusting metadata

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

### Create or Modify a Function or Stored Procedure

We recommend using the `CREATE OR ALTER` syntax for adding or modifying a function or stored
procedure.

```sql
CREATE OR ALTER {PROCEDURE|FUNCTION} [dbo].[{sproc_or_func_name}]
'...
GO
```

### Create or Modify an Index

When creating indexes, especially on heavily used tables, our production database can easily become
offline, unusuable, hit 100% CPU and many other bad behaviors. It is often best to do this using
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

[repository]:
  https://docs.microsoft.com/en-us/dotnet/architecture/microservices/microservice-ddd-cqrs-patterns/infrastructure-persistence-layer-design
[dapper]: https://github.com/DapperLib/Dapper
