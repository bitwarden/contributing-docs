# T-SQL

## Repositories

We use the [Repository pattern][repository] with the MSSQL repositories being written using
[Dapper][dapper]. Each repository method in turn calls a _Stored Procedure_, which primarily fetches
data from _Views_.

## Structuring T-SQL code

For writing our T-SQL code and segregating responsibility across the SQL entities, we follow a
Separation of Concerns with a Layered Data Access Pattern [link?]. This informs us to use the
following design guidelines:

### Views

### Stored Procedures

#### Single Responsibility Principle

- Views: Responsible ONLY for complex data logic (joins, CTEs, filtering)
- Stored Procedures: Responsible ONLY for parameterized data access (simple SELECT with WHERE)

This follows the “Tell, Don’t Ask” principle - procedures tell views what parameters they need,
views handle the complex “how” internally.

#### Separation of Concerns

- Business Logic Layer (Views): Contains the “what” - complex query logic, joins, windowing
  functions
- Data Access Layer (Procedures): Contains the “how” - parameter handling, security context

#### Dependency Inversion

- High-level modules (stored procedures) don’t depend on low-level modules (tables)
- Both depend on abstractions (views)
- Tables → Views → Procedures (dependency flows upward)

#### Interface Segregation

- Views act as stable interfaces that can change internal implementation without breaking procedures
- Procedures provide consistent API regardless of underlying view complexity

Specific Pattern: Repository + Strategy Tables (Data Storage) ↓ Views (Data Logic Strategy) ↓
Procedures (Data Access Repository) ↓ Application Code

### Benefits Achieved

1. Maintainability: Change complex logic in views without touching procedures
2. Testability: Views can be tested independently of procedures
3. Reusability: Multiple procedures can use the same view
4. Performance: Database engine optimizes view logic once
5. Security: Consistent data access patterns through procedures

[repository]:
  https://docs.microsoft.com/en-us/dotnet/architecture/microservices/microservice-ddd-cqrs-patterns/infrastructure-persistence-layer-design
[dapper]: https://github.com/DapperLib/Dapper
