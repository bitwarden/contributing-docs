---
toc_max_heading_level: 4
---

# T-SQL

## Overview

We use the [Repository pattern][repository] with the MSSQL repositories being written using
[Dapper][dapper]. Each repository method in turn calls a _Stored Procedure_, which primarily fetches
data from _Views_.

1. **Views** define explicit column lists, selecting specific columns from tables
2. **Stored Procedures** select `*` from views
3. **C# objects** returned by repository methods match the columns defined in the corresponding view

This separation of concerns means:

- The view definition is where you specify which columns are needed
- Stored procedures simply `SELECT * FROM [dbo].[ViewName]`
- The view acts as a contract between the database and application layer

## Best practices

1. **Consistency**: Follow established patterns throughout the codebase
2. **Readability**: Prioritize code readability and maintainability
3. **Performance**: Consider index usage and query optimization
4. **Security**: Use parameterized queries and proper data type validation
5. **Modularity**: Break complex operations into smaller, reusable procedures

## File organization

### Directory structure

- **Schema-based organization**: Files are organized by domain/schema (Auth, Billing, Secrets
  Manager, Vault, etc.)
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

- **Stored Procedures**: `{EntityName}_{Action}.sql`
  - e.g. `User_Create.sql`, `Organization_ReadById.sql`
- **Tables**: `{EntityName}.sql`
  - e.g. `User.sql`, `Organization.sql`
- **Views**: `{EntityName}View.sql` or `{EntityName}{Purpose}View.sql`
  - e.g. `UserView.sql`, `ApiKeyDetailsView.sql`
- **Functions**: `{EntityName}{Purpose}.sql`
  - e.g. `UserCollectionDetails.sql`

:::tip Versioning

When a new version of an entity is introduced and needs to be maintained next to the existing one
during deployment, use versioned names for the different scripts, so that the relationship is
clear - e.g. a `_V2` suffix.

:::

## Code style

### General standards

These standards should be applied across any T-SQL scripts that you write.

- **Indentation**: Use 4 spaces (not tabs) for all SQL code files
- **Keywords**: Use UPPERCASE for all SQL keywords (`CREATE`, `SELECT`, `FROM`, `WHERE`, `GROUP BY`,
  `ORDER BY`, `JOIN`, `ON`, `INTO`, `TOP`, etc.)
- **Object names**: Always use square brackets `[dbo].[TableName]`
- **Schema**: Use `[dbo]` prefix for all objects
- **Line endings**: Use consistent line breaks with proper indentation
- **Vertical lists**: Vertically list items as much as feasibly possible, and use consistent
  indentation to make vertical listing quick and easy. A vertical list is much easier to compare and
  makes code changes easily detectable
- **Blank lines**: Separate sections of code with at least one blank line
- **Commas**: Commas should be placed at the right end of the line
- **Parentheses**: Parentheses should be vertically aligned when spanning multiple lines
- **Data type modifiers**: Omit the space between type name and opening parenthesis (e.g.,
  `NVARCHAR(50)` not `NVARCHAR (50)`, `DATETIME2(7)` not `DATETIME2 (7)`)
- **Naming**: Use full, unabbreviated names throughout — object names, column names, parameters, and
  descriptors (e.g., `OrganizationId` not `OrgId`)
- **ID generation**: Use `CoreHelpers.GenerateComb()` in application code, not `NEWID()` in the
  database -- see [GUID generation](./csharp#guid-generation)
- **Datetime generation**: Generate datetime values in application code and pass them as parameters
  (e.g., `@RevisionDate`), not using SQL functions (`SYSUTCDATETIME()`, `GETUTCDATE()`) — this keeps
  timestamp generation consistent and testable. See the [accepted exceptions](#datetime-values)
  documented in the stored procedures section.

### `SELECT` statements

- `SELECT` keyword on its own line
- Column names indented (4 spaces)
- One column per line for multi-column selects
- Call out the specific table/alias for where a column is from when joining to other tables
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

#### `WHERE` clause conditions

- `AND` / `OR` keywords go at the **start** of the next line, indented to align with the condition
  above it
- Wrap grouped `OR` conditions in parentheses, with the opening `(` on the **same line** as `AND`
  and the closing `)` on its own line aligned with `AND`
- Use inline comments to explain non-obvious conditions, such as status code meanings

```sql
WHERE
    O.[Enabled] = 1
    AND O.[UsePolicies] = 1
    AND (
        -- Active users linked by UserId
        (OU.[Status] != 0 AND OU.[UserId] = @UserId)
        -- Invited users matched by email (Status = 0)
        OR EXISTS (
            SELECT
                1
            FROM
                [dbo].[UserView] U
            WHERE
                U.[Id] = @UserId
                AND OU.[Email] = U.[Email]
                AND OU.[Status] = 0
        )
    )
```

#### `IN` clauses

- For bulk operations with a small, bounded number of IDs, use the TVP `IN` pattern:

```sql
WHERE
    [Id] IN (SELECT [Id] FROM @Ids)
```

- For bulk operations where the recordset may be large (e.g., all users in an organization), prefer
  an `INNER JOIN` on the TVP — this gives the query optimizer full flexibility to choose an
  efficient join strategy (hash join, merge join) rather than defaulting to nested loops, which is
  the typical result of an `IN` subquery:

```sql
FROM
    [dbo].[EntityNameView] E
INNER JOIN
    @Ids I ON E.[Id] = I.[Id]
```

- For direct value lists, use no spaces after commas: `IN (0,1,2)`

#### Subqueries

- Use `EXISTS` (not `IN`) for correlated subqueries -- `EXISTS` short-circuits on the first match,
  whereas `IN` evaluates all matching values first
- Use `IN` for non-correlated subqueries (where the inner query does not reference the outer query)
  -- the optimizer typically produces equivalent plans, and `IN` reads more naturally in this
  context
- Use `SELECT 1` inside `EXISTS` checks, not `SELECT *`
- Indent the subquery body 4 spaces within the parentheses; align the closing `)` with the opening
  context

Correlated subquery (references outer query -- use `EXISTS`):

```sql
CASE WHEN EXISTS (
        SELECT
            1
        FROM
            [dbo].[ProviderUserView] PU
        INNER JOIN
            [dbo].[ProviderOrganizationView] PO ON PO.[ProviderId] = PU.[ProviderId]
        WHERE
            PU.[UserId] = OU.[UserId]
            AND PO.[OrganizationId] = P.[OrganizationId]
    ) THEN 1 ELSE 0 END AS [IsProvider]
```

Non-correlated subquery (self-contained -- use `IN`):

```sql
SELECT
    [Id],
    [Name]
FROM
    [dbo].[OrganizationView]
WHERE
    [Id] IN (
        SELECT
            [OrganizationId]
        FROM
            [dbo].[CollectionView]
        WHERE
            [ExternalId] IS NOT NULL
    )
```

#### Common table expressions (CTEs)

- Prefix the `WITH` keyword with a semicolon: `;WITH`
- Place the CTE name and `AS` followed by the opening `(` on the same line
- Put the closing `)` on its own line; follow it with a comma and the next CTE name when chaining
- Each CTE `SELECT` follows the same formatting rules as a regular `SELECT` statement
- Put `UNION ALL` on its own line, with a blank line above and below it

```sql
;WITH OrgUsers AS
(
    -- Active users: direct UserId match
    SELECT
        OU.[Id],
        OU.[OrganizationId],
        OU.[Status]
    FROM
        [dbo].[OrganizationUserView] OU
    WHERE
        OU.[Status] <> 0
        AND OU.[UserId] = @UserId

    UNION ALL

    -- Invited users: matched by email
    SELECT
        OU.[Id],
        OU.[OrganizationId],
        OU.[Status]
    FROM
        [dbo].[OrganizationUserView] OU
    WHERE
        OU.[Status] = 0
        AND OU.[Email] = @UserEmail
),
Providers AS
(
    SELECT
        [OrganizationId]
    FROM
        [dbo].[UserProviderAccessView]
    WHERE
        [UserId] = @UserId
)
SELECT
    OU.[Id],
    OU.[OrganizationId],
    CASE WHEN PR.[OrganizationId] IS NULL THEN 0 ELSE 1 END AS [IsProvider]
FROM
    OrgUsers OU
LEFT JOIN
    Providers PR ON PR.[OrganizationId] = OU.[OrganizationId]
```

### Stored procedures

#### Naming

Stored procedures follow the `{EntityName}_{Action}` format (e.g., `[dbo].[User_ReadById]`):

- **EntityName**: The main table or concept the procedure operates on (e.g., `User`, `Organization`,
  `Cipher`)
- **Action**: A verb from the standard list below, optionally followed by a short descriptor that
  clarifies what the procedure does

**Standard action verbs**

| Verb         | Description             |
| ------------ | ----------------------- |
| `Create`     | Insert a new record     |
| `Read`       | Select a single record  |
| `ReadMany`   | Select multiple records |
| `Update`     | Modify a record         |
| `UpdateMany` | Modify multiple records |
| `Delete`     | Remove a record         |
| `DeleteMany` | Remove multiple records |

:::tip When an operation is more specific than a standard verb alone, append a short descriptor:

- `User_ReadById` — read filtered by a specific field
- `User_ReadManyByOrganizationId` — filtered bulk read
- `OrganizationUser_UpdateStatus` — update a specific field
- `OrganizationUser_UpdateManyRevoke` — bulk revoke
- `User_UpdateApplicationData` — update a named subset of fields

:::

:::warning Do not use `Get` in procedure names

Some procedures in the codebase use `Get` instead of `Read` in the name (e.g.,
`CipherOrganizationPermissions_GetManyByOrganizationId`, `OrganizationReport_GetSummaryDataById`).
These are incorrect and should not be used as a reference. Always use `Read` or `ReadMany` for
`SELECT` operations.

:::

#### Basic structure

- **Parameters**: Start with `@` and use PascalCase (e.g., `@UserId`, `@OrganizationId`)
- **OUTPUT parameters**: Explicitly declare with `OUTPUT` keyword
- Wrap the entire procedure body in `BEGIN`/`END` statements

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

#### Common examples

**Read by ID** -- select a single record from a view:

```sql
CREATE PROCEDURE [dbo].[EntityName_ReadById]
    @Id UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON

    SELECT
        *
    FROM
        [dbo].[EntityNameView]
    WHERE
        [Id] = @Id
END
```

**Read many by IDs (small/bounded recordset)** -- bulk read using a table-valued parameter:

```sql
CREATE PROCEDURE [dbo].[EntityName_ReadManyByIds]
    @Ids AS [dbo].[GuidIdArray] READONLY
AS
BEGIN
    SET NOCOUNT ON

    SELECT
        *
    FROM
        [dbo].[EntityNameView]
    WHERE
        [Id] IN (SELECT [Id] FROM @Ids)
END
```

**Read many by IDs (large/unbounded recordset)** -- JOIN pattern for better optimizer plan selection
when the TVP may contain many rows:

```sql
CREATE PROCEDURE [dbo].[EntityName_ReadManyByIds]
    @Ids AS [dbo].[GuidIdArray] READONLY
AS
BEGIN
    SET NOCOUNT ON

    SELECT
        *
    FROM
        [dbo].[EntityNameView] E
    INNER JOIN
        @Ids I ON E.[Id] = I.[Id]
END
```

**Read many with filter** -- multiple `AND` conditions with an inline status code comment:

:::warning Do not use `And` between parameter names in procedure names

Some procedures in the codebase use `And` between parameter names. These are incorrect and should
not be used as a reference. Always concatenate parameter names directly, e.g.
`EntityName_ReadManyByOrganizationIdRole`.

:::

```sql
CREATE PROCEDURE [dbo].[EntityName_ReadManyByOrganizationIdRole]
    @OrganizationId UNIQUEIDENTIFIER,
    @Role TINYINT
AS
BEGIN
    SET NOCOUNT ON

    SELECT
        *
    FROM
        [dbo].[EntityNameDetailsView]
    WHERE
        [OrganizationId] = @OrganizationId
        AND [Status] = 2 -- 2 = Confirmed
        AND [Role] = @Role
END
```

#### Parameter declaration

- One parameter per line
- Align parameters with consistent indentation (4 spaces)
- Default values on same line as parameter
- `OUTPUT` parameters clearly marked
- Pass values in as parameters from application code rather than hard-coding them or generating them
  with a SQL function inside the procedure (e.g., `GETUTCDATE()`) -- see
  [accepted exceptions](#datetime-values) for cases where a SQL function is appropriate

:::warning Default parameter values

When adding parameters to an existing stored procedure, a default value must be specified to ensure
backward compatibility and ensure existing code can be called without modification.

:::

Use `SET NOCOUNT ON` to prevent the automatic return of row count messages, which improves
performance and ensures consistent behavior across different client applications that might handle
these messages differently.

#### Datetime values

As noted in the general standards, datetime values must be generated in application code and passed
as parameters. Do **not** use `SYSUTCDATETIME()` or `GETUTCDATE()` inline:

```sql
-- Wrong
UPDATE
    [dbo].[Entity]
SET
    [RevisionDate] = GETUTCDATE()
WHERE
    [Id] = @Id

-- Correct
UPDATE
    [dbo].[Entity]
SET
    [RevisionDate] = @RevisionDate
WHERE
    [Id] = @Id
```

**Accepted exceptions**

There are specific patterns in the codebase where using a SQL datetime function is intentional and
correct:

1. **Account revision date bumping** — The `User_BumpAccountRevisionDate*` family of procedures
   exist solely to stamp `[AccountRevisionDate]` to the current UTC time atomically, without a
   round-trip to application code.

2. **Bulk operations requiring a consistent timestamp** — When a procedure must apply the same
   timestamp across multiple rows or statements in one transaction, declare a local variable once
   and reuse it throughout the procedure:

   ```sql
   DECLARE @UtcNow DATETIME2(7) = SYSUTCDATETIME();

   UPDATE
       [dbo].[Cipher]
   SET
       [DeletedDate] = @UtcNow,
       [RevisionDate] = @UtcNow
   WHERE
       [Id] IN (SELECT [Id] FROM @Ids)
   ```

3. **`WHERE` clause predicates** — Comparing against the current time in a filter is acceptable
   (e.g., deleting expired records, skipping rows whose date has not changed since yesterday):

   ```sql
   WHERE
       [ExpirationDate] < GETUTCDATE()
   ```

4. **Nullable parameter fallbacks** — When a parameter is intentionally nullable and the procedure
   should default to the current time when no value is supplied:

   ```sql
   SET @Created = COALESCE(@Created, GETUTCDATE())
   ```

#### `INSERT` statements

- Column list in parentheses, one column per line
- `VALUES` clause with parameters aligned
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

#### `UPDATE` statements

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

#### Explicit transactions

Only wrap statements in an explicit `BEGIN TRANSACTION` / `COMMIT TRANSACTION` when a procedure
performs multiple statements that must all succeed or all fail together. A single `INSERT`,
`UPDATE`, or `DELETE` statement is already atomic on its own -- SQL Server implicitly wraps every
individual statement in a transaction, so adding an explicit one around it adds nothing except
unnecessary lock hold time and noise. When a transaction is needed, keep its scope as small as
possible -- only the statements that need to be atomic, not unrelated reads or `EXEC` calls that
don't need to roll back with them.

:::warning Do not wrap a single statement in an explicit transaction

Several `Delete` procedures in the codebase wrap a lone `DELETE` in an explicit transaction. These
should not be used as a reference:

```sql
-- Wrong -- the transaction wraps a single statement and adds nothing
CREATE PROCEDURE [dbo].[EntityName_DeleteById]
    @Id UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON

    BEGIN TRANSACTION

    DELETE
    FROM
        [dbo].[EntityName]
    WHERE
        [Id] = @Id

    COMMIT TRANSACTION
END
```

```sql
-- Correct -- no explicit transaction needed
CREATE PROCEDURE [dbo].[EntityName_DeleteById]
    @Id UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON

    DELETE
    FROM
        [dbo].[EntityName]
    WHERE
        [Id] = @Id
END
```

:::

Use an explicit transaction when a procedure deletes (or otherwise modifies) rows across multiple
related tables that must be kept in sync -- e.g. deleting a parent record along with its dependent
child records:

```sql
CREATE PROCEDURE [dbo].[EntityName_DeleteById]
    @Id UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON

    BEGIN TRANSACTION

    DELETE
    FROM
        [dbo].[ChildEntity]
    WHERE
        [EntityNameId] = @Id

    DELETE
    FROM
        [dbo].[EntityName]
    WHERE
        [Id] = @Id

    COMMIT TRANSACTION
END
```

### Tables

- **Table Name**: Singular form of the object name, PascalCase (e.g., `[dbo].[User]` not
  `[dbo].[Users]`, `[dbo].[AuthRequest]` not `[dbo].[AuthRequests]`)
- **Column Names**: PascalCase (e.g., [Id], [CreationDate], [MasterPasswordHash])
- **Primary Key**: `PK_{TableName}` (e.g., [PK_User], [PK_Organization])
- **Foreign Keys**: `FK_{TableName}_{ReferencedTable}` (e.g., FK_Device_User)
- **Default Constraints**: `DF_{TableName}_{ColumnName}` (e.g., [DF_Organization_UseScim])

:::warning Do not create `CHECK` constraints

Only primary keys, foreign keys, unique constraints, and default constraints are permitted on
tables. Do not create `CHECK` constraints -- they encode business logic in the database, which goes
against our policy of keeping business logic in the application layer.

:::

#### Column definitions

- **Alignment**: Column names, data types, and nullability vertically aligned using spaces
- **Data Types**: Use consistent type patterns:
  - `UNIQUEIDENTIFIER` for IDs
  - `DATETIME2(7)` for timestamps
  - `NVARCHAR(n)` for Unicode text
  - `VARCHAR(n)` for ASCII text
  - `BIT` for boolean values
  - `TINYINT`, `SMALLINT`, `INT`, `BIGINT` for integers
- **Data type modifiers**: No space between the type name and its size or precision modifier (e.g.,
  `NVARCHAR(50)` not `NVARCHAR (50)`, `DATETIME2(7)` not `DATETIME2 (7)`)
- **Nullability**: Explicitly specify `NOT NULL` or `NULL`
- **Datetime column naming**: Datetime columns must end with `Date` (e.g., `CreationDate`,
  `RevisionDate`, `ExpirationDate`) — do not use `At` suffixes (e.g., `CreatedAt`, `UpdatedAt`)
- **Standard Columns**: Most tables include:
  - `[Id] UNIQUEIDENTIFIER NOT NULL` - Primary key
  - `[CreationDate] DATETIME2(7) NOT NULL` - Record creation timestamp
  - `[RevisionDate] DATETIME2(7) NOT NULL` - Last modification timestamp

```sql
CREATE TABLE [dbo].[TableName]
(
    [Id]            UNIQUEIDENTIFIER    NOT NULL,
    [Column2]       NVARCHAR(100)       NOT NULL,
    [Column3]       NVARCHAR(255)       NULL,
    [CreationDate]  DATETIME2(7)        NOT NULL,
    [RevisionDate]  DATETIME2(7)        NOT NULL,
    [Column6]       BIT                 NOT NULL CONSTRAINT [DF_TableName_Column6] DEFAULT (1),
    CONSTRAINT [PK_TableName] PRIMARY KEY CLUSTERED ([Id] ASC)
);
```

### Indexes

- **Index Name**: `IX_{TableName}_{ColumnName(s)}` (e.g., `[IX_User_Email]`)
  - The name should clearly indicate the table and the columns being indexed

```sql
CREATE NONCLUSTERED INDEX [IX_OrganizationUser_UserIdOrganizationIdStatus]
   ON [dbo].[OrganizationUser]([UserId] ASC, [OrganizationId] ASC, [Status] ASC)
   INCLUDE ([AccessAll])
```

### Views

- **View Name**:
  - `{EntityName}View`
    - Used when the view maps closely to a single table, with little or no joins. (e.g.,
      `[dbo].[ApiKeyView]` from `ApiKey`)
  - `{EntityName}DetailsView` for complex views
    - Used for views that combine multiple tables or add logic beyond a basic table select. These
      usually serve a specific display or reporting use case and are named to reflect the context
      (e.g., `[dbo].[OrganizationUserDetailsView]`)
  - For views that combine entities, create a view with a clear name tied to the main entity (e.g.,
    `[dbo].[OrganizationUser_MemberAccessDetailsView]`) and a stored procedure that reads from it
    (e.g., `[dbo].[MemberAccessDetails_ReadByUserId]`).

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

- **Function Name**: `[Schema].[FunctionName]` (e.g., `[dbo].[UserCollectionDetails]`)
  - The name should describe what the function returns

```sql
CREATE FUNCTION [dbo].[FunctionName](@Parameter DATATYPE)
RETURNS TABLE
AS RETURN
SELECT
    [Column1],
    [Column2],
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

New user defined types should not be created. The following existing types may be used as
table-valued parameters in stored procedures for simple, scalar lists:

- **`[dbo].[GuidIdArray]`** — a single-column table of `UNIQUEIDENTIFIER` values. Use when passing a
  list of IDs to a stored procedure (e.g., bulk reads or deletes).

- **`[dbo].[TwoGuidIdArray]`** — a two-column table of `UNIQUEIDENTIFIER` pairs (`Id1`, `Id2`). Use
  when an operation requires two related IDs per row (e.g., user ID + organization ID).

- **`[dbo].[EmailArray]`** — a single-column table of `NVARCHAR(256)` email addresses. Use when
  passing a list of emails to a stored procedure.

For anything beyond these scalar list shapes -- multi-column rows, or a shape that may need new
properties over time -- serialize the data as JSON in application code and pass it as a single
`NVARCHAR(MAX)` parameter, rather than creating a new TVP.

#### Passing structured data as JSON

Use `OPENJSON` with an explicit `WITH` clause to shred a JSON array of objects into a typed table.
This is the preferred pattern for bulk `INSERT`/`UPDATE` operations that need more than one column
per row:

```sql
CREATE PROCEDURE [dbo].[EntityName_CreateMany]
    @EntityNameJson NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON

    INSERT INTO [dbo].[EntityName]
    (
        [Id],
        [Name],
        [CreationDate],
        [RevisionDate]
    )
    SELECT
        [Id],
        [Name],
        [CreationDate],
        [RevisionDate]
    FROM
        OPENJSON(@EntityNameJson)
        WITH (
            [Id]           UNIQUEIDENTIFIER '$.Id',
            [Name]         NVARCHAR(256)     '$.Name',
            [CreationDate] DATETIME2(7)      '$.CreationDate',
            [RevisionDate] DATETIME2(7)      '$.RevisionDate'
        )
END
```

In application code, serialize the collection with `JsonSerializer.Serialize()` and pass the result
as the parameter value; Dapper maps it to the `NVARCHAR(MAX)` parameter like any other string.

:::tip When to use JSON vs. an existing TVP

- Use the existing TVPs (`GuidIdArray`, `TwoGuidIdArray`, `EmailArray`) for simple, single- or
  two-column lists of scalar values.
- Use a JSON parameter when each row needs more than two columns, or when the row shape may need to
  gain properties over time -- adding a property to a JSON payload doesn't require a schema change,
  unlike adding a column to a TVP.

:::

## Error handling

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

## Deployment scripts

:::note Evolutionary database design

Bitwarden follows [Evolutionary Database Design (EDD)](../database-migrations/edd). If a deployment
fails and server code is rolled back, database changes are **not** rolled back with it. This means
all migrations must support both the current release and the next release simultaneously.

:::

There are specific ways migration scripts should be structured. We do so to adhere to the following
guiding principles:

- **It must be idempotent**: Always ensure a migration can be run multiple times without causing
  errors or duplicating data.

- **It must avoid breaking changes**: Migrations should never delete or rename columns that are
  still in use by deployed code.

- **It must maintain schema integrity**: The schema of the database defined in code should map
  exactly to the schema of the database in all deployed environments.

- **It must be backwards compatible**: Code should be able to work with both the old and new schema
  during a rolling deployment.

### Tables

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

:::warning Always add new columns at the end of the column list

`ALTER TABLE ... ADD` always appends columns to the end of the table. Place new columns after the
last existing column in the table definition so the schema file stays in sync with the deployed
table structure.

:::

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

ALTER TABLE [dbo].[Table]
    ALTER COLUMN [Column] INT NOT NULL
GO
```

This is better:

```sql
IF COL_LENGTH('[dbo].[Table]', 'Column' IS NULL
BEGIN
    ALTER TABLE [dbo].[Table]
        ADD [Column] INT NOT NULL CONSTRAINT DF_Table_Column DEFAULT 0
END
GO
```

:::warning Do not use defaults for string columns

Default values should only be used for integral types (`BIT`, `TINYINT`, `SMALLINT`, `INT`,
`BIGINT`). Do not provide default values for string columns (`VARCHAR`, `NVARCHAR`, or their `MAX`
variants), as this can lead to unnecessary storage overhead and performance issues.

:::

#### Changing a column data type

You must wrap the `ALTER TABLE` statement in a conditional block, so that subsequent runs of the
script will not modify the data type again.

```sql
IF EXISTS (
    SELECT
        *
    FROM
        INFORMATION_SCHEMA.COLUMNS
    WHERE
        COLUMN_NAME = '{column_name}'
        AND DATA_TYPE = '{datatype}'
        AND TABLE_NAME = '{table_name}'
)
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

#### Creating or modifying a view

Use the `CREATE OR ALTER` syntax for adding or modifying a view.

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

When deleting a view, use `IF EXISTS` to avoid an error if the view doesn't exist.

```sql
DROP IF EXISTS [dbo].[{view_name}]
GO
```

#### Adjusting metadata

When altering views, you may also need to refresh modules (stored procedures or functions) that
reference that view so that SQL Server can update its cached metadata and compiled references to it.

```sql
IF OBJECT_ID('[dbo].[{procedure_or_function}]') IS NOT NULL
BEGIN
    EXECUTE sp_refreshsqlmodule N'[dbo].[{procedure_or_function}]';
END
GO
```

### Functions and stored procedures

#### Creating or modifying a function or stored procedure

Use the `CREATE OR ALTER` syntax for adding or modifying a function or stored procedure.

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

### Indexes

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

#### Modifying Existing Indexes

To add columns to an existing index, recreate the index with the same name using
`DROP_EXISTING = ON`. SQL Server will build the new index from the existing one while keeping the
old index available for queries during the rebuild.

```sql
IF EXISTS (
    SELECT
        *
    FROM
        sys.indexes
    WHERE
        name = 'IX_Organization_Enabled'
        AND object_id = OBJECT_ID('[dbo].[Organization]')
)
BEGIN
    CREATE NONCLUSTERED INDEX [IX_Organization_Enabled]
    ON [dbo].[Organization]([Id] ASC, [Enabled] ASC)
    INCLUDE ([UseTotp], [UsersGetPremium])
    WITH (DROP_EXISTING = ON);
END
ELSE
BEGIN
    CREATE NONCLUSTERED INDEX [IX_Organization_Enabled]
    ON [dbo].[Organization]([Id] ASC, [Enabled] ASC)
    INCLUDE ([UseTotp], [UsersGetPremium]);
END
GO
```

#### Index best practices

- Create indexes after table definition with `GO` separator
- Include `INCLUDE` clause when beneficial for covering indexes
- Use filtered indexes with `WHERE` clause when appropriate

[repository]:
  https://docs.microsoft.com/en-us/dotnet/architecture/microservices/microservice-ddd-cqrs-patterns/infrastructure-persistence-layer-design
[dapper]: https://github.com/DapperLib/Dapper
