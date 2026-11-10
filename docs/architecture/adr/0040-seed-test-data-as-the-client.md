---
adr: "0040"
status: Proposed
date: 2026-11-05
tags: [server, sdk, tests]
---

# 0040 - Seed test data with internal tooling that acts as the client

<AdrTable frontMatter={frontMatter}></AdrTable>

## Notation

This ADR uses [RFC 2119](https://www.rfc-editor.org/info/rfc2119/) keywords (`MUST`, `MUST NOT`,
`SHOULD`, `SHOULD NOT`, `MAY`) deliberately. Anything marked `MUST` or `MUST NOT` is not negotiable
at team level; a team that needs an exception brings the case to the architecture group.

## Context and problem statement

The server's Seeder creates test data. It has two entry points over one library,
[`util/Seeder`](https://github.com/bitwarden/server/tree/main/util/Seeder):
[`util/SeederUtility`](https://github.com/bitwarden/server/tree/main/util/SeederUtility), a CLI with
`preset`, `organization` and `individual` commands; and
[`util/SeederApi`](https://github.com/bitwarden/server/tree/main/util/SeederApi), a web API that
seeds scenes into plays, answers queries, deletes plays older than a day on a 15-minute schedule,
requires basic authentication and refuses to start in Production. The Seeder has no owning team: it
is shared code that any team changes as its tests need. The
[Seeder](../../getting-started/server/seeder.md) page covers how to use the Seeder. This ADR records
why the Seeder exists and what it must keep doing.

The Seeder already works at scale. It has more than 35 presets in six groups: dev, features, qa,
individual, validation and scale. The largest scale presets create 10,000 users and 12,000
collections (`xl-broad-initech`), or 5,040 users, 465 groups, 6,000 collections and 149,800 items
(`xl-migrated-cyberdyne-200k-shared`). Density profiles set group membership, collection fan-out,
permissions and item assignment. Access shapes reproduce a real organization's access paths.
Generation is deterministic, and rows are committed in bulk. A weekly workflow builds seeded
database images on PostgreSQL, MySQL, MariaDB and SQL Server.

Four groups depend on it:

- QA's automation suites, which seed instead of sharing test data per environment.
- Developers, who seed local databases with the CLI, the API or the `seeding-bitwarden-data` skill.
- The SDK's `bitwarden-test` crate, which drives the Seeder API's plays and scenes.
- Performance and database work, which uses the scale presets and the seeded database images.

The Seeder generates keys and encrypts Vault Data itself, as a client would, so that only Protected
Data reaches the database (P01). Its encryption lives in the server repository:
[`util/RustSdk`](https://github.com/bitwarden/server/tree/main/util/RustSdk) is a foreign function
interface (FFI) layer over `bitwarden-crypto` at a pinned `sdk-internal` revision. That layer
supports three axes, which are separate and easily confused:

- **Account encryption:** V1 only. Every symmetric EncString is type 2 (AES-256-CBC-HMAC-SHA256),
  and organization keys are shared to members as RSA type 4. Account encryption V2 (signing keys, a
  signed public key, security state and COSE type 7) has no Seeder path.
- **Item encryption:** user key, where fields are encrypted under the vault key, or cipher key,
  where each item has its own key wrapped by the vault key.
- **Attachment scheme:** v0, with no attachment key; v1, with an attachment key wrapped by the vault
  key; and v2, with an attachment key wrapped by the cipher key.

The Seeder also takes shortcuts product cryptography must not take. `util/RustSdk` draws RSA key
pairs from a pool of 100 pre-generated ones and uses deprecated unsigned key encapsulation. The
Seeder derives keys with PBKDF2 at 5,000 iterations by default, where the product's minimum is
600,000, and a scene can corrupt a user's private key for negative tests.

Three problems follow. First, nothing records why the Seeder exists or what it must keep doing, so a
rewrite can keep the API's contract and lose the CLI, the presets and scale seeding. Second,
cryptography in the server repository goes against the
[crypto guide](../cryptography/crypto-guide.md): "Any new code accessing cryptographic APIs must be
written in the SDK". Third, the Seeder can't create account encryption V2 test data.

## Considered options

- **Shared test data per environment:** provision accounts and organizations in each environment
  once, and have every test share them.
- **Seed through product APIs:** create test data by calling the same APIs the clients call.
- **Internal tooling that acts as the client, with its cryptography in the server repository:** the
  Seeder as it is today.
- **Internal tooling that acts as the client, with its cryptography in the SDK:** the Seeder as it
  is today, calling seeder-specific SDK APIs instead of `util/RustSdk`.

### Shared test data per environment

**Pros**

- No tooling to build or maintain.

**Cons**

- Tests share state, so one test's changes can break another's.
- Each environment's data has to be created, recorded and kept current by hand, and QA has moved
  away from it.
- Gives no volume, so it can't support performance or load testing.

### Seed through product APIs

**Pros**

- Test data passes every product validation rule.

**Cons**

- Product APIs send mail, record events and make billing changes as side effects.
- Can't create states no product path allows: a legacy attachment scheme, low KDF iterations, a
  verified domain without DNS, a member at any status without the invitation flow, or a broken key
  for a negative test.
- Is slow at volume, because every row goes through a product request with its validation and side
  effects.

### Internal tooling that acts as the client, with its cryptography in the server repository

**Pros**

- Exists and works at scale today.
- Reaches states and volumes no product path can, with no side effects.

**Cons**

- Keeps cryptography in the server repository, against the crypto guide.
- Can't produce account encryption V2 test data.
- Keeps a Rust toolchain in the server build.

### Internal tooling that acts as the client, with its cryptography in the SDK

**Pros**

- Keeps everything the status quo provides.
- Shares one cryptography implementation with the clients.
- Makes account encryption V2 test data possible.

**Cons**

- The Seeder depends on SDK releases.
- The SDK must own and secure a seeder-specific API surface.

## Decision outcome

Chosen option: **Internal tooling that acts as the client, with its cryptography in the SDK**,
because only internal tooling can create the states and volumes testing needs, and the crypto guide
requires new cryptography code to be written in the SDK.

### Positive consequences

- The Seeder and the clients share one cryptography implementation.
- Account encryption V2 test data becomes possible.
- The server build no longer needs a Rust toolchain for the Seeder.
- A future rewrite has a record of what the Seeder must keep doing.

### Negative consequences

- The Seeder depends on SDK releases for any cryptography change.
- The SDK takes on a seeder-specific API surface that must be maintained and secured alongside its
  existing cryptography code.
- Until the move lands, account encryption V2 test data can't be seeded.

### Plan

#### Rules

1. The Seeder `MUST` be internal tooling. It `MUST NOT` be shipped in, or reachable from, a
   production deployment, and it `MUST` refuse to run against Production. Internal tooling is
   required because no product path can do the work:
   - create states the product doesn't allow, such as a member at any status without the invitation
     flow, a legacy attachment scheme, low KDF iterations, a verified domain without DNS, or a
     broken key for a negative test;
   - create them at volumes no product path produces in reasonable time;
   - create them without side effects such as mail, events or billing changes;
   - hold the test accounts' keys, so tests can sign in and read what was seeded.
1. The Seeder `MUST` act as the client. It generates keys and encrypts all Vault Data before
   writing, and only Protected Data reaches a store (P01).
1. The Seeder `MUST` keep its library and both entry points: the CLI with presets and scale seeding,
   and the API with plays, scenes, queries and cleanup.
1. The Seeder's cryptography `MUST` move from `util/RustSdk` into the SDK.
   - After the move, the Seeder `MUST` call only seeder-specific SDK APIs built on
     `bitwarden-crypto`.
   - Those APIs `MUST` support attachment schemes v0, v1 and v2, account encryption V1 and V2, and
     both user-key and cipher-key item encryption.
   - The three axes `MUST` stay separate: a new account encryption version `MUST NOT` be modeled as
     an attachment scheme, or the reverse.
   - Test-only shortcuts, such as pre-generated keys and deprecated encapsulation, `MUST` stay in
     the seeder-specific APIs and `MUST NOT` be reachable through the SDK's product APIs.
1. Scale seeding of users, groups, collections and items, with density profiles and deterministic
   output, `MUST` remain supported.

#### Steps

- Move the Seeder's cryptography into the SDK, alongside its existing cryptography code.
- The Seeder adopts the seeder-specific SDK APIs, removes `util/RustSdk`, and adds account
  encryption V2.
