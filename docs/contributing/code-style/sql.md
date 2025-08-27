---
toc_max_heading_level: 4
---

# T-SQL

## Overview

We use the [Repository pattern][repository] with the MSSQL repositories being written using
[Dapper][dapper]. Each repository method in turn calls a _Stored Procedure_, which primarily fetches
data from _Views_.

## File organization

### Directory structure

- **Schema-based organization**: Files are organized by domain/schema (Auth, Billing,
  SecretsManager, Vault, etc.)
- **Object type grouping**: Within each domain, files are grouped by type:
  - `Tables/` - Table definitions
  - `Views/` - View definitions
  - `Stored Procedures/` - Stored procedure definitions
  - `Functions/` - User-defined functions
- **Root-level objects**: Common objects are placed directly in `dbo/`:
  - `Stored Procedures/` - General stored procedures
  - `Tables/` - Core tables
  - `Views/` - General views
  - `User Defined Types/` - Custom data types

### File naming conventions

- **Stored Procedures**: `{EntityName}_{Action}.sql` (e.g., `User_Create.sql`,
  `Organization_ReadById.sql`)
- **Tables**: `{EntityName}.sql` (e.g., `User.sql`, `Organization.sql`)
- **Views**: `{EntityName}View.sql` or `{EntityName}{Purpose}View.sql` (e.g., `UserView.sql`,
  `ApiKeyDetailsView.sql`)
- **Functions**: `{EntityName}{Purpose}.sql` (e.g., `UserCollectionDetails.sql`)
- **User Defined Types**: `{TypeName}.sql` (e.g., `GuidIdArray.sql`)

## Code formatting standards

### General formatting

- **Indentation**: Use 4 spaces (not tabs) for all SQL code files
- **Keywords**: Use UPPERCASE for all SQL keywords (`CREATE`, `SELECT`, `FROM`, `WHERE`, `GROUP BY`,
  `ORDER BY`, `JOIN`, `ON`, `INTO`, `TOP`, etc.)
- **Object names**: Always use square brackets `[dbo].[TableName]`
- **Line endings**: Use consistent line breaks with proper indentation
- **Trailing spaces**: Should be trimmed from the end of lines. Use `[ \t]+$` as a regex
  find/replace
- **Vertical lists**: Vertically list items as much as feasibly possible, and use consistent
  indentation to make vertical listing quick and easy. A vertical list is much easier to compare and
  makes code changes easily detectable
- **Blank lines**: Separate sections of code with at least one blank line
- **Commas**: Commas should be placed at the right end of the line
- **Parentheses**: Parentheses should be vertically aligned with spanning multiple lines

## Deployment scripts

There are specific ways deployment scripts should be structured. The goal for these standards is to
ensure that the scripts should be re-runnable. We never intend to run scripts multiple times on an
environment, but the scripts should support it.

### Tables

#### Naming conventions

- **Table Names**: PascalCase (e.g., `[dbo].[User]`, `[dbo].[AuthRequest]`)
- **Column Names**: PascalCase (e.g., `[Id]`, `[CreationDate]`, `[MasterPasswordHash]`)
- **Primary Keys**: `PK_{TableName}` (e.g., `[PK_User]`, `[PK_Organization]`)
- **Foreign Keys**: `FK_{TableName}_{ReferencedTable}` (e.g., `FK_Device_User`)
- **Default Constraints**: `DF_{TableName}_{ColumnName}` (e.g., `[DF_Organization_UseScim]`)

#### Creating a table

When creating a table, you must first check if the table exists:

```sql
IF OBJECT_ID('[dbo].[{table_name}]') IS NULL
BEGIN
    CREATE TABLE [dbo].[{table_name}]
    (   [Id]                UNIQUEIDENTIFIER NOT NULL,
        [Column1]           DATATYPE         NOT NULL,
        [Column2]           DATATYPE         NULL,
        [CreationDate]      DATETIME2(7)     NOT NULL,
        [RevisionDate]      DATETIME2(7)     NOT NULL,
        CONSTRAINT [PK_{table_name}] PRIMARY KEY CLUSTERED ([Id] ASC),
        CONSTRAINT [FK_{table_name}_{referenced_table}] FOREIGN KEY ([ForeignKeyColumn]) REFERENCES [dbo].[ReferencedTable] ([Id])
    );
END
GO
```

#### Column definition standards

- **Alignment**: Column names, data types, and nullability vertically aligned using spaces
- **Data Types**: Use consistent type patterns:
  - `UNIQUEIDENTIFIER` for IDs
  - `DATETIME2(7)` for timestamps
  - `NVARCHAR(n)` for Unicode text
  - `VARCHAR(n)` for ASCII text
  - `BIT` for boolean values
  - `TINYINT`, `SMALLINT`, `INT`, `BIGINT` for integers
- **Nullability**: Explicitly specify `NOT NULL` or `NULL`
- **Standard Columns**: Most tables include:
  - `[Id] UNIQUEIDENTIFIER NOT NULL` - Primary key
  - `[CreationDate] DATETIME2(7) NOT NULL` - Record creation timestamp
  - `[RevisionDate] DATETIME2(7) NOT NULL` - Last modification timestamp

#### Deleting a table

When deleting a table, use `IF EXISTS` to avoid an error if the table doesn't exist.

```sql
DROP IF EXISTS [dbo].[{table_name}]
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
truly be required. Do not be afraid of using Nullable\<T\> primitives in C# and in the application
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
        [Column] INT NOT NULL CONSTRAINT DF_Table_Column DEFAULT 0
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
EXECUTE sp_refreshview N'[dbo].[{view_name}]'
GO
```

### Views

#### Naming conventions

- **View Names**:

  - `{EntityName}View`
    - Used when the view maps closely to a single table, with little or no joins. (e.g., (e.g.,
      `[dbo].[ApiKeyView]`) (from ApiKey))
  - `{EntityName}DetailsView` for complex views
    - Used for views that combine multiple tables or add logic beyond a basic table select. These
      usually serve a specific display or reporting use case and are named to reflect the context
      (e.g., `[dbo].[OrganizationUserDetailsView]`)

- For more complex reads that join multiple tables:
  - Create a view with a clear name tied to the main entity:
    - `[dbo].[OrganizationUser_MemberAccessDetailsView]`
  - Create a stored procedure that reads from it:
    - `[dbo].[MemberAccessDetails_ReadByUserId]`

#### Creating or modifying a view

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

#### Deleting a view

When deleting a view, use `IF EXISTS` to avoid an error if the table doesn't exist.

```sql
DROP IF EXISTS [dbo].[{view_name}]
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

### Functions and stored procedures

#### Naming conventions

- **Stored procedures**: `{EntityName}_{Action}` format (e.g., `[dbo].[User_ReadById]`)
  - EntityName: The main table or concept (e.g. User, Organization, Cipher)
  - Action: What the procedure does (e.g. Create, ReadById, DeleteMany)
- **Parameters**: Start with `@` and use PascalCase (e.g., `@UserId`, `@OrganizationId`)
- **OUTPUT parameters**: Explicitly declare with `OUTPUT` keyword

#### Creating or modifying a function or stored procedure

We recommend using the `CREATE OR ALTER` syntax for adding or modifying a function or stored
procedure.

```sql
CREATE OR ALTER {PROCEDURE|FUNCTION} [dbo].[{sproc_or_func_name}]
...
GO
```

#### Deleting a function or stored procedure

When deleting a function or stored procedure, use `IF EXISTS` to avoid an error if it doesn't exist.

```sql
DROP IF EXISTS [dbo].[{sproc_or_func_name}]
GO
```

### Creating or modifying an index

When creating indexes, especially on heavily used tables, our production database can easily become
offline, unusable, hit 100% CPU and many other bad behaviors. Our production database is configured
to do online index builds by default, (so as not to lock the underlying table), so you should
**_not_** specify `ONLINE = ON`, as this may cause failures on some SQL Server editions that do not
support online index rebuilds. Online index creation may cause the index operation to take longer,
but it will not create an underlying schema table lock which prevents all reads and connections to
the table and instead only locks the table of updates during the operation.

A good example is when creating an index on `dbo.Cipher` or `dbo.OrganizationUser`, those are
heavy-read tables and the locks can cause exceptionally high CPU, wait times and worker exhaustion
in Azure SQL.

```sql
CREATE NONCLUSTERED INDEX [IX_OrganizationUser_UserIdOrganizationIdStatus]
   ON [dbo].[OrganizationUser]([UserId] ASC, [OrganizationId] ASC, [Status] ASC)
   INCLUDE ([AccessAll])
```

#### Naming conventions

- **Indexes**: `IX_{TableName}_{ColumnName(s)}` (e.g., `[IX_User_Email]`)
  - The name should clearly indicate the table and the columns being indexed

#### Index best practices

- Create indexes after table definition with `GO` separator
- Use descriptive names following `IX_{TableName}_{ColumnName}` pattern
- Include `INCLUDE` clause when beneficial for covering indexes
- Use filtered indexes with `WHERE` clause when appropriate

## General naming conventions

### Schema and object prefixes

- **Schema**: Use `[dbo]` prefix for all objects
- **Object names**: Always use square brackets `[dbo].[TableName]`

### Select statements

- `SELECT` keyword on its own line
- Column names indented (4 spaces)
- One column per line for multi-column selects
- Callout the specific table/alias for where a column is from when joining to other tables
- `FROM` keyword on separate line, aligned with `SELECT`
- `FROM` clause indented (4 spaces)
  - Use aliases for table names when joining to other tables
- `JOIN` keywords on separate line, aligned with `FROM`
  - Use full join specifications (`INNER JOIN` vs `JOIN`, `LEFT OUTER JOIN` vs `LEFT JOIN`, etc)
- `JOIN` clauses indented to align with table/column name(s)
- `WHERE` keyword on separate line, aligned with `FROM`/`JOIN`
- `WHERE` clause on separate lines, indented to align with table/column name(s)

```sql
SELECT
    U.[Id],
    U.[Name],
    U.[Email],
    OU.[OrganizationId]
FROM
    [dbo].[User] U
INNER JOIN
    [dbo].[OrganizationUser] OU ON U.[Id] = OU.[UserId]
WHERE
    U.[Enabled] = 1
```

### Stored procedures

#### Basic structure

```sql
CREATE PROCEDURE [dbo].[EntityName_Action]
    @Parameter1 DATATYPE,
    @Parameter2 DATATYPE = NULL,
    @Parameter3 DATATYPE OUTPUT
AS
BEGIN
    SET NOCOUNT ON

    -- Procedure logic here

END
```

#### Parameter declaration

- One parameter per line
- Align parameters with consistent indentation (4 spaces)
- Default values on same line as parameter
- OUTPUT parameters clearly marked

Note: When adding parameters to an existing stored procedure, a default value must be specified to
ensure backward compatibility and ensure existing code can be called without modification.

Use `SET NOCOUNT ON` to prevent the automatic return of row count messages, which improves
performance and ensures consistent behavior across different client applications that might handle
these messages differently.

#### Insert statements

- Column list in parentheses, one column per line
- VALUES clause with parameters aligned
- Proper indentation for readability

```sql
INSERT INTO [dbo].[TableName]
(   [Column1],
    [Column2],
    [Column3]
)
VALUES
(   @Parameter1,
    @Parameter2,
    @Parameter3
)
```

#### Update statements

- `UPDATE` and table name on different lines
- `SET` clause with each column assignment on separate line
- `WHERE` clause clearly separated

```sql
UPDATE
    [dbo].[TableName]
SET
    [Column1] = @Parameter1,
    [Column2] = @Parameter2,
    [Column3] = @Parameter3
WHERE
    [Id] = @Id
```

### Views

#### Simple views

```sql
CREATE VIEW [dbo].[ViewName]
AS
SELECT
    *
FROM
    [dbo].[TableName]
```

#### Complex views

```sql
CREATE VIEW [dbo].[ComplexViewName]
AS
SELECT
    T1.[Column1],
    T1.[Column2],
    T2.[Column3],
    CASE
        WHEN T2.[Column4] IS NOT NULL
        THEN 1
        ELSE 0
    END AS ColumnAlias
FROM
    [dbo].[Table1] T1
LEFT JOIN
    [dbo].[Table2] T2 ON T1.[Id] = T2.[ForeignId]
WHERE
    T1.[Enabled] = 1
```

### Functions

#### Naming conventions

- **Function names**: `[Schema].[FunctionName]` (e.g., `[dbo].[UserCollectionDetails]`)
  - The name should describe what the function returns

#### Table-valued functions

```sql
CREATE FUNCTION [dbo].[FunctionName](@Parameter DATATYPE)
RETURNS TABLE
AS RETURN
SELECT
    Column1,
    Column2,
    CASE
        WHEN Condition
        THEN Value1
        ELSE Value2
    END [ComputedColumn]
FROM
    [dbo].[TableName]
WHERE
    [FilterColumn] = @Parameter
```

### User defined types

- **Naming**: `[Schema].[TypeName]` (e.g., `[dbo].[GuidIdArray]`)
  - The name should describe the type

```sql
CREATE TYPE [dbo].[TypeName] AS TABLE
(   [Column1] DATATYPE NOT NULL,
    [Column2] DATATYPE NOT NULL
);
```

## Common patterns

### CRUD operations

- **Create**: `{EntityName}_Create` procedures
- **Read**: `{EntityName}_ReadById`, `{EntityName}_ReadBy{Criteria}` procedures
- **Read Many**: `{EntityName}_ReadManyByIds`, `{EntityName}_ReadManyBy{Criteria}` procedures
- **Update**: `{EntityName}_Update` procedures
- **Delete**: `{EntityName}_DeleteById`, `{EntityName}_Delete` procedures

### Error handling

- Use `SET NOCOUNT ON` in stored procedures
- Implement appropriate transaction handling where needed
- Follow consistent error reporting patterns
  - Business logic should not be in stored procedures, but there may be times when it makes sense to
    do error handling in other scripts (migrations, one-off data scrubs)

```sql
BEGIN TRY
    BEGIN TRANSACTION;

    UPDATE
        [dbo].[TableName]
    SET
        [Column1] = 'NewValue'
    WHERE
        [Id] = 'IdValue'


    UPDATE
        [dbo].[TableName2]
    SET
        [Column1] = 'NewValue'
    WHERE
        [Id] = 'IdValue'

    COMMIT TRANSACTION;

END TRY
BEGIN CATCH

    IF @@TRANCOUNT > 0
        ROLLBACK TRANSACTION;

    THROW;

END CATCH;
```

## Comments and documentation

- Use `--` for single-line comments
- Add comments for complex business logic and the reason for a command or block of code
- Document magic numbers and status codes (e.g., `-- 2 = Confirmed`)
- Provide brief explanations for complex CASE statements or calculations
- Don't comment unnecessarily, such as commenting that an insert statement is about to be executed

## Best practices

1. **Consistency**: Follow established patterns throughout the codebase
2. **Readability**: Prioritize code readability and maintainability
3. **Performance**: Consider index usage and query optimization
4. **Security**: Use parameterized queries and proper data type validation
5. **Modularity**: Break complex operations into smaller, reusable procedures
6. **Standards**: Always use qualified object names with schema prefix
7. **Versioning**: Use descriptive procedure names for different versions (e.g., `_V2` suffix)

[repository]:
  https://docs.microsoft.com/en-us/dotnet/architecture/microservices/microservice-ddd-cqrs-patterns/infrastructure-persistence-layer-design
[dapper]: https://github.com/DapperLib/Dapper
