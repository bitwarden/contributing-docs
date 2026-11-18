---
adr: "0048"
status: Proposed
date: 2026-11-18
tags: [server, server-sdk]
---

# 0048 - Compare text exactly in service data stores

<AdrTable frontMatter={frontMatter}></AdrTable>

## Notation

This ADR uses [RFC 2119](https://www.rfc-editor.org/info/rfc2119/) keywords (`MUST`, `MUST NOT`,
`SHOULD`, `SHOULD NOT`, `MAY`) deliberately. Anything marked `MUST` or `MUST NOT` is not negotiable
at team level; a team that needs an exception brings the case to the architecture group.

## Context and problem statement

The monolith's SQL Server database uses a collation that ignores case,
`SQL_Latin1_General_CP1_CI_AS`. Nothing in the code says which rules depend on that. A unique index
on an email address, a lookup by an organization's identifier and a join on a single sign-on
identifier all ignore case because the database does, not because the schema or the code declares
it. The other engines the server supports have different defaults: PostgreSQL and SQLite compare
text exactly, and MySQL and MariaDB ignore case. The same code therefore behaves differently
depending on the engine it runs on.

Under the [service-oriented architecture](./0035-service-oriented-architecture.md), each service
owns its data store, and each store runs on every supported engine. A collation is set when a
database is created and is expensive to change afterwards, because every index on a text column
depends on it. The choice has to be made once, for every service, before the stores hold data.

A proof of concept that moved part of the server into services created its stores with a binary
collation. A review of it showed what goes wrong when the policy is a provisioning detail and not a
stated rule:

- Ciphertext columns were given a collation that ignores case, because the collation was chosen for
  its UTF-8 storage and the comparison rules came along with the name. Base64 text is
  case-significant, so two different values could compare as equal.
- Several values that must be unique whatever their case, an account's email address among them,
  were checked in code ignoring case and then guarded by a unique index that compares exactly. Two
  concurrent writes differing only in case could both succeed, which the monolith's collation
  prevents.
- Rows copied from the monolith kept whatever case the monolith held, while the service compared
  them against values it had lowercased.

Each of these was found by reading the code, not by a test or a start-up check. Without a rule, the
same mistakes will be made again in each new service.

## Considered options

- **Keep the monolith's collation:** every store ignores case by default, as the monolith does.
- **A case-sensitive linguistic collation:** every store regards case, but sorts and compares by a
  language's rules.
- **Leave it to each service:** each team chooses its store's collation.
- **Compare exactly by default, and declare every exception:** every store uses a binary collation,
  and a column that must ignore case says so in its schema.

### Keep the monolith's collation

**Pros**

- No behavior changes for data moved from the monolith.
- Uniqueness that ignores case needs no extra column or index.

**Cons**

- PostgreSQL and SQLite have no equivalent default, so the engines keep behaving differently.
- Hashes, tokens, keys and ciphertext are compared ignoring case, which is wrong for all of them.
- The rules that depend on case-insensitivity stay invisible in the schema and the code.
- What counts as equal depends on the collation's version and language rules, which differ between
  engines.

### A case-sensitive linguistic collation

**Pros**

- Exact with regard to case, and sorts text in dictionary order.

**Cons**

- Comparison still follows language rules that differ between engines and collation versions, such
  as how width, ignorable characters and combining marks are treated.
- Slower to compare and sort than a binary collation.
- Sorting in the database has little value here, since most text a person reads is encrypted and
  sorted by the client.

### Leave it to each service

**Pros**

- Each team fits the collation to its data.

**Cons**

- The same value, such as an email address, would compare differently in different services.
- Every team has to rediscover the problems above.
- Operations would maintain stores that behave differently for no stated reason.

### Compare exactly by default, and declare every exception

**Pros**

- One rule that every supported engine can follow, so a service behaves the same on each.
- Correct for hashes, tokens, keys, identifiers and ciphertext without further thought.
- Every rule that ignores case is written down in the schema, where a reviewer can see it.
- The fastest comparison and the smallest index keys.

**Cons**

- A value that is unique ignoring case needs a declared collation or a normalized copy, and a lookup
  that ignores case needs an index built for it.
- Behavior differs from the monolith for any value the monolith matched only through its collation.
- Sorting in the database is by code point, not dictionary order.

## Decision outcome

Chosen option: **Compare exactly by default, and declare every exception**, because it is the only
option that behaves the same on every supported engine and makes each case-insensitive rule visible
where it is enforced.

The rules:

1. A service's data store `MUST` compare text exactly by default. On SQL Server the database
   collation is `Latin1_General_100_BIN2`; on MySQL and MariaDB every table and text column is
   `utf8mb4_bin`; PostgreSQL and SQLite use their defaults.
2. A service `MUST` refuse to start on a store whose default collation ignores case, and on a store
   where a table or text column ignores case without the schema declaring it. `Bitwarden.Server.Sdk`
   provides both checks.
3. A column that has to ignore case `MUST` declare that in the service's schema, on every engine,
   with a comment giving the reason. Such a column `SHOULD` use the collation the monolith uses on
   that engine when the rule comes from the monolith, so both judge the same values equal.
4. A value that has to be unique whatever its case `MUST` be guarded by a unique index that ignores
   case. A check in code is not enough, because two concurrent writes can both pass it. The index is
   one of:
   - a unique index on a column declared under rule 3;
   - a unique index on the value itself, when the service normalizes the value on every write;
   - a unique index on a normalized copy of the value, kept beside the original.
5. A lookup that ignores case `SHOULD` be served by an index on the normalized value, so it seeks
   and does not scan.
6. A column holding ciphertext, a hash, a token, a key or any other encoded binary value `MUST`
   compare exactly. Where such a column is stored as UTF-8 on SQL Server, it `MUST` use
   `Latin1_General_100_BIN2_UTF8`, not a UTF-8 collation that ignores case.
7. Data copied into a service's store from the monolith `MUST` be normalized as the service
   normalizes it on write. The copy `MUST` report, and not silently merge or drop, rows that collide
   once normalized.

### Positive consequences

- A service gives the same answers on SQL Server, PostgreSQL, MySQL, MariaDB and SQLite.
- Encoded values can't be merged by a collation.
- A reviewer can find every case-insensitive rule by searching the schema for a declared collation
  or a normalized column.
- A store that was created wrongly, or drifted through a migration, stops the service at start-up
  and not in production.

### Negative consequences

- Teams have to decide, for each text value, whether case matters, where the monolith decided for
  them.
- Values the monolith matched through its collation alone behave differently until they are declared
  or normalized. Identifiers supplied by other systems are the main risk; see the open question
  below.
- Normalizing in code and normalizing in the engine can disagree outside ASCII. A normalized copy
  written by the service avoids relying on each engine's `LOWER()`.
- On SQL Server installations other than Azure SQL Database, a database with a binary collation also
  compares object names exactly, so `dbo.ciphers` does not find `dbo.Ciphers`.
- The server's own collation usually differs from the store's. Temporary tables take the server's
  collation, so operational scripts that compare their text columns with the store's need
  `COLLATE DATABASE_DEFAULT`, and queries across databases need an explicit collation.

### Plan

- Correct what the proof of concept's review found: move ciphertext columns to
  `Latin1_General_100_BIN2_UTF8`, make the index on the lowercased account address unique, guard the
  remaining names that are unique ignoring case, and lowercase addresses the migration copies.
- Extend the start-up checks in `Bitwarden.Server.Sdk` so a column that ignores case and holds an
  encoded value is refused (rule 6).
- Document the rules in the server database guide, with the pattern for each kind of index in
  rule 4.
- Database operations provisions cloud stores with the collation in rule 1 and adds a check for it
  to its own tooling.

**Open question.** An identifier that an external identity provider supplies for single sign-on
compares exactly under rule 1, where the monolith ignores its case. An identity provider that
changes the case of an identifier would then stop matching an existing account. Whether such
identifiers keep exact comparison, are normalized, or are declared case-insensitive under rule 3 is
undecided, and this ADR `SHOULD NOT` be accepted until it is settled.
