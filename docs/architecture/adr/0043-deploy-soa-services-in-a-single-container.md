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

- **One image, eight independent services:** the image is built on
  `mcr.microsoft.com/dotnet/aspnet:10.0-alpine3.24` and copies each service's binaries, unmodified,
  out of that service's own server image: **Admin, Api, Events, Icons, Identity, Notifications, SCIM
  and SSO**. The image runs the same binaries as every other deployment.
- **Each service is its own process:** `supervisord` runs each one as a separate program on its own
  localhost port. nginx, also supervised, routes by path (`/api/`, `/identity`, `/notifications/`,
  `/scim/` and so on) and serves the web vault and attachments. A tenth program runs scheduled
  database backups.
- **Services are switched on and off individually:** each has a `BW_ENABLE_*` setting; Events, SCIM
  and SSO are off by default.
- **Services not relevant to a self-hosted install are not shipped:** the server's Billing and
  EventsProcessor services are not in the image.
- **The database is external and operator-supplied:** SQL Server, PostgreSQL, MySQL/MariaDB or
  SQLite.
- **There is no cache server and no message broker:** where cloud uses them, the server substitutes
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

- How the services are hosted.
- What to use for the network cache (if anything).
- What to use for messaging (if anything).

## Considered options

### Decision 1: hosting the services

- **One process:** compose every service's Minimal API endpoints into a single host process.
- **Multiple processes:** run each service as its own process, the same binary as cloud, as the
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

- **Database table:** use a database-backed cache table in the operator's database.
- **No cache:** use no cache in the single-container deployment; service clients call the owner
  every time.
- **In-memory:** use an in-memory cache in each process.
- **Redis:** ship Redis in the image and use it exactly as cloud does.

|                                                 | Database table    | No cache | In-memory                        | Redis                |
| ----------------------------------------------- | ----------------- | -------- | -------------------------------- | -------------------- |
| Same cache code and behavior as cloud           | ❌                | ❌       | ❌                               | ✅                   |
| Works across processes                          | ✅                | N/A      | ❌ each process has its own copy | ✅                   |
| No per-provider code or schema                  | ❌ four providers | ✅       | ✅                               | ✅                   |
| Keeps cache traffic off the operator's database | ❌                | ❌       | ✅                               | ✅                   |
| Extra memory                                    | ✅ none           | ✅ none  | ✅ none                          | ⚠️ one small process |

### Decision 3: messaging

- **No messaging:** send no messages in the single-container deployment: disable the code paths that
  publish and consume.
- **Home-grown:** use an in-process or home-grown transport: an in-memory channel, or a queue table
  in the operator's database.
- **RabbitMQ:** ship [RabbitMQ](https://www.rabbitmq.com/) in the image.
- **LavinMQ:** ship [LavinMQ](https://lavinmq.com/) in the image.

|                                             | No messaging                   | Home-grown                             | RabbitMQ                         | LavinMQ                              |
| ------------------------------------------- | ------------------------------ | -------------------------------------- | -------------------------------- | ------------------------------------ |
| Uses a transport the SDK already ships      | ❌ disabled in this deployment | ⚠️ in-memory channel only, one process | ✅ SDK RabbitMQ transport        | ✅ SDK RabbitMQ transport            |
| SDK transport suite passes unchanged        | N/A                            | ❌ no such suite                       | ✅ RabbitMQ 4.2.0                | ✅ LavinMQ 2.10.4                    |
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

### Decision 1: hosting the services

Chosen option: **Multiple processes**, because it is the only option with one code path: each
service runs the same binary, startup and service-to-service calls as in cloud.

One process would be a startup path that exists only in this deployment, merging every service's DI
registrations, authentication and middleware into one `WebApplication`, and it would put Bitwarden's
SOA, which already tracks over 1,100 APIs, in one failure domain. The memory it would save does not
pay for that. A service with no function on a self-hosted install, such as Billing, is not shipped.

### Decision 2: the network cache

Chosen option: **Redis**, because services and service clients use the same cache code and
configuration as in cloud, and one shared cache lets the owning service's invalidation reach every
reader.

A database table is a worse Redis: it needs a schema for each of four database providers and puts
cache traffic on the database the cache exists to protect. No cache leaves cloud's caching code
untested in this deployment. An in-memory cache is incorrect: the owning service can clear only its
own process's copy, so every other process keeps serving stale data, including stale authorization
data.

### Decision 3: messaging

Chosen option: **LavinMQ**, because it runs on the RabbitMQ transport the SDK already ships, the
broker provides the delivery guarantees, and it needs about a quarter of RabbitMQ's memory.

No messaging would need a switch for this deployment in every service and would turn off every
feature built on published events. A home-grown transport would reimplement the broker's delivery
guarantees for the fewest installs, and the SDK's in-memory channel runs inside one process.
RabbitMQ runs the same transport code but needs about 100 MiB of program memory, four times
LavinMQ's.

### Positive consequences

- <u>One</u> code path for hosting and caching in every deployment, and no messaging transport that
  exists only for this deployment. **Apart from its broker, a service tested in cloud is tested for
  the single-container deployment.**
- No implementation exists only for the single-container deployment.
- The single-container deployment still needs nothing from the operator but a database.
- Adding a service to the single-container deployment stays additive.

### Negative consequences

- The single-container deployment's memory grows with the number of services, one .NET runtime each,
  plus Redis and LavinMQ.
- Two more third-party products ship inside the image and must be patched with it.
- Messaging uses the SDK's RabbitMQ transport, not the Azure Service Bus transport cloud uses, so
  cloud does not exercise it.
- LavinMQ publishes no build for 32-bit ARM (arm/v7), so supporting arm/v7 means building LavinMQ
  ourselves or running RabbitMQ, whose memory may make a 32-bit Raspberry Pi impractical.

### Plan

The decisions take effect when the single-container deployment moves to the SOA's services. Today's
image is unchanged until then.

- **Broker support in the SDK:** `Bitwarden.Server.Sdk.MessageBroker` supports LavinMQ alongside
  RabbitMQ and runs its broker tests on LavinMQ in CI
  ([dotnet-extensions#489](https://github.com/bitwarden/dotnet-extensions/pull/489)). A self-hosted
  service creates the broker topology it needs as it starts
  ([dotnet-extensions#502](https://github.com/bitwarden/dotnet-extensions/pull/502)).
- **Memory measurements:** repeat the 2026-10-10 measurements against the current `MessageBroker`
  topology before the image changes.
- **The image:** in `bitwarden/self-host`'s `bitwarden-lite/`, run each SOA service that applies to
  a self-hosted install as a supervised program behind nginx, as today, and add Redis and LavinMQ as
  supervised programs that the services reach on localhost.
- **arm/v7:** decide with the self-host team whether the single-container deployment keeps 32-bit
  ARM. If it does, build LavinMQ for arm/v7 or run RabbitMQ on that architecture.
- **Hardware requirements:** restate the minimum requirements once the SOA's service count is
  settled.
