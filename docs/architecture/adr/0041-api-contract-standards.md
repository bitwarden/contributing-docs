---
adr: "0041"
status: Proposed
date: 2026-10-05
tags: [server, server-sdk]
---

# 0041 - API standards for contracts and their evolution

<AdrTable frontMatter={frontMatter}></AdrTable>

{/* cspell:ignore kebab */}

## Notation

This ADR uses [RFC 2119](https://www.rfc-editor.org/info/rfc2119/) keywords (`MUST`, `MUST NOT`,
`SHOULD`, `SHOULD NOT`, `MAY`) deliberately.

## Context and problem statement

[ADR-0036](./0036-service-to-service-api-standards.md) requires service-to-service APIs to conform
to a documented set of standards, and ADR-0039 builds those standards on IETF RFCs. This ADR sets
how an API's contract is described and addressed, and how it changes over time without breaking its
callers: OpenAPI descriptions, paths, versioning, unrecognized input, and deprecation.

Independently deployed services are rolled out, and sometimes rolled back, on their own schedules,
so a contract has to tolerate callers and services at different versions.

## Considered options

**Versioning**

- **A major version in the path** (`/api/v1/...`), with breaking changes avoided.
- **No versioning:** additive changes only, as in Bitwarden's public API today.
- **Version in a header or in the media type.**
- **A dated `api-version` query parameter,** as in the Azure guidelines.

**Request scope**

- **The organization and user travel as context,** never in the path.
- **The organization in the path,** as in `/organizations/{id}/users`.

**Unrecognized input**

- **Ignore unrecognized fields, parameters, and headers,** and reject only parameters that shape the
  result.
- **Reject anything unrecognized with `400`,** as JSON:API requires.

**Deprecation**

- **Mark it in OpenAPI and announce it in response headers**
  ([RFC 9745](https://www.rfc-editor.org/info/rfc9745/) `Deprecation`,
  [RFC 8594](https://www.rfc-editor.org/info/rfc8594/) `Sunset`, and
  [RFC 8288](https://www.rfc-editor.org/info/rfc8288/) `Link`).
- **Announce it in documentation and changelogs only.**

## Decision outcome

Chosen options: **a major version in the path**, **scope as context**, **ignoring unrecognized
input**, and **deprecation in OpenAPI and response headers**.

### OpenAPI

APIs `MUST` be described in OpenAPI.

- Descriptions `MUST` be written for the consumer and free of implementation details.
- APIs `SHOULD` provide realistic request and response examples, and `SHOULD` document which
  attributes can be filtered and sorted.
- Fields that are always present `MUST` be marked `required`, fields that may be null `MUST` be
  marked `nullable`, and fields set by the server `MUST` be marked `readOnly`. An API `MUST` ignore
  a read-only field in a request.
- Every operation `MUST` have an explicit, stable `operationId`. Version 1 operations `SHOULD NOT`
  include the version, and later versions `MUST` (for example `getGroup`, then `getGroupV2`), so
  that generated clients do not collide on one method name or depend on names a generator invents.

### Paths

- Paths `MUST` be lowercase kebab-case.
- The first element `MUST` be a namespace, `api` by default. The next `MUST` be the version,
  starting at `v1`. The next `MUST` name the resource, and `SHOULD` be its plural (for example
  `users`). Where the API targets one resource, the next `SHOULD` be its ID.
- Paths `SHOULD` be traversable: if `/api/v1/users/123/addresses/456` names an address, its parent
  paths name all of that user's addresses, the user, and all users. This shows how paths fit
  together. It does not require every parent path to exist.

```text
/api/v1/users
/api/v1/users/123
/api/v1/users/123/addresses
```

Every request acts on a **subject** and runs inside a **scope**:

- The subject is what the request acts on, and it `MUST` be named in the path.
- The scope is what the request runs inside, such as the current organization and user. It
  `MUST NOT` be named in the path, and travels as context instead. Callers `SHOULD` send the current
  organization and user on every request where each exists.
- `current` `SHOULD` be used where the subject is whatever the scope names, as in
  `/api/v1/users/current`.

An identifier in a path is something a caller can try other values of, and the API has to prove on
every request that the caller may use it. A scope taken from context is established once, where the
caller authenticates, and one path then serves a resource that can belong to more than one kind of
owner. Which parts of the scope an operation requires is declared by the operation, and is the
subject of the forthcoming authentication and authorization standard.

A caller working across several organizations can make one call per organization, use a filter such
as `filter[organization]=123,456`, or use an advanced query (see ADR-0043). None of these puts the
organization in the path. An operation can also be declared so that less scope means more, for
example returning users across every organization the caller belongs to when no organization is in
context.

### Breaking changes and versioning

APIs `SHOULD NOT` make breaking changes. A breaking change is one that causes a request that is
valid today to be rejected tomorrow, or a response a caller can process today to become
unprocessable. In practice:

- adding a required field, or making an optional field required,
- changing a field's type,
- adding constraints to a field, or
- removing a field from a response.

The keyword is `SHOULD NOT` rather than `MUST NOT` because these are service-to-service APIs and we
own every caller:

- A team `MAY` make a breaking change in place when it can account for every caller, either because
  the change is coordinated with them or because the rejection surfaces where the caller or user can
  act on it.
- Bugs `SHOULD` be fixed in place, even when the fix is technically breaking.
- Otherwise, a breaking change `MUST` be made in a new version of the API, and the old version
  deprecated.

Adding a value to a constrained field is not breaking by this definition, but a generated client
that maps the field to a closed enumeration will fail on a value it has never seen. Consider whether
callers tolerate unknown values before adding one.

Versioning costs a path segment while an API stays at `v1`. In exchange, a contract that needs to
change shape has somewhere to go, instead of making every new field optional so that nothing ever
breaks. The version is in the path because it is then visible in logs, traces, routing rules, and
`curl` commands, needs no content negotiation, and lets two versions run side by side behind one
host.

### Unrecognized fields, query parameters, and headers

A service rolled back to fix a defect can receive fields from callers that have already upgraded. So
that callers do not have to be rolled back too, APIs `MUST` ignore unrecognized fields, query
parameters, and headers.

The exception is a parameter that shapes the result, because ignoring it returns something other
than what was asked for. APIs `MUST` reject with `422`:

- a `filter[{name}]`, `sort`, or `fields` parameter naming a field the API does not support,
- paging parameters when the API does not page, or for a paging style it does not implement, and
- on a bulk operation, an `atomic` value it does not support.

### Deprecation

- A deprecated API `MUST` be marked `deprecated: true` in OpenAPI, and its description `MUST` name
  the replacement.
- Every response from a deprecated API `MUST` include the `Deprecation` and `Sunset` headers, and
  `SHOULD` include a `Link` header naming the replacement.
- `Deprecation` is the time the API was deprecated, as `@` followed by seconds since the Unix epoch.
  `Sunset` is the date it stops working. It `MUST` be a real date, and `MUST NOT` pass without
  either removal or a published extension.

```http
Deprecation: @1688169599
Sunset: Sun, 30 Jun 2024 23:59:59 GMT
Link: <https://api.example.com/api/v2/users>; rel="successor-version"
```

### Positive consequences

- Contracts are described precisely enough to generate clients that stay stable across versions.
- A rolled-back service keeps working with callers that have already moved forward.
- An unavoidable breaking change has a defined path: a new version, with the old one deprecated on a
  stated schedule.
- Paths cannot be used to reach another organization's resources by changing an identifier.

### Negative consequences

- Service-to-service APIs carry a version where Bitwarden's public API does not.
- Ignoring unrecognized fields means a misspelled optional field is silently dropped.
- Teams have to judge when a breaking change can be made in place, and that judgement can be wrong.
