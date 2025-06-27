# Database Integration Testing

Since Bitwarden has multiple database options, automated testing is extremely important to avoid
time-consuming manual testing for each database type. The `Infrastructure.IntegrationTest` project
allows you to write tests that are automatically executed on all supported databases in our testing
pipeline.

## Creating a new test

To create a new database test, add the `[DatabaseTheory]` and `[DatabaseData]` attributes to test.
Then, use the parameters of the test to inject any repository layer services you need. The test will
run for every database that is [configured in the current environment](#configure-the-tests). Since
you inject the interface of the service, some runs of the test will use the Dapper-based repository
implementation targeting Microsoft SQL Server and others will use the Entity Framework Core based
implementations (which we use for MySql, Postgres, and SQLite).

The goal of database tests is to test the business logic that is encapsulated in a given method. For
example, if a stored procedure in SQL Server calls another procedure to update the
`User.AccountRevisionDate` then the corresponding EF implementation should do that as well. By
running the test against all variants, we are ensuring all the variants are feature-equal. to only
run the SQL Server tests along with one EF implementation; SQLite is often the easiest in that
regard. The other supported EF database providers will still run in the pipeline to catch any
differences between them.

## Configure the tests

The tests are configured through
[.NET Configuration](https://learn.microsoft.com/en-us/dotnet/core/extensions/configuration). They
are applied in the following order: user secrets, environment variables prefixed with `BW_TEST_`,
and command line args.

```csharp
public class Root
{
    public Database[] Databases { get; set; }
}

public class Database
{
    public SupportedDatabaseProviders Type { get; set; }
    public string ConnectionString { get; set; } = default!;
    public bool UseEf { get; set; }
    public bool Enabled { get; set; } = true;
}
```

The `Type` property is an enum with the supported values being `SqlServer`, `MySql`, `Postgres`, or
`Sqlite`. The `UseEf` property is only utilized if the `Type` is set to `SqlServer`; by default
`SqlServer` will be configured with the Dapper repositories, however by setting `UseEf` to `true` it
will be configured with the Entity Framework Core repositories. `Enabled` allows you to easily
disable one database but not delete the entry; it can be helpful if you are encountering a problem
with just a single database type and want to run the tests just for it instead of for all of them.

### Locally

To set the tests up locally you may want to add the configuration to your `server/dev/secrets.json`
file. You may have already done this during setup and can just run the tests with `dotnet test`. If
not, please refer to
[the getting started guide](/getting-started/server/database/ef/#testing-ef-changes).

You can also configure the tests just like the pipeline.

### Pipeline

The database tests have been pre-configured to run on all supported databases in the
[`test-database.yml`](https://github.com/bitwarden/server/blob/main/.github/workflows/test-database.yml)
file.

The pipeline uses environment variables. An example entry you might add is:

```bash
BW_TEST_DATABASES__0__TYPE: SqlServer
BW_TEST_DATABASES__0__CONNECTIONSTRING: myConnectionString
```

## Testing specific database migrations

When you need to test a specific database migration, you can use the
[`MigrationName`](https://github.com/bitwarden/server/blob/021e69bc5dfea8be3b74f7a046a1cd48a206a712/test/Infrastructure.IntegrationTest/DatabaseDataAttribute.cs#L21)
property of the `[DatabaseData]` attribute. This allows you to apply and verify a migration across
all configured database providers.

> **Note**: This is meant for testing data migrations only. It assumes your database schema is
> already fully up-to-date. After setting up your test data, it re-runs the specified migration to
> verify how it transforms the data. It will not work for schema-only migrations.

### Using `MigrationName`

To test a migration, set the `MigrationName` property on the `[DatabaseData]` attribute and inject
`IMigrationTesterService`:

```csharp
[DatabaseTheory, DatabaseData(MigrationName = "ExampleDataMigration")]
public async Task TestExampleDataMigration(
    IMigrationTesterService migrationTester,
    IOrganizationRepository organizationRepository)
{
    // Arrange: Set up data before migration
    var org = await organizationRepository.CreateAsync(new Organization
    {
        Name = "Test Org",
        Plan = "Enterprise"
    });

    // Act: Apply the migration
    migrationTester.ApplyMigration();

    // Assert: Verify the results after migration
    var updatedOrg = await organizationRepository.GetByIdAsync(org.Id);
    // Add assertions here to verify migration effects
}
```

### Migration naming conventions

The `MigrationName` must correspond to migrations in all supported databases:

- **SQL Server**: Must match a file in `util/Migrator/DbScripts/` ending in `<MigrationName>.sql`
  Example: `MigrationName = "ExampleDataMigration"` for `2024-01-15_00_ExampleDataMigration.sql`
- **Entity Framework**: Must match the EF migration class name

### Best practices

1. **Validate data migrations**: Ensure data is accurately transformed.
2. **Use descriptive test names**: Make test names reflect the purpose and scope of the migration.
3. **Remove after release**: These tests are short-lived and should be deleted after the migration
   is deployed and verified in production (as part of EDD cleanup).
