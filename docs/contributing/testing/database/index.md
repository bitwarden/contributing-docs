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
