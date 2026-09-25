---
sidebar_position: 3
---

# Service-to-service API standards

{/* cspell:ignore reate reates eletes elete pdate pdates fieldsets */}

**Audience:** Bitwarden engineers and AI agents building or consuming a service-to-service API.

**Scope.** Service-to-service APIs, whose callers are other Bitwarden services. Bitwarden's existing
public API is out of scope and is not changing, as is the internet-reachable surface our own clients
call — the part the server repository refers to as "internal".

This page is the living standard, adopted in
[ADR-0036](../adr/0036-service-to-service-api-standards.md). Its rules evolve by pull request
without superseding that decision.

[RFC 2119](https://www.rfc-editor.org/info/rfc2119/) keywords (`MUST`, `MUST NOT`, `SHOULD`,
`SHOULD NOT`, `MAY`) are used deliberately. A `MUST` or `MUST NOT` is not negotiable at team level;
a team that needs an exception brings the case to the architecture group.

## General

In general, RESTful APIs are resource-oriented and do one of 4 things:

- **C**reate a resource.
- **R**ead a resource.
- **U**pdate a resource.
- **D**elete a resource.

This is the familiar CRUD paradigm and, while there will always be exceptions, developers `SHOULD`
strive to think in these terms for every API created. Both for simplicity and consistency.

There is, however, a 5th type of API that doesn't cleanly fit the CRUD paradigm:

- **Act** upon a resource.

Each of these, except read, also has a [bulk](#bulk-operations) form that applies it to many
resources at once. Standards for each type of API are documented below.

### JSON:API

Service-to-service APIs are based on top of [JSON:API](https://jsonapi.org/) unless otherwise noted
in this document. Where our standards are silent, JSON:API standards are assumed.

### Well-defined APIs

A well-defined API spells out exactly how it should be called and what the caller can expect in
return - for both the happy path and the not-so-happy path. Developers `SHOULD` strive to think in
terms of resources and be on guard against **API proliferation** that can result from over-tailoring
APIs to the unique needs of this caller or that.

In general, it is better to have one API that can be called two different ways (e.g. query
parameters) than two APIs that can only be called one way.

## Authentication and authorization

How a caller proves its identity, how a service authorizes an operation, and how the current
organization travels with a request are the subject of a forthcoming standard.

## OpenAPI

APIs `MUST` be documented in [OpenAPI](https://www.openapis.org/) format.

- APIs `MUST` provide a description written with the API consumer as the audience in mind, free of
  implementation details.
- APIs `SHOULD` provide realistic example JSON for both the request and response.
- APIs `SHOULD` document which attributes are filterable and which are sortable.
- Fields that must always be present `MUST` be marked as `required`.
- Fields whose value may be null `MUST` be marked as `nullable`.
- Fields whose value is set by the server `MUST` be marked as `readOnly`. If a request includes a
  read-only field, the API `MUST` ignore it.

### Operation identifiers

Every operation `MUST` carry an explicit, stable `operationId`. "v1" APIs `SHOULD NOT` include the
version number but "v2" APIs `MUST` in order to generate stable clients (e.g. `getGroup`,
`getGroupV2`). These IDs are necessary for stable, generated clients:

1. Without the version, `/api/v1/groups/{id}` and `/api/v2/groups/{id}` collide into one method
   name.
1. Without an _explicit_ identifier, generators invent one from the route which can be brittle.

## API paths

API paths `MUST` use **lowercase "kebab-case"** and conform as follows:

1. The first element of the API path `MUST` be a namespace. By default, the namespace `SHOULD` be
   `api`.
1. The second element of the API path `MUST` be the version number starting with `v1`.
1. The third element of the API path `MUST` specify the resource or resources it targets. For
   resource-oriented APIs, this element `SHOULD` be the "resource plural" (e.g. `users`).
1. For resource-oriented APIs, the fourth element of the API path `SHOULD` be the ID of the resource
   it targets.

> **Why versioning in the path?** It is visible in logs, traces, routing rules and curl commands; it
> needs no content negotiation to read; and it lets two versions coexist behind one host. Header and
> media-type versioning are both defensible but harder to operate.

**Examples**

```
/api/v1/users
/api/v1/users/123
/api/v1/users/123/addresses
```

Paths `SHOULD` be "hackable". If `GET /api/v1/users/123/addresses/456` returns the details about
address 456 of user 123, then every parent path `SHOULD` resolve:

- `GET /api/v1/users/123/addresses` should return all addresses of user 123.
- `GET /api/v1/users/123` should return details about user 123.
- `GET /api/v1/users` should return all users.

Organization IDs `SHOULD NOT` appear in the path because "the current organization" is part of the
[context](#authentication-and-authorization) of almost every request and, thus, need not be
duplicated in the URL path.

## Breaking changes and versioning

APIs `SHOULD NOT` make **breaking changes**. A breaking change is any change that causes a request
that is valid today to be rejected tomorrow, or a response that a caller can process today to become
unprocessable. In practice, that means:

1. Adding a new, required field.
1. Making an optional field required.
1. Changing the datatype of a field.
1. Adding additional constraints to a field.
1. Removing a field from a response.

The verb is `SHOULD NOT` rather than `MUST NOT` because these are service-to-service APIs and we own
every caller. A team `MAY` make a breaking change in place when it can account for every caller —
either because the change has been coordinated with them, or because the rejection surfaces
somewhere the caller or the user can act on it.

Bugs, however, `SHOULD` be fixed "in place", without creating new versions of the API, even if the
changes would technically be considered breaking changes.

Otherwise, if changes need to be made that _would_ be breaking changes, a new version of the API
`MUST` be created and the old one [deprecated](#deprecation).

> **Adding a value to a constrained field deserves a second look.** It is additive, so it is not a
> breaking change by the definition above, and a caller that treats the field as an open string is
> unaffected. But a generated client that deserializes the field into a closed enumeration will fail
> on a value it has never seen — and it will fail at the client, on a change that looked safe from
> the service. Consider whether the callers of that field are tolerant of unknown values before
> adding one.

## Unrecognized fields, query parameters, and headers

Sometimes a new, optional field, query parameter, or header is added to an API. Consumers upgrade to
new clients and start passing the new fields/parameters/headers and everything is great until a
security issue is discovered. The service is rolled back to the previous version but consumers are
still using newer versions of the client.

To keep from having to _also_ revert all of the consumers, APIs `MUST` ignore unrecognized fields,
parameters, and headers.

The exception is a parameter that shapes the result. Ignoring an unrecognized field means doing less
than the caller asked; ignoring one of these means returning something other than what was asked
for. APIs `MUST` reject the request with `422` when given:

- a `filter[{name}]`, `sort`, or `fields` parameter naming a field they do not support, or
- paging parameters when the API does not support paging, or for a paging style it does not
  implement, or
- on a [bulk operation](#all-or-nothing-and-best-effort), an `atomic` value it does not support.

## JSON

- Dates `MUST` be formatted in [ISO 8601](https://en.wikipedia.org/wiki/ISO_8601) format (e.g.
  `2026-01-01T00:00:00Z`) and `MUST` include a time zone indicator and `SHOULD` standardize on UTC.
- Field values that are constrained to a fixed set of values `SHOULD` enumerate the valid values in
  all caps (e.g. `RED`, `GREEN`, `BLUE`) both in the OpenAPI spec and in example JSON to help
  distinguish these fields from free-text string fields. At runtime, however, APIs `MUST` ignore
  case when validating these values.
- APIs `SHOULD` strip leading and trailing whitespace from all strings before processing them.
- APIs `MUST` treat an empty string the same as if the field is not present.
- APIs `MUST` treat a field that isn't present the same as `null`, except in
  [partial updates](#partial-updates).
- APIs `SHOULD NOT` include `null` fields in responses.

## Naming conventions

- Field names `MUST` be in camel case (e.g. `firstName`, `lastName`).
- Fields holding a date or date/time `SHOULD` end in `At` (e.g. `createdAt`, `expiresAt`).
- Boolean fields `MUST NOT` be prefixed with `is` (e.g. `active`, not `isActive`).
- Fields whose value is the identifier of another resource `SHOULD NOT` be suffixed with `Id`. A
  string-valued `assignedTo` is self-evidently the identifier of the user it is assigned to;
  `assignedToId` adds nothing. This standard does not apply to fields that reference external
  identifiers.

## Content negotiation

- Services `MUST` respect the `Accept` media type requested by the caller. If the caller asks for
  XML and the server cannot return XML, the service `MUST` return `406 Not Acceptable`.
- Because our APIs are largely based on JSON:API, services `MUST` accept a request whose
  `Content-Type` is `application/vnd.api+json`, and `MUST` honor an `Accept` of
  `application/vnd.api+json`, even though the API itself only advertises `application/json`.
- Services `MUST` return `415 Unsupported Media Type` if the server can't process the specified
  `Content-Type`.

## Standard responses

APIs `SHOULD NOT` document standard responses because these responses apply to every API and
documenting them over and over again just creates noise. The following responses are possible for
every API:

| Response | Description                                                                                             |
| -------- | ------------------------------------------------------------------------------------------------------- |
| `400`    | A malformed request (i.e. invalid JSON).                                                                |
| `401`    | The caller isn't [recognized](#authentication-and-authorization) (i.e. not authenticated).              |
| `403`    | The caller isn't [authorized](#authentication-and-authorization) to invoke the API (i.e. forbidden).    |
| `404`    | The resource specified via the URL path does not exist (or the caller isn't allowed to know it exists). |
| `405`    | The HTTP method is not allowed.                                                                         |
| `406`    | The API doesn't return the specified media type.                                                        |
| `409`    | The attempted update conflicts with some other update (i.e. was changed since the caller last read it). |
| `415`    | The API doesn't accept the specified media type.                                                        |
| `422`    | An error the client can fix.                                                                            |
| `429`    | The caller has made too many requests.                                                                  |
| `500`    | An unexpected error the client cannot fix.                                                              |
| `501`    | The API has just been stubbed out and has not been implemented, yet.                                    |
| `503`    | The request cannot be completed because a dependency is unavailable or timed out.                       |

### 400 vs. 422

- Return `400` for requests that are malformed and cannot even be parsed (e.g. invalid JSON).
- Return `422` for invalid requests. See [Request validation](#request-validation).

### 403 vs. 404

- Return `403` for attempts to read, write, or act upon resources the user is allowed to know exist.
- Return `404` for attempts to read, write, or act upon resources the user should _not_ know exist.

### 404 vs. 422

- If the resource specified by the URL is **not found**, or the caller should not know it exists,
  APIs `MUST` return `404`.
- If the resource specified by the URL is **found**, but a resource referenced within the payload
  does not exist (or the caller should not know it exists), APIs `MUST` return `422`.

### 500 vs. 503

- Return `500` for unexpected errors that occur within the service that the client cannot fix. By
  definition, a `500` is a bug.
- Return `503` if some dependency of the service is down or unreachable or times out.

## Resource fields

Every resource `MUST` include the following fields:

| Field        | Description                                                                      | Type     |
| ------------ | -------------------------------------------------------------------------------- | -------- |
| `attributes` | Details about the resource.                                                      | `object` |
| `id`         | The unique ID of the resource. Even if the ID is numeric, it `MUST` be a string. | `string` |
| `type`       | The _singular_ name of the resource (e.g. `user`).                               | `string` |

The only exception is when a resource is being created via `POST`, or via a
[bulk create](#bulk-creates), against an API that will generate the ID. In this case, the `id` field
`MUST` be omitted.

## Standard fields

When relevant, resources `MUST` use the following field names:

| Field       | Description                                                                                    | Type     |
| ----------- | ---------------------------------------------------------------------------------------------- | -------- |
| `createdAt` | The date/time the resource was created, in ISO 8601 format.                                    | `string` |
| `createdBy` | The ID of the user that created the resource.                                                  | `string` |
| `deletedAt` | The date/time the resource was deleted, in ISO 8601 format. See [Soft deletes](#soft-deletes). | `string` |
| `deletedBy` | The ID of the user that deleted the resource.                                                  | `string` |
| `updatedAt` | The date/time the resource was last updated, in ISO 8601 format.                               | `string` |
| `updatedBy` | The ID of the user that last updated the resource.                                             | `string` |
| `version`   | The current version of the resource. See [Optimistic concurrency](#optimistic-concurrency).    | `string` |

## Verbs

APIs `MUST` use the standard verb semantics:

| Verb     | Meaning                                                                                                           |
| -------- | ----------------------------------------------------------------------------------------------------------------- |
| `DELETE` | Delete a resource.                                                                                                |
| `GET`    | Fetch a resource. Safe, idempotent, and never changes state.                                                      |
| `PATCH`  | Partially update a resource.                                                                                      |
| `POST`   | Create a resource.                                                                                                |
| `PUT`    | Update a resource with "completely replace" semantics. APIs that support create-or-update `MUST` do so via `PUT`. |

The only exceptions are [actions](#acting-upon-resources), [advanced queries](#advanced-queries),
and [bulk operations](#bulk-operations), which use `POST` whether or not they create a resource.

## Creating resources

- HTTP verb `MUST` be `POST`.
- API path `SHOULD` be like `/api/v1/{resource plural}`.

**Example**

```
POST /api/v1/users
Content-Type: application/json
```

```json
{
  "data": {
    "attributes": {
      "firstName": "Bob",
      "lastName": "Smith"
    },
    "type": "user"
  }
}
```

**Success responses**

Upon success, APIs `SHOULD` return `201` but `MAY` return `202` or `204`.

| Status           | Description                          | Response                                                    |
| ---------------- | ------------------------------------ | ----------------------------------------------------------- |
| `201 Created`    | Resource was created.                | The latest representation of the resource.                  |
| `202 Accepted`   | Resource is scheduled to be created. | The [job](#jobs) that was scheduled to create the resource. |
| `204 No Content` | Resource was created.                | Nothing.                                                    |

## Read many

- HTTP verb `MUST` be `GET`.
- API path `SHOULD` be like `/api/v1/{resource plural}`.

**Example**

```
GET /api/v1/users
Accept: application/json
```

```json
{
  "data": [
    {
      "attributes": {
        "firstName": "Bob",
        "lastName": "Smith"
      },
      "id": "62bed180-1f78-45d4-8a56-c996936a2947",
      "type": "user"
    },
    {
      "attributes": {
        "firstName": "Alice",
        "lastName": "Jones"
      },
      "id": "cacba8c1-29fa-4018-8950-acd400ec76b7",
      "type": "user"
    }
  ]
}
```

**Success responses**

Upon success, APIs `MUST` return `200`.

| Status   | Description             | Response                 |
| -------- | ----------------------- | ------------------------ |
| `200 OK` | Request was successful. | The resources requested. |

**See also:**

- [Advanced queries](#advanced-queries)
- [Filtering](#filtering)
- [Paging](#paging)
- [Sorting](#sorting)
- [Sparse fieldsets](#sparse-fieldsets)

## Read one

- HTTP verb `MUST` be `GET`.
- API path `SHOULD` be like `/api/v1/{resource plural}/{id}`.

**Example**

```
GET /api/v1/users/62bed180-1f78-45d4-8a56-c996936a2947
Accept: application/json
```

```json
{
  "data": {
    "attributes": {
      "firstName": "Bob",
      "lastName": "Smith"
    },
    "id": "62bed180-1f78-45d4-8a56-c996936a2947",
    "type": "user"
  }
}
```

**Success responses**

Upon success, APIs `MUST` return `200`.

| Status   | Description             | Response                |
| -------- | ----------------------- | ----------------------- |
| `200 OK` | Request was successful. | The resource requested. |

## Updating resources

- HTTP verb `MUST` be `PUT`.
- API path `SHOULD` be like `/api/v1/{resource plural}/{id}`.

**Example**

```
PUT /api/v1/users/62bed180-1f78-45d4-8a56-c996936a2947
Accept: application/json
Content-Type: application/json
```

```json
{
  "data": {
    "attributes": {
      "firstName": "Bob",
      "lastName": "Smith"
    },
    "id": "62bed180-1f78-45d4-8a56-c996936a2947",
    "type": "user"
  }
}
```

**Success responses**

Upon success, APIs `SHOULD` return `200` — or `201` if the request created the resource — but `MAY`
return `202` or `204`.

| Status           | Description                              | Response                                                    |
| ---------------- | ---------------------------------------- | ----------------------------------------------------------- |
| `200 OK`         | The resource was updated.                | The latest representation of the resource.                  |
| `201 Created`    | The resource was created.                | The latest representation of the resource.                  |
| `202 Accepted`   | The resource is scheduled to be updated. | The [job](#jobs) that was scheduled to update the resource. |
| `204 No Content` | The resource was updated.                | Nothing.                                                    |

See also: [Partial updates](#partial-updates)

## Partial updates

Services `SHOULD NOT` support partial updates — see [the FAQ](#frequently-asked-questions) for why.
A service that _does_ support them `MUST` use `PATCH` and `MUST` ignore any field that isn't
specified. In a partial update, an absent field means "do not change" and an explicit `null` clears
the value.

**Example**

```
PATCH /api/v1/users/62bed180-1f78-45d4-8a56-c996936a2947
Accept: application/json
Content-Type: application/json
```

```json
{
  "data": {
    "attributes": {
      "firstName": "Bobby"
    },
    "id": "62bed180-1f78-45d4-8a56-c996936a2947",
    "type": "user"
  }
}
```

**Success responses**

Upon success, APIs `SHOULD` return `200` but `MAY` return `202` or `204`.

| Status           | Description                              | Response                                                    |
| ---------------- | ---------------------------------------- | ----------------------------------------------------------- |
| `200 OK`         | The resource was updated.                | The latest representation of the resource.                  |
| `202 Accepted`   | The resource is scheduled to be updated. | The [job](#jobs) that was scheduled to update the resource. |
| `204 No Content` | The resource was updated.                | Nothing.                                                    |

## Optimistic concurrency

- APIs that update resources `SHOULD` implement
  [optimistic concurrency](https://en.wikipedia.org/wiki/Optimistic_concurrency_control) to detect
  concurrent modifications. Those that do `MUST` do so using a `version` field marked `required` and
  not `readOnly`.
- The `version` field `SHOULD` be a simple integer that is incremented after every successful update
  but, regardless of what value is used, the field `MUST` be formatted as a string.
- If the value provided does not match the stored version, the API `MUST` respond `409 Conflict`.
- Upon successfully updating the resource, the API `MUST` update the version identifier.

## Deleting resources

- HTTP verb `MUST` be `DELETE`.
- API path `SHOULD` be like `/api/v1/{resource plural}/{id}`.

**Example**

```
DELETE /api/v1/users/62bed180-1f78-45d4-8a56-c996936a2947
```

**Success responses**

Upon success, APIs `SHOULD` return `204` but `MAY` return `202`.

| Status           | Description                              | Response                                                    |
| ---------------- | ---------------------------------------- | ----------------------------------------------------------- |
| `202 Accepted`   | The resource is scheduled to be deleted. | The [job](#jobs) that was scheduled to delete the resource. |
| `204 No Content` | The resource was deleted.                | Nothing.                                                    |

### Soft deletes

Services `MAY` support "soft deletes" for any number of reasons. Services that do, `SHOULD` follow
the following guidelines:

- Delete APIs perform a soft delete by default and read-many APIs exclude soft-deletes by default.
- Read-one APIs `SHOULD` return `404` for a soft-deleted resource unless the caller passes
  `includeDeleted=true`.
- If callers can request that a delete be "hard", callers pass `permanent=true` query parameter.
- If callers can request that soft-deletes be included in responses, callers pass
  `includeDeleted=true` query parameter.
- Soft-deleted resources `SHOULD` carry a `deletedAt` field.

**Examples**

```
DELETE /api/v1/users/62bed180-1f78-45d4-8a56-c996936a2947?permanent=true
GET /api/v1/users?includeDeleted=true
```

## Acting upon resources

APIs that don't fit cleanly into the CRUD paradigm can typically be modeled as **actions**.

- HTTP verb `MUST` be `POST`.
- API path `SHOULD` be like `/api/v1/{resource plural}/{id}/actions/{action}`.

```
POST /api/v1/users/62bed180-1f78-45d4-8a56-c996936a2947/actions/send-email
Accept: application/json
Content-Type: application/json
```

```json
{
  "subject": "Hello",
  "body": "World!"
}
```

> Unlike the CRUD APIs, _actions_ impose no restrictions on the shape of the JSON posted.

**Success responses**

Upon success, APIs `SHOULD` return `204` but `MAY` return `200` or `202`.

| Status           | Description                | Response                                                   |
| ---------------- | -------------------------- | ---------------------------------------------------------- |
| `200 OK`         | The action was successful. | The latest representation of the resource.                 |
| `202 Accepted`   | The action is scheduled.   | The [job](#jobs) that was scheduled to execute the action. |
| `204 No Content` | The action was successful. | Nothing.                                                   |

## Filtering

- Read-many APIs that allow callers to specify search criteria `MUST` do so via one or more
  `filter[{name}]` query parameters where the `name` `SHOULD` be the same as one of the resource
  attributes.
- APIs `MAY` support wildcard matching. Those that do `MUST` support `*` for "starts with", "ends
  with", and "contains".
- APIs that support filtering by an attribute of an attribute `MAY` use dot-notation (e.g.
  `address.city`).

### Multi-value parameters

APIs that support specifying multiple values for a query parameter `MUST` do so via a
comma-delimited list. This allows APIs that started with single-value query parameters to evolve to
supporting multiple-values without changing the external-facing contract. When multiple values are
provided, "or" query semantics `MUST` be applied.

On a parameter that accepts multiple values or a [range](#ranges), a comma that is part of a value
`MUST` be escaped with a backslash — `filter[displayName]=Smith\, Jr` is the single value
`Smith, Jr`. An asterisk `MUST` likewise be escaped wherever the API supports wildcard matching.
Wherever either escape applies, a backslash that is part of a value `MUST` also be escaped as `\\`.
A parameter that takes a single value is never split, so a comma in its value needs no escaping.

> **Take care when a single-value parameter gains multi-value support.** A caller sending an
> unescaped comma will suddenly be sending two values. That is usually safe, because the evolution
> typically happens on constrained fields whose values cannot contain commas — but confirm it before
> making the change.

### Ranges

Query parameters that allow the caller to specify a range of values `MUST` do so using two values,
separated by commas, and using `[` and `]` to represent **inclusive** begin and end, and `(` and `)`
to represent **exclusive** begin and end. An asterisk `*` `MAY` be used to represent no limit.

Ranges are also how "less than", "greater than", "less than or equal to", and "greater than or equal
to" are implemented.

### Examples

| Example                                                         | Description                                     |
| --------------------------------------------------------------- | ----------------------------------------------- |
| `filter[lastName]=Smith`                                        | Users whose last name is 'Smith'.               |
| `filter[lastName]=S*`                                           | Users whose last name begins with 'S'.          |
| `filter[lastName]=*th`                                          | Users whose last name ends with 'th'.           |
| `filter[lastName]=*mi*`                                         | Users whose last name contains 'mi'.            |
| `filter[lastName]=Smith,Jones`                                  | Users whose last name is 'Smith' or 'Jones'.    |
| `filter[failedLoginCount]=[3,*)`                                | Users who have 3 or more failed login attempts. |
| `filter[birthDate]=(*,2000-01-01T00:00:00Z)`                    | Users born before the year 2000.                |
| `filter[birthDate]=[2000-01-01T00:00:00Z,2001-01-01T00:00:00Z)` | Users born in the year 2000.                    |

See also [Advanced Queries](#advanced-queries).

## Paging

APIs `SHOULD` support paging and those that do `MUST` support either **offset/limit** style paging
or **cursor** style paging.

### Offset/limit style paging

APIs that implement offset/limit style paging do so via the following query parameters:

| Parameter      | Description                           |
| -------------- | ------------------------------------- |
| `page[number]` | The page number to return, one-based. |
| `page[size]`   | The number of resources to return.    |

Paging metadata `MUST` be populated within the `meta` field of responses as follows:

| Field        | Description                                         |
| ------------ | --------------------------------------------------- |
| `pageCount`  | The total number of pages.                          |
| `pageNumber` | The current page number.                            |
| `pageSize`   | The current page size.                              |
| `totalCount` | The total number of resources matching the request. |

**Example**

```
GET /api/v1/users?page[number]=1&page[size]=2
Accept: application/json
```

```json
{
  "data": [
    {
      "attributes": {
        "firstName": "Bob",
        "lastName": "Smith"
      },
      "id": "62bed180-1f78-45d4-8a56-c996936a2947",
      "type": "user"
    },
    {
      "attributes": {
        "firstName": "Alice",
        "lastName": "Jones"
      },
      "id": "cacba8c1-29fa-4018-8950-acd400ec76b7",
      "type": "user"
    }
  ],
  "meta": {
    "pageCount": 5,
    "pageNumber": 1,
    "pageSize": 2,
    "totalCount": 9
  }
}
```

### Cursor-style paging

APIs that implement cursor-style paging do so via the following query parameters:

| Parameter     | Description                                                        |
| ------------- | ------------------------------------------------------------------ |
| `page[size]`  | The number of resources to return.                                 |
| `page[after]` | An opaque cursor. Returns the resources that follow that position. |

A cursor `MUST` be treated as opaque. Callers `MUST NOT` construct, parse, or modify one, and a
service `MAY` change its encoding at any time without a new API version.

Paging metadata `MUST` be populated within the `meta` field of responses as follows:

| Field      | Description                                                    |
| ---------- | -------------------------------------------------------------- |
| `pageSize` | The current page size.                                         |
| `hasMore`  | Whether more resources follow this page.                       |
| `cursor`   | The cursor to pass as `page[after]` to retrieve the next page. |

**Example**

```
GET /api/v1/users?page[size]=2&page[after]=dXNlcnM6NjJiZWQxODA
Accept: application/json
```

```json
{
  "data": [
    {
      "attributes": {
        "firstName": "Bob",
        "lastName": "Smith"
      },
      "id": "62bed180-1f78-45d4-8a56-c996936a2947",
      "type": "user"
    },
    {
      "attributes": {
        "firstName": "Alice",
        "lastName": "Jones"
      },
      "id": "cacba8c1-29fa-4018-8950-acd400ec76b7",
      "type": "user"
    }
  ],
  "meta": {
    "cursor": "dXNlcnM6Y2FjYmE4YzEtMjlmYQ",
    "hasMore": true,
    "pageSize": 2
  }
}
```

The final page `MUST` return `hasMore` as `false` and `MUST` omit `cursor`.

## Sorting

APIs that support sorting `MUST` do so using a single query parameter named `sort` whose value is a
comma-delimited list of field names to sort by. Any field preceded by a hyphen `MUST` be interpreted
as descending.

**Examples**

| Example                   | Description                                          |
| ------------------------- | ---------------------------------------------------- |
| `sort=lastName`           | Sort by the user's last name ascending.              |
| `sort=-lastName`          | Sort by the user's last name descending.             |
| `sort=lastName,firstName` | Sort by the user's last name and then by first name. |

## Sparse fieldsets

APIs `MAY` allow callers to specify which fields to return. Those that do `MUST` accept a `fields`
query parameter whose value is a comma-delimited list of the fields to include. `id` and `type` are
always returned.

**Example**

```
GET /api/v1/users?fields=firstName,lastName
```

## Advanced queries

The `filter` query parameters cover simple predicates, but they cannot express arbitrary `AND` and
`OR` combinations, and a long expression will exceed the practical limit on URL length. APIs that
need richer queries `MUST` expose a **search** operation that carries the expression in the request
body.

- HTTP verb `MUST` be `POST`.
- API path `MUST` be like `/api/v1/{resource plural}:search`.

The expression is written in [JSON Logic](https://jsonlogic.com/) and placed in a top-level `filter`
field. JSON Logic is adopted for its notation only. Its full operator set includes control flow,
iteration, and arithmetic, none of which belong in a query, so only the following operators are
supported:

| Operator             | Meaning                                             |
| -------------------- | --------------------------------------------------- |
| `var`                | Reference a field of the resource.                  |
| `==`, `!=`           | Equal, not equal.                                   |
| `>`, `>=`, `<`, `<=` | Numeric and date comparison.                        |
| `in`                 | Membership in a list, or a substring match.         |
| `and`, `or`          | Boolean composition, each taking two or more terms. |
| `!`                  | Negation.                                           |

A request that uses any other operator, or references a field the API does not support, `MUST` be
rejected with `422`.

**Example**

Find active or invited users whose KDF iterations are below the current minimum:

```
POST /api/v1/users:search?page[size]=50&sort=-createdAt
Accept: application/json
Content-Type: application/json
```

```json
{
  "filter": {
    "and": [
      { "<": [{ "var": "kdfIterations" }, 600000] },
      { "in": [{ "var": "status" }, ["ACTIVE", "INVITED"]] }
    ]
  }
}
```

The response `MUST` be identical in shape to the equivalent [read-many](#read-many) request.

[Learn more about JSON Logic](https://jsonlogic.com/)

**Success responses**

Upon success, APIs `MUST` return `200`.

| Status   | Description                | Response                                  |
| -------- | -------------------------- | ----------------------------------------- |
| `200 OK` | The search was successful. | The matching resources, paged and sorted. |

## Bulk operations

A bulk operation creates, updates, deletes, or acts upon many resources in one request. It is
shorthand for calling the corresponding single-resource API once per resource, and is never a way
around that API's [rules](#per-resource-rules).

Every bulk operation has three properties, and every combination of them is legitimate. Business
rules, data volumes, and what the caller needs back decide which combination an API implements; this
standard decides how each combination looks.

| Property                                     | Options                     | Governs                                       |
| -------------------------------------------- | --------------------------- | --------------------------------------------- |
| [Targeting](#targeting)                      | `data`, `ids`, `filter`     | How the caller names the resources.           |
| [Atomicity](#all-or-nothing-and-best-effort) | All-or-nothing, best-effort | What happens when some of the resources fail. |
| [Execution](#synchronous-and-asynchronous)   | Synchronous, asynchronous   | Whether the caller waits for the outcome.     |

Every bulk API `MUST` document, in its OpenAPI description, the targeting it accepts, the atomicity
modes it supports and which is the default, whether it responds synchronously, asynchronously, or
both, and the maximum number of items it accepts.

All bulk operations use `POST`:

| Operation                      | API path                                  | Targeting                        |
| ------------------------------ | ----------------------------------------- | -------------------------------- |
| [Bulk create](#bulk-creates)   | `/api/v1/{resource plural}:bulk-create`   | `data`                           |
| [Bulk update](#bulk-updates)   | `/api/v1/{resource plural}:bulk-update`   | `ids` or `filter`, plus `update` |
| [Bulk replace](#bulk-replaces) | `/api/v1/{resource plural}:bulk-replace`  | `data`                           |
| [Bulk delete](#bulk-deletes)   | `/api/v1/{resource plural}:bulk-delete`   | `ids` or `filter`                |
| [Bulk action](#bulk-actions)   | `/api/v1/{resource plural}:bulk-{action}` | `ids` or `filter`, plus `input`  |

### Targeting

- **`data`** is an array of resources, each shaped exactly as the corresponding single-resource API
  expects it. It is used where each resource carries its own content: creates and replaces.
- **`ids`** is an array of resource IDs.
- **`filter`** is an [advanced query](#advanced-queries) expression.

Where an operation accepts both `ids` and `filter`, a request `MUST` supply exactly one of them.

> **Why `ids` when a `filter` can say `{ "in": [{ "var": "id" }, [...]] }`?** Because of what
> happens to an ID that matches nothing. With `ids`, the caller named the resource, so a missing one
> is a failure and is reported back. With `filter`, the caller described a set, and a resource that
> isn't in it simply isn't in it.

- A `filter` `MUST NOT` be empty.
- `ids` and `data` `MUST NOT` name the same resource twice.
- An empty `ids` or `data` array is valid and affects nothing.
- A request carrying more items than the documented maximum `MUST` be rejected with `422`.
- Targeting `MUST NOT` widen the caller's reach. Every `ids` and `filter` is implicitly restricted
  to the current organization and to the resources the caller may see. A `filter` `MUST NOT` match a
  resource the caller should not know exists, and an ID naming such a resource `MUST` be reported
  exactly as a nonexistent one would be.

### Per-resource rules

[Targeting](#targeting) decides which resources a caller can reach. Per-resource rules decide what
the caller may do to each of them. Both always apply.

- Each targeted resource `MUST` be held to the same authorization, validation, and business rules as
  the corresponding single-resource API — including rules that depend on the resource's current
  state, such as which status transitions are allowed.
- Each resource that changes `MUST` produce the same side effects — events, notifications, audit
  records — as the single-resource API would.
- For `ids` and `filter` targeting, this means evaluating the rules against each targeted resource
  as it currently is, before changing it.

A service `MAY` implement a bulk operation however it likes — including as a single set-based
statement — provided the outcome, including which resources fail and why, is indistinguishable from
applying the single-resource API's rules one resource at a time.

### All-or-nothing and best-effort

- **All-or-nothing:** no resource changes unless every resource succeeds. If any resource fails, the
  request fails and the response reports every failure, not just the first.
- **Best-effort:** each resource succeeds or fails on its own. One resource's failure `MUST NOT`
  prevent or undo another's success.

A service `MAY` support either mode or both. Callers choose with the `atomic` query parameter:
`atomic=true` for all-or-nothing, `atomic=false` for best-effort.

- A service that supports both modes `MUST` default to all-or-nothing.
- Every bulk API `MUST` recognize `atomic`, even if it supports only one mode, and `MUST` reject
  with `422` a value it does not support. Ignoring the parameter would change the outcome rather
  than merely do less — see
  [Unrecognized fields, query parameters, and headers](#unrecognized-fields-query-parameters-and-headers).
- Problems with the request itself — a malformed `filter`, too many items, both `ids` and `filter` —
  are not per-resource failures. They reject the whole request in either mode, before any resource
  is processed.

**Example**

```
POST /api/v1/users:bulk-delete?atomic=false
```

### Synchronous and asynchronous

- **Synchronous:** the response carries the outcome.
- **Asynchronous:** the response is `202` and a [job](#jobs) the caller can use to follow progress
  and collect the outcome.

A service that supports both `MUST` respond synchronously unless the caller sends
`Prefer: respond-async` ([RFC 7240](https://www.rfc-editor.org/info/rfc7240/)). A service that
honors the preference `SHOULD` return `Preference-Applied: respond-async`. A service `MAY` also
respond asynchronously, regardless of preference, to requests that exceed a documented size. Callers
`MUST` handle every response the API documents.

### Choosing semantics

| When…                                                                                               | Consider…      |
| --------------------------------------------------------------------------------------------------- | -------------- |
| A partial result would leave related resources inconsistent, or the caller treats the set as one.   | All-or-nothing |
| Each resource stands alone and the caller can report or retry individual failures (e.g. an import). | Best-effort    |
| The set is small and bounded, and each resource is cheap to process.                                | Synchronous    |
| The set is unbounded, or each resource is expensive to process (events, calls to other services).   | Asynchronous   |

### Bulk responses

**Success responses**

| Status           | Description                                                                                             | Response                                           |
| ---------------- | ------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| `200 OK`         | The request was processed. If all-or-nothing, every resource succeeded; if best-effort, any number did. | As described below.                                |
| `202 Accepted`   | The request is scheduled.                                                                               | The [job](#jobs) that was scheduled to process it. |
| `204 No Content` | All-or-nothing only. Every resource succeeded.                                                          | Nothing.                                           |

A `200` response carries:

- `meta.affectedCount` — the number of resources that succeeded. `MUST` be present.
- `meta.failedCount` — the number of resources that failed. `MUST` be present for best-effort.
- `data` — for creates, updates, and replaces, the latest representation of each resource that
  succeeded. Bulk creates `SHOULD` return it, because the caller needs the generated IDs; other
  operations `MAY`. When present with `data` or `ids` targeting, it `MUST` follow request order.
- `errors` — best-effort only. At least one [error](#errors) for each resource that failed.

Each error `MUST` identify the resource that failed:

- by `source.pointer` into the request, where the resource appears there (e.g.
  `/data/2/attributes/email` or `/ids/2`), or
- by `meta.resource`, a `type` and `id`, where it does not (i.e. `filter` targeting).

An error's `status` `MUST` be what the single-resource API would have returned for that resource —
for example, `404` for an ID that doesn't exist, `409` for a version conflict, or `422` for a broken
business rule.

To correlate created resources with request items, a bulk create `MAY` accept a
[`lid`](https://jsonapi.org/format/#document-resource-object-identification) on each item. An API
that accepts `lid` `MUST` echo it on the created resource.

**Best-effort example**

```json
{
  "data": [
    {
      "attributes": {
        "email": "bob@example.com"
      },
      "id": "62bed180-1f78-45d4-8a56-c996936a2947",
      "lid": "bob",
      "type": "user"
    }
  ],
  "errors": [
    {
      "id": "9f3c1e2a-7d40-4c8b-9b17-2f5a1c6e83d1",
      "status": "422",
      "code": "email-in-use",
      "title": "Email address is already in use",
      "detail": "'alice@example.com' is already a user in this organization.",
      "source": {
        "pointer": "/data/1/attributes/email"
      }
    }
  ],
  "meta": {
    "affectedCount": 1,
    "failedCount": 1
  }
}
```

**All-or-nothing failure.** Nothing has changed. The response is a standard [error](#errors)
response carrying every failure. Its status `MUST` be `409` if every failure is a version conflict
and `422` otherwise. It is never `404`, because the resource named by the URL path — the collection
— was found.

**Asynchronous outcome.** When the job completes, it `MUST` report the same `affectedCount`,
`failedCount`, and `errors` a synchronous response would have.

### Bulk creates

Bulk creates are the equivalent of [creating](#creating-resources) each resource in `data`.

**Example**

```
POST /api/v1/users:bulk-create?atomic=false
Accept: application/json
Content-Type: application/json
```

```json
{
  "data": [
    {
      "attributes": {
        "email": "bob@example.com"
      },
      "lid": "bob",
      "type": "user"
    },
    {
      "attributes": {
        "email": "alice@example.com"
      },
      "lid": "alice",
      "type": "user"
    }
  ]
}
```

The [best-effort example](#bulk-responses) above is a possible response.

### Bulk updates

Bulk updates apply the same change to every targeted resource.

- `update` `MUST` be present and holds the fields being changed.
- `update` has [partial update](#partial-updates) semantics: an absent field is not changed and an
  explicit `null` clears the value. This holds even on services that do not otherwise offer `PATCH`.
- `update` `MUST` contain only fields the single-resource update accepts. A request whose `update`
  names a read-only field `MUST` be rejected with `422`. A single-resource update ignores read-only
  fields because the caller sends back the whole resource it read. In a bulk update, the caller
  names only the fields it wants changed, so a read-only field there is a request that cannot be
  honored.
- The single-resource update rules `MUST` be applied to each resource, both as it is and as it would
  be after the change.
- Bulk updates do not check [`version`](#optimistic-concurrency), but `MUST` increment it on every
  resource they change.

> **A bulk update is never a way around an action.** A field that changes only through
> [actions](#acting-upon-resources) — typically a `status` whose transitions are governed by
> business rules — is read-only, and so cannot be set by a bulk update. Changing it for many
> resources is a [bulk action](#bulk-actions) (e.g. `POST /api/v1/users:bulk-disable`), which
> applies the action's transition rules to each resource.

**Example**

```
POST /api/v1/users:bulk-update
Accept: application/json
Content-Type: application/json
```

```json
{
  "filter": {
    "in": [{ "var": "department" }, ["Eng", "R&D"]]
  },
  "update": {
    "department": "Engineering"
  }
}
```

### Bulk replaces

Bulk replaces are the equivalent of [updating](#updating-resources) each resource in `data` — `PUT`
called once per resource, with the same "completely replace" semantics.

- Each item `MUST` carry its `id`.
- Services that implement [optimistic concurrency](#optimistic-concurrency) `MUST` check each item's
  `version`. A mismatch is a `409` failure of that item.
- If the single-resource `PUT` supports create-or-update, a bulk replace `MAY` as well.

**Example**

```
POST /api/v1/users:bulk-replace
Accept: application/json
Content-Type: application/json
```

```json
{
  "data": [
    {
      "attributes": {
        "firstName": "Bob",
        "lastName": "Smith",
        "version": "4"
      },
      "id": "62bed180-1f78-45d4-8a56-c996936a2947",
      "type": "user"
    },
    {
      "attributes": {
        "firstName": "Alice",
        "lastName": "Jones",
        "version": "7"
      },
      "id": "cacba8c1-29fa-4018-8950-acd400ec76b7",
      "type": "user"
    }
  ]
}
```

### Bulk deletes

Bulk deletes are the equivalent of [deleting](#deleting-resources) each targeted resource.

On a service that supports [soft deletes](#soft-deletes), a bulk delete follows the same rules: it
soft-deletes by default and hard-deletes when the caller passes `permanent=true`.

**Example**

```
POST /api/v1/users:bulk-delete
Accept: application/json
Content-Type: application/json
```

```json
{
  "filter": {
    "and": [
      { "==": [{ "var": "status" }, "INVITED"] },
      { "<": [{ "var": "invitedAt" }, "2026-06-01T00:00:00Z"] }
    ]
  }
}
```

### Bulk actions

Bulk actions are the equivalent of invoking an [action](#acting-upon-resources) upon each targeted
resource.

- API path `MUST` be like `/api/v1/{resource plural}:bulk-{action}`, where `{action}` is the name of
  the single-resource action — e.g. `/api/v1/users:bulk-send-email` for
  `/api/v1/users/{id}/actions/send-email`.
- Because bulk actions share a namespace with the other bulk operations, actions `MUST NOT` be named
  `create`, `update`, `replace`, or `delete`.
- `input` holds exactly what the single-resource action would accept as its body, and is applied to
  every targeted resource. It `MAY` be omitted if the action takes no body.

**Example**

```
POST /api/v1/users:bulk-send-email
Accept: application/json
Content-Type: application/json
```

```json
{
  "ids": ["62bed180-1f78-45d4-8a56-c996936a2947", "cacba8c1-29fa-4018-8950-acd400ec76b7"],
  "input": {
    "subject": "Hello",
    "body": "World!"
  }
}
```

## Request validation

Requests `MUST` be exhaustively validated before attempting to process the request and `SHOULD`
return all errors at once (not stop after the first error is encountered). Exhaustive validation
includes the following:

- Every required field, parameter, and header is present, not set to null, and not an empty string.
- The data type of every field, parameter, and header is the correct data type. In the case of
  parameters and headers, since those always originate as strings, it also means "can be converted
  to the declared type".
- Field names specified by `sort` or `fields` parameters are valid field names.
- Values provided for constrained fields are among the enumerated values.
- Values provided for fields that restrict the minimum value, the maximum value, and/or the maximum
  length are within those constraints.
- Identifiers that refer to other resources, whether managed by the service or some other service,
  are valid.

> With some enhancements, developers should get all of the above "for free" from the
> `Bitwarden.Server.Sdk` which will **guarantee** that no request reaches developer code that
> doesn't conform to the declared request model.

## Errors

Errors `MUST` be returned as an array of error objects within a top-level `errors` field. Each error
populates the following fields, except that at most one `source` member applies to any one error:

| Field              | Description                                                                                                       | Type     |
| ------------------ | ----------------------------------------------------------------------------------------------------------------- | -------- |
| `code`             | A stable, machine-readable error code.                                                                            | `string` |
| `detail`           | A human-readable explanation specific to this occurrence. May be localized.                                       | `string` |
| `id`               | A unique identifier for this particular occurrence of the problem.                                                | `string` |
| `meta.resource`    | The `type` and `id` of the resource that failed, in a [bulk operation](#bulk-responses).                          | `object` |
| `source`           | A reference to the primary source of the error.                                                                   | `object` |
| `source.header`    | The name of the request header that caused the error.                                                             | `string` |
| `source.parameter` | The query parameter that caused the error.                                                                        | `string` |
| `source.pointer`   | A [JSON Pointer](https://www.rfc-editor.org/info/rfc6901/) to the field in error (e.g. `/data/attributes/title`). | `string` |
| `status`           | The HTTP status code applicable to this problem.                                                                  | `string` |
| `title`            | A short, human-readable summary of the problem that doesn't change from occurrence to occurrence.                 | `string` |

**Example**

```json
{
  "errors": [
    {
      "id": "9f3c1e2a-7d40-4c8b-9b17-2f5a1c6e83d1",
      "status": "422",
      "code": "resource-not-found",
      "title": "Referenced resource does not exist",
      "detail": "'e3d2eb3e-755c-41cd-86f0-0e0649043ef6' is not a group in this organization.",
      "source": {
        "pointer": "/data/attributes/groups/0"
      }
    }
  ]
}
```

> A `500` response `MUST NOT` include any detail about the failure. `title` and `detail` `MUST` be
> generic, and `source` `MUST` be omitted. Exception messages, stack traces, type names, connection
> strings, and dependency identities are all disclosure risks and belong in traces and logs, which
> are not reachable by the caller. The `id` field is how a caller and an operator correlate a report
> with the logged detail.

## Jobs

APIs that accept work to be completed asynchronously return `202` along with a **job** — a resource
representing the accepted work and its progress. A formal standard for jobs is forthcoming. Bulk
operations place [additional requirements](#bulk-responses) on what a completed job reports.

## Deprecation

Deprecation announces that an API should no longer be called, tells callers what they _should_ be
calling, instead, and, ideally, how much time they have to migrate.

- Every deprecated API `MUST` be marked `deprecated: true` in the service's OpenAPI spec and the
  `description` field `MUST` name the replacement.
- Every response from a deprecated API `MUST` include the `Deprecation` and `Sunset` headers and
  `SHOULD` include a `Link` header naming the replacement.

> Learn more about the [Deprecation](https://www.rfc-editor.org/info/rfc9745/) and
> [Sunset](https://www.rfc-editor.org/info/rfc8594/) headers.

**Example**

```http
Deprecation: @1688169599
Sunset: Sun, 30 Jun 2024 23:59:59 GMT
Link: </api/v2/groups>; rel="successor-version"
```

| Header        | Description                                                                                                                                   |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `Deprecation` | When the operation became deprecated, as an HTTP structured field date — `@` followed by seconds since the Unix epoch.                        |
| `Sunset`      | When it will stop working, as an HTTP date. It `MUST` be a real date, and it `MUST NOT` pass without either removal or a published extension. |
| `Link`        | Points at the replacement.                                                                                                                    |

## Divergences from JSON:API

- Request and responses use the `application/json` media type, not `application/vnd.api+json`.
- We do not support [compound documents](https://jsonapi.org/format/#document-compound-documents) or
  the related `include` query parameter.
- Paged responses are not required to include `links`.
- For sparse fieldsets, callers specify the fields to include via a `fields` query parameter. We do
  not support the `fields[{type}]` form.
- Unrecognized query parameters are ignored rather than rejected with `400`, and the result-shaping
  subset is rejected with `422`. See
  [Unrecognized fields, query parameters, and headers](#unrecognized-fields-query-parameters-and-headers).
- Implementation-specific query parameters are not required to contain a non-`a-z` character.
- Resources are updated with `PUT` and complete-replace semantics rather than `PATCH`. `PATCH`,
  where a service supports it, follows the specification's partial-update semantics.
- We do not support `relationships` objects. A reference to another resource is an `attributes`
  member holding its ID.
- A best-effort [bulk response](#bulk-responses) carries both `data` and `errors`, which JSON:API
  does not allow to coexist.
- We do not adopt the [Atomic Operations](https://jsonapi.org/ext/atomic/) extension. See
  [the FAQ](#frequently-asked-questions).

## Frequently asked questions

> Why JSON:API?

We believe an established standard, with thoughtful answers to every API question, will be more
robust than any standard we might invent ourselves. It is widely adopted among some of the largest
SaaS vendors in the industry including [Datadog](https://docs.datadoghq.com/api/latest).

We adopt the standard selectively, however, to get most of the benefits of JSON:API without the
burden of full conformance.

> Why is there an envelope? Can't the API just return the object?

1. The envelope gives pagination, counts, and other response metadata somewhere to live that is not
   mixed in with the resource itself.
1. It is a serialization concern, not a programming model concern. Handlers take and return plain
   model classes; how those serialize is the framework's business. No application code should ever
   see `data` or `attributes`.

> Why are service-to-service APIs versioned? Public APIs aren't.

We feel strongly that service-to-service APIs should be formally versioned. Without formal
versioning, every change must be additive, which means the shape can never change and every new
field is optional. Contracts constrained like that get weaker over time, and what we _want_ to
express eventually cannot be expressed, because we have committed ourselves to "additive changes
only". This rules out adopting the existing public API conventions, which are expressly unversioned.

> Why do I have to specify the ID in the path _and_ the JSON body?

1. So that the JSON is comprehensive and self-describing.
1. Establishing just one rule to "always include it" is easier to remember than multiple rules for
   when it is required and when it is not required.

> Why do I have to specify the type? You can infer that from the URL path.

1. So that the JSON is comprehensive and self-describing.
1. Establishing just one rule to "always include it" is easier to remember than multiple rules for
   when it is required and when it is not required.

> Why should empty strings be treated like `null`?

A system where `""` and `null` mean two different things requires every caller, every service, and
every database column to agree on the distinction. This can be a challenge to preserve as data gets
serialized to and from various representations across various languages and, in our experience, this
is one class of bug that can be entirely eliminated by just treating them the same.

> Why shouldn't we support partial updates?

1. `PUT` with completely-replace semantics is simpler to implement and far more common.
1. UI teams tend to prefer read-modify-write semantics which works well with `PUT`.
1. Services that support `PATCH` frequently have to _also_ support `PUT` which creates two endpoints
   to do the same thing.
1. It is hard to tell the difference between "null this field out" vs. "do not update this field".

To be clear, teams _can_ support partial updates. We just think you will be better served by just
sticking to simple updates.

> How do I support just adding or removing an element from a collection?

You `MAY` implement the [JSON Patch](https://www.rfc-editor.org/info/rfc6902/) specification, which
was designed for exactly this. However, we think an [action](#acting-upon-resources) works just as
well and is simpler:

```
POST /api/v1/groups/62bed180-1f78-45d4-8a56-c996936a2947/actions/add-collection
```

> Why are we standardizing on JSON Logic instead of OData?

1. OData's `$filter` is a string expression language, so both building and parsing it require string
   handling where JSON is already right there.
1. Composing a filter by concatenating strings means quoting and escaping, which is how injection
   bugs happen. Composing a JSON object does not.
1. OData brings a great deal more than filtering — metadata documents, `$expand`, batch, its own
   conventions — and we only want the filtering.

> Why not JSON:API's Atomic Operations extension?

It solves a different problem. Atomic Operations runs a heterogeneous list of operations — create
this, update that, delete the other — as one transaction. Our bulk operations apply one operation to
many resources, and need best-effort and asynchronous execution, which the extension does not offer.

> Why not `207 Multi-Status` for best-effort results?

`207` comes from WebDAV and carries an XML body by definition. Callers already have to inspect
`meta.failedCount` and `errors` to learn which resources failed, so a distinct status code adds
nothing but another case to handle.
