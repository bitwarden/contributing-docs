# Read-Only Database Replicas

## Context

Bitwarden Utilizes
[Azure SQL Hyperscale](https://learn.microsoft.com/en-us/azure/azure-sql/database/service-tier-hyperscale?view=azuresql)

Bitwarden utilizes the
[high-availability replica](https://learn.microsoft.com/en-us/azure/azure-sql/database/service-tier-hyperscale-replicas?view=azuresql#high-availability-replica)
available as a read replica. This allows Bitwarden to double the max worker limit (along with
compute, memory, network throughput) without needing to scale up the primary database. The HA
replica replicates the primary instance by mirroring the transaction log records.

## Vision

More read-only capabilities should be used in conjunction with read-only replicas - Especially after
stored procedures have been tuned and there are prominent performance bottlenecks relating to
read-only queries.

## Usage

We currently use the read-only replica in two areas

1. Dapper Repositories with the ReadOnlyConnectionString
   [defined](https://github.com/search?q=repo%3Abitwarden%2Fserver%20path%3A%2F%5Esrc%5C%2FInfrastructure%5C.Dapper%5C%2FRepositories%5C%2F%2F%20ReadOnlyConnectionString&type=code).
2. Data engineering pipelines that require direct connection to the database.

## Gotchas / Considerations

- [CAP Theorem](https://en.wikipedia.org/wiki/CAP_theorem) applies here. Microsoft does not
  guarantee data consistency and
  [propagation latency](https://learn.microsoft.com/en-us/azure/azure-sql/database/read-scale-out?view=azuresql#data-consistency)
  could vary greatly. For business logic that need consistency, read-only replicas are not a viable
  solution.
- Lack of observability -- currently there is limited visibility into query performance metrics as
  well as resource utilization on the replica itself.
- Long-running queries on read-only replicas can cause
  [blocking](https://learn.microsoft.com/en-us/azure/azure-sql/database/read-scale-out?view=azuresql#long-running-queries-on-read-only-replicas).
- The HA replica is not a backup and should not be treated as such. If a destructive migration had
  been run on the primary instance it will be reflected on the HA replica. DR procedures will have
  to be carried out in this scenario and there will be data loss.
