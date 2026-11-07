---
adr: "0041"
status: Proposed
date: 2026-11-05
tags: [server, server-sdk, sdk, tests]
---

# 0041 - Require every service to provide seeding components

<AdrTable frontMatter={frontMatter}></AdrTable>

## Notation

This ADR uses [RFC 2119](https://www.rfc-editor.org/info/rfc2119/) keywords (`MUST`, `MUST NOT`,
`SHOULD`, `SHOULD NOT`, `MAY`) deliberately. Anything marked `MUST` or `MUST NOT` is not negotiable
at team level; a team that needs an exception brings the case to the architecture group.

## Context and problem statement

[ADR-0040](./0040-seed-test-data-as-the-client.md) records why the Seeder is internal tooling that
acts as the client, and what it must keep doing. Today the Seeder writes directly to the monolith's
database, with no services running ([Seeder](../../getting-started/server/seeder.md)). Under the
[service-oriented architecture](./0035-service-oriented-architecture.md), rule 2 makes each
resource's owning service the only process that reads or writes its store. The Seeder can't keep
writing to stores it doesn't own.

A proof of concept that moved part of the server into services showed what happens when nothing
replaces those writes:

- Its seeder worked through the services' APIs. It kept the Seeder API's scene contract and 16 of
  the Seeder's 36 scenes, with no CLI, no presets and no scale seeding.
- The product APIs sent mail, recorded events and gave client organizations their provider's billing
  email, side effects the Seeder never has.
- To reach the Seeder's states, four services gained 13 operations that only the Seeder's identity
  may call. These are seeding components, built one at a time with no shared contract.
- A security review found one of them reachable from the network, guarded only by the environment
  name.
- Scale data for timing the move came from the monolith's Seeder CLI and was then migrated. That
  path ends when the monolith retires.

Performance and load testing of the services can't start until something can create
production-shaped volume in them: thousands of users, hundreds of groups and thousands of
collections, configured the way the scale presets configure them today. Nothing in the services can
create it.

Seeding is also needed outside automated tests, by bulk processes. One exists today: the build that
creates seeded database images and loads them into an Azure Container Registry. Others are yet to be
defined. Today the Seeder fills one database, so an organization's data stays consistent in it. With
an independent database per service, nothing keeps that data consistent across services unless the
Seeder does.

## Considered options

- **Seed only through product APIs:** the Seeder calls the APIs the clients call.
- **One Seeder writes every service's store:** the Seeder keeps writing directly to each service's
  database.
- **Seed the monolith, then migrate:** create data with today's Seeder and move it into the
  services.
- **Every service provides seeding components:** each owning service provides components that seed
  its resources as a web API, and one Seeder coordinates them.

### Seed only through product APIs

**Pros**

- No test-only code in any service.
- Test data passes every product validation rule.

**Cons**

- Can't create the states ADR-0040 rule 1 lists.
- Sends mail, records events and makes billing changes as side effects.
- Slow at volume, because every row goes through a product request.
- The proof of concept tried it and still needed seeder-only operations.

### One Seeder writes every service's store

**Pros**

- Keeps today's bulk writes.
- No seeding code in any service.

**Cons**

- Breaks ADR-0035 rule 2.
- Couples the Seeder to every service's schema, so any service's schema change can break seeding.

### Seed the monolith, then migrate

**Pros**

- Reuses today's Seeder, presets and scale unchanged.

**Cons**

- Stops working when the monolith retires.
- Seeds only the monolith's schema, so a resource that exists only in a service can't be seeded.

### Every service provides seeding components

**Pros**

- Keeps ADR-0035 rule 2: only the owner writes its store.
- Each owner keeps its seeding current with its own schema.
- Can reach the same states as today's Seeder, and its bulk operations are meant to reach today's
  volumes.

**Cons**

- Every service carries test-only code that must stay out of its production builds.
- Seeding through the web APIs needs the services running.
- The Seeder, not a database, keeps an organization's data consistent across services, so a
  verification step has to check that it did.

## Decision outcome

Chosen option: **Every service provides seeding components**, because it is the only option that
keeps ADR-0035's data ownership and can still reach the states and volumes testing needs.

### Positive consequences

- Scale seeding and production-like data survive the move to services.
- Each owner keeps its seeding current with its own schema.
- Performance and load testing of the services becomes possible.
- Test suites keep the scene contract and change only their target.

### Negative consequences

- Every service carries test-only code that must stay out of its production builds.
- Seeding across services isn't atomic, so a failed run can leave partial data for cleanup to
  remove.
- Seeding needs the services running, for test runs and bulk processes alike.
- Bulk throughput across service boundaries is unproven.
- The Seeder produces consistency across independent databases, and the build that produces a seeded
  environment verifies it. No database enforces it across services.

### Plan

#### Rules

1. The Seeder `MUST` remain internal tooling, as [ADR-0040](./0040-seed-test-data-as-the-client.md)
   rule 1 requires.
1. Every service that owns resources `MUST` provide seeding components for them.
   - A seeding component `MUST` be a web API that the service defines and owns. Every consumer calls
     that API with the service running, including bulk processes such as the seeded database image
     build.
   - A bulk process `MUST NOT` write a service's store except through that service's seeding
     components, as [ADR-0035](./0035-service-oriented-architecture.md) rule 2 requires.
1. A seeding component:
   - `MUST` accept Protected Data and store it as received (P01).
   - `MAY` skip validation rules that would stop production-like data from being created.
   - `MUST NOT` skip rules that protect zero knowledge or key integrity.
   - `MUST NOT` send mail or call an external billing provider.
   - `MUST NOT` be present in a production build or image. A seeding component lives in an assembly
     or host that production deployments do not include, so no runtime check decides whether it is
     reachable. This is how ADR-0040 rule 1 applies to code that lives inside a service.
   - `MUST NOT` be served on a public endpoint. The Seeder API is the public, authenticated entry
     point for test runners; it calls the components within the environment.
   - `MUST` be usable only by the Seeder's identity, and `MUST` refuse the request when that
     identity or its scope cannot be verified.
   - `MUST` follow the [Service-to-Service API Standards](../server/apis/index.md)
     ([ADR-0036](./0036-service-to-service-api-standards.md)) for its web API, including their
     [bulk operations](../server/apis/bulk-operations/index.md).
1. The Seeder `MUST` seed every service's independent database and `MUST` leave an organization's
   data consistent across them, as it is in the monolith's database today.
   - Every reference that one service holds to another service's resource `MUST` resolve to a
     resource in the owning service. This includes any local copy of another service's data that
     ADR-0035 rule 8 allows.
   - Each service `MUST` hold exactly the resources the preset defines for it, in the counts the
     preset specifies.
   - A seeded environment is the set of service databases that one seeding run fills. Today that is
     the seeded database images. The build that produces one `MUST` verify both after seeding, as an
     automated step, and `MUST NOT` publish an environment that fails verification.
1. The Seeder `MUST` do its cryptography only through the seeder-specific SDK APIs that
   [ADR-0040](./0040-seed-test-data-as-the-client.md) rule 4 defines.
1. The Seeder `MUST` keep its library and both entry points:
   - a CLI with presets and scale seeding across every service's database, at least at parity with
     today's scale presets;
   - an API with plays, scenes, queries and cleanup, keeping today's scene contract so test suites
     change only their target.
1. Every seeding component `MUST` be able to remove what a seeding run created, whether a play or a
   preset, and the Seeder `MUST` remove it from every service, including the partial data of a
   failed run.
1. Scale seeding for a service's resources `MUST` exist before that service is performance or load
   tested.

#### Steps

- Publish a seeding component contract page covering:
  - **Identity.** The Seeder's service identity and the scope that limits it to seeding operations.
    This depends on the service identity and context page that ADR-0035's Plan already calls for.
  - **Environment gating.** How a service excludes its components from production builds and images
    (rule 3), and the test that proves a production build has none. The proof of concept's only gate
    was the environment name, and a security review found a component reachable from the network.
  - **Identifiers.** How an identifier that crosses a service boundary is assigned. The API
    standards have the owning service generate IDs and match bulk-created resources by `lid`. So
    either the Seeder seeds in the order the references require and uses the IDs each owner returns,
    or the contract records an exception that lets the Seeder supply IDs. The contract decides, and
    says what "deterministic output" (ADR-0040 rule 5) means when the owner generates IDs.
  - **Failure and cleanup.** How a component reports every failed resource, how it tags what a
    seeding run created (the Seeder API tags it with the play ID today), and how it removes it.
  - **Bulk consumption.** What a bulk process needs from a component beyond what a test run needs,
    such as throughput and batch sizes.
  - **Conformance.** A test every service's seeding components pass in CI.
- Build the Seeder's multi-service run. It holds one preset definition, gives each service's
  components only the resources that service owns plus the references they need, seeds in the order
  the contract sets, and collects failures from every service. Any failure in a service fails the
  run and triggers cleanup.
- Define the verification step for any build that produces a seeded environment. It is an automated
  check, after seeding and before anything is published, that every cross-service reference resolves
  and each service's counts match the preset (rule 4). It records what it reads from each service
  and what it reports, and it comes before the pilot, which needs a runnable form of it.
- Pilot the contract with two services where one holds references to the other's resources. A
  one-service pilot cannot exercise cross-service consistency. The pilot is done when:
  - the verification step passes on a scale preset;
  - the preset's time is measured against the monolith Seeder's time for the same preset, which
    settles the unproven bulk throughput consequence;
  - cleanup leaves no data in either service.
- Prove bulk consumption with the seeded database image build, the one known bulk consumer. Move it
  onto the components, with the images it loads into the Azure Container Registry built from one
  seeding run and published only after the verification step passes (rule 4).
- Port the presets to the components group by group (dev, features, qa, individual, validation and
  scale). A preset is ported when it passes the verification step and its counts and relationships
  match the monolith Seeder's output for the same preset.
- Build the load-testing harness on the ported scale presets. A service is load tested only after
  its scale seeding passes the verification step at the preset's full volume (rule 8).
