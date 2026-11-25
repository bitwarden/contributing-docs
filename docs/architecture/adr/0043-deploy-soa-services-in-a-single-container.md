---
adr: "0043"
status: Proposed
date: 2026-11-25
tags: [server, server-sdk]
---

# 0043 - Deploy SOA services in a single container

<AdrTable frontMatter={frontMatter}></AdrTable>

## Context and problem statement

A single-container deployment runs Bitwarden from one container image and needs nothing from the
operator except a database. Bitwarden Lite is today's single-container deployment: one image,
`ghcr.io/bitwarden/lite`, built for amd64, arm64 and arm/v7.

### How the single-container deployment works today

Source: `bitwarden/self-host`, `bitwarden-lite/`, `main` as of 2026-11-23.

- **One image, eight independent services.** The image is built on
  `mcr.microsoft.com/dotnet/aspnet:10.0-alpine3.24` and copies each service's binaries, unmodified,
  out of that service's own server image: **Admin, Api, Events, Icons, Identity, Notifications, SCIM
  and SSO**. The image runs the same binaries as every other deployment.
- **Each service is its own process.** `supervisord` runs each one as a separate program on its own
  localhost port. nginx, also supervised, routes by path (`/api/`, `/identity`, `/notifications/`,
  `/scim/` and so on) and serves the web vault and attachments. A tenth program runs scheduled
  database backups.
- **Services are switched on and off individually.** Each has a `BW_ENABLE_*` setting; Events, SCIM
  and SSO are off by default.
- **Services not relevant to a self-hosted install are not shipped.** The server's Billing and
  EventsProcessor services are not in the image.
- **The database is external and operator-supplied**: SQL Server, PostgreSQL, MySQL/MariaDB or
  SQLite.
- **There is no cache server and no message broker.** Where cloud uses them, the server substitutes
  a per-deployment implementation chosen at startup:

| Concern   | Supported implementations                                                                 | The image uses         |
| --------- | ----------------------------------------------------------------------------------------- | ---------------------- |
| Caching   | Entity Framework cache table<br />In-memory<br />Redis<br />SQL Server cache table        | A database cache table |
| Messaging | Azure Queue<br />Azure Service Bus<br />RabbitMQ<br />Write to database<br />No messaging | Write to database      |

### The problem

Once Bitwarden migrates to a
[service-oriented architecture](./0035-service-oriented-architecture.md) (SOA), the single-container
deployment has to run the new SOA services instead of the monolith's, and that SOA makes heavy use
of a **network cache** and **messaging**.

This ADR decides three things for that end state:

1. How the services are hosted.
2. What to use for the network cache (if anything).
3. What to use for messaging (if anything).

## Considered options

### Decision 1: hosting the services

- **One process.** Compose every service's Minimal API endpoints into a single host process.
- **Multiple processes.** Run each service as its own process, the same binary as cloud, as the
  single-container deployment does today.

|                                                            | One Process                          | Multiple Processes            |
| ---------------------------------------------------------- | ------------------------------------ | ----------------------------- |
| Same binary and `Program.cs` as cloud                      | ❌ a host unique to this deployment  | ✅                            |
| Each service's DI, options, auth and middleware as written | ❌ merged into one DI container      | ✅                            |
| Cross-service calls traverse the callee's full pipeline    | ⚠️ only if loopback HTTP is kept     | ✅                            |
| Fault and dependency isolation between services            | ❌ one process, one dependency graph | ✅                            |
| Services switched on and off individually                  | ⚠️ needs new composition logic       | ✅                            |
| Adding a service is additive                               | ⚠️ edits the composite host          | ✅ one more program and route |
| Memory                                                     | ✅ one runtime                       | ⚠️ one runtime per service    |

### Decision 2: the network cache

- **Database table.** Use a database-backed cache table in the operator's database.
- **No cache.** Use no cache in the single-container deployment; service clients call the owner
  every time.
- **In-memory.** Use an in-memory cache in each process.
- **Redis.** Ship Redis in the image and use it exactly as cloud does.

|                                                 | Database table    | No cache | In-memory                        | Redis                |
| ----------------------------------------------- | ----------------- | -------- | -------------------------------- | -------------------- |
| Same cache code and behavior as cloud           | ❌                | ❌       | ❌                               | ✅                   |
| Works across processes                          | ✅                | N/A      | ❌ each process has its own copy | ✅                   |
| No per-provider code or schema                  | ❌ four providers | ✅       | ✅                               | ✅                   |
| Keeps cache traffic off the operator's database | ❌                | ❌       | ✅                               | ✅                   |
| Extra memory                                    | ✅ none           | ✅ none  | ✅ none                          | ⚠️ one small process |

### Decision 3: messaging

- **No messaging.** Send no messages in the single-container deployment: disable the code paths that
  publish and consume.
- **Home-grown.** Use an in-process or home-grown transport: an in-memory channel, or a queue table
  in the operator's database.
- **RabbitMQ.** Ship [RabbitMQ](https://www.rabbitmq.com/) in the image.
- **LavinMQ.** Ship [LavinMQ](https://lavinmq.com/) in the image.

|                                             | No messaging                   | Home-grown                             | RabbitMQ                         | LavinMQ                              |
| ------------------------------------------- | ------------------------------ | -------------------------------------- | -------------------------------- | ------------------------------------ |
| Uses a transport the SDK already ships      | ❌ disabled in this deployment | ⚠️ in-memory channel only, one process | ✅ SDK RabbitMQ transport        | ✅ SDK RabbitMQ transport            |
| SDK transport suite passes unchanged        | N/A                            | ❌ no such suite                       | ✅ RabbitMQ 4.2.0                | ⚠️ to re-run on current transport    |
| Delivery guarantees provided by the broker  | N/A                            | ❌ reimplemented by us                 | ✅                               | ✅                                   |
| Works across processes                      | N/A                            | ⚠️ database queue only                 | ✅                               | ✅                                   |
| Features that consume published events work | ❌                             | ✅                                     | ✅                               | ✅                                   |
| Program memory, measured                    | ✅ none                        | ✅ none                                | ❌ about 100 MiB<sup>1</sup>     | ✅ about 28 MiB<sup>1</sup>          |
| 100,000-message backlog, untuned            | N/A                            | N/A                                    | ❌ killed at 160 MiB<sup>1</sup> | ✅ drained inside 64 MiB<sup>1</sup> |

:::info

<sup>1</sup> Measurements were taken on 2026-10-10 with an earlier version of the SDK's RabbitMQ
topology (topic exchange, durable queues, retry by message expiry, dead-letter exchange, publisher
confirms) on 2 CPUs with persistent 1 KB messages. RabbitMQ survived the backlog in 256 MiB once
given an absolute memory limit. They are to be repeated against the current topology (quorum queues,
delivery limits).

:::

## Decision outcome

### 1. Each service runs as a stand-alone process

The single-container deployment runs each service as its own process, under a supervisor and behind
nginx, for the following reasons:

- It runs the same binary as cloud, so a service tested in cloud is tested for the single-container
  deployment.
- Every service-to-service call takes the same path as in cloud: an HTTP request through the
  callee's full pipeline.
- Adding a service is additive: one more binary, one more supervisor program and one more nginx
  route.
- It is how the single-container deployment works today: eight services, each its own process.

A service that has no function on a self-hosted install, such as Billing, is not shipped.

Alternatives rejected:

- **One process is rejected because it is a second code path and a single failure domain.** Each
  service owns its `Program.cs`: its DI registrations, options, authentication schemes, middleware
  order, health checks and hosted services such as the outbox relay. Merging them into one
  `WebApplication` would be a second startup path that exists only in this deployment, with
  collisions wherever two services register the same types differently, and a standing temptation to
  call other services in-process, past their authorization and validation. It would also put
  Bitwarden's SOA, which already tracks over 1,100 APIs, in one failure domain: a crash, deadlock or
  runaway allocation in any one of them would take down all of them. The memory it would save does
  not come close to paying for that.

### 2. Redis ships in the container

Redis runs as a supervised process inside the image for the following reasons:

- Services and service clients use the same cache code and configuration as in cloud, pointed at
  localhost.
- Every process shares it, so the owning service's invalidation reaches every reader.
- It is lightweight: one more small process alongside the eight services the image already runs.

Alternatives rejected:

- **A database-backed cache is rejected because it is a worse Redis.** It needs a schema and
  implementation for each of four database providers, it moves cache traffic onto the database the
  cache exists to protect, and its expiry and concurrency semantics differ from what cloud runs.
- **No cache is rejected because it removes code cloud depends on.** Keys, serialization, expiry and
  invalidation would go untested in this deployment, and every service client would behave
  differently between deployments.
- **In-memory is rejected because it is incorrect.** The owning service invalidates the cache in its
  own write path, but readers are service clients in other processes. With a cache per process, the
  owner can clear only its own copy, and every other process keeps serving stale data, including
  stale authorization data.

### 3. LavinMQ ships in the container

LavinMQ runs as a supervised process inside the image for the following reasons:

- Services publish and consume through the SDK's RabbitMQ transport, which ships and is tested
  alongside the Azure Service Bus transport cloud uses. No transport is written for this deployment.
- The broker provides durability, retry, dead-lettering and publisher confirms, so we build none of
  them.
- It is lightweight: about 28 MiB of program memory, and it drained a 100,000-message backlog inside
  64 MiB without tuning.

Alternatives rejected:

- **No messaging is rejected because it is a second code path in every service.** Each publish and
  consume would need a switch for this deployment alone, the outbox would be turned off in it, and
  every feature built on published events would be missing or reimplemented there.
- **A home-grown transport is rejected because it reimplements the broker.** It would have to
  rebuild durability, retry, dead-lettering and publisher confirms, it would be exercised by the
  fewest installs, and it would be a second implementation of the platform's delivery guarantees.
  The SDK's in-memory channel transport runs inside one process, so it cannot carry messages between
  services.
- **RabbitMQ is rejected on memory.** It runs the same transport code, so it costs nothing in code
  paths, but it needs about 100 MiB of program memory, four times LavinMQ's, and was killed at 160
  MiB draining the same backlog until given an absolute memory limit.

### Positive consequences

- <u>One</u> code path for hosting and caching in every deployment, and no messaging transport that
  exists only for this deployment. **Apart from its broker, a service tested in cloud is tested for
  the single-container deployment.**
- No implementation exists only for the single-container deployment.
- The single-container deployment still needs nothing from the operator but a database.
- Adding a service to the single-container deployment stays additive.

### Negative consequences

- The single-container deployment's memory grows with the number of services, one .NET runtime each,
  plus Redis and LavinMQ. Its minimum hardware requirements will have to be restated once the SOA
  service count is settled.
- Two more third-party products ship inside the image and must be patched with it.
- Messaging uses the SDK's RabbitMQ transport, not the Azure Service Bus transport cloud uses, so
  cloud does not exercise it. LavinMQ's results are to be re-run against the current transport.
- LavinMQ publishes no build for 32-bit ARM (arm/v7). If arm/v7 support is required, we will either
  produce an arm/v7 build of LavinMQ ourselves or support only RabbitMQ on that architecture, and
  RabbitMQ's memory requirements may make running the SOA version of Bitwarden on a 32-bit Raspberry
  Pi impractical.
