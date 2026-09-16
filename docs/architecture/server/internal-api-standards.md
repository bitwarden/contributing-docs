---
sidebar_position: 3
---

# Internal API standards

{/* cspell:ignore reate reates eletes elete pdate pdates fieldsets */}

**Audience:** Bitwarden engineers and AI agents building or consuming a service-to-service API.

**Scope.** Internal, service-to-service APIs. Bitwarden's existing public API is out of scope and is
not changing; nothing here applies to it.

This page is the living standard, adopted in [ADR-0036](../adr/0036-internal-api-standards.md). Its
rules evolve by pull request without superseding that decision.

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

Standards for each type of API are documented below.

### JSON:API

Internal Bitwarden APIs are based on top of [JSON:API](https://jsonapi.org/) unless otherwise noted
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

Every operation `MUST` carry an explicit, stable `operationId`, and it `MUST` include the version
(e.g. `getGroupV1`, `listGroupsV1`, `replaceGroupV1`, `getPolicyV2`). These IDs are necessary for
stable, generated clients:

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

The verb is `SHOULD NOT` rather than `MUST NOT` because these are internal APIs and we own every
caller. A team `MAY` make a breaking change in place when it can account for every caller — either
because the change has been coordinated with them, or because the rejection surfaces somewhere the
caller or the user can act on it.

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
  implement.

## JSON

- Dates `MUST` be formatted in [ISO 8601](https://en.wikipedia.org/wiki/ISO_8601) format (e.g.
  `2026-01-01T00:00:00Z`) and `MUST` include a time zone indicator and `SHOULD` standardize on UTC.
- Field values that are constrained to a fixed set of values should enumerate the valid values in
  all caps (e.g. `RED`, `GREEN`, `BLUE`) both in the OpenAPI spec and in example JSON to help
  distinguish these fields from free-text string fields. At runtime, however, APIs `MUST` ignore
  case when validating these values.
- APIs `SHOULD` strip leading and trailing whitespace from all strings before processing them.
- APIs `MUST` treat an empty string the same as if the field is not present.
- APIs `MUST` treat a field that isn't present the same as `null`.
- APIs `SHOULD NOT` include `null` fields in responses.

## Naming conventions

- Field names `MUST` be in camel case (e.g. `firstName`, `lastName`).
- Fields holding a date or date/time `MUST` end in `At` (e.g. `createdAt`, `expiresAt`).
- Boolean fields `MUST NOT` be prefixed with `is` (e.g. `active`, not `isActive`).
- Fields whose value is the identifier of another resource `SHOULD NOT` be suffixed with `Id`. A
  string-valued `assignedTo` is self-evidently the identifier of the user it is assigned to;
  `assignedToId` adds nothing.

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

The only exception is when a resource is being created via `POST` against an API that will generate
the ID. In this case, the `id` field `MUST` be omitted.

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
[bulk updates](#bulk-updates), and [bulk deletes](#bulk-deletes), which use `POST` without creating
a resource.

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

Upon success, APIs `SHOULD` return `200` but `MAY` return `202` or `204`.

| Status           | Description                              | Response                                                    |
| ---------------- | ---------------------------------------- | ----------------------------------------------------------- |
| `200 OK`         | The resource was updated.                | The latest representation of the resource.                  |
| `202 Accepted`   | The resource is scheduled to be updated. | The [job](#jobs) that was scheduled to update the resource. |
| `204 No Content` | The resource was updated.                | Nothing.                                                    |

See also: [Partial updates](#partial-updates)

## Partial updates

Services `SHOULD NOT` support partial updates — see [the FAQ](#frequently-asked-questions) for why.
A service that _does_ support them `MUST` use `PATCH` and `MUST` ignore any field that isn't
specified.

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

A comma that is part of a value `MUST` be escaped with a backslash —
`filter[displayName]=Smith\, Jr` is the single value `Smith, Jr`. This applies only where the caller
is supplying multiple values or a [range](#ranges); a parameter that takes a single value is never
split, so a comma in its value needs no escaping. An asterisk that is part of a value `MUST`
likewise be escaped wherever the API supports wildcard matching.

### Ranges

Query parameters that allow the caller to specify a range of values should do so using two values,
separated by commas, and using `[` and `]` to represent **inclusive** begin and end, and `(` and `)`
to represent **exclusive** begin and end. An asterisk `*` may be used to represent no limit.

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

## Bulk updates

Bulk updates apply the same change to every resource matching a filter.

- HTTP verb `MUST` be `POST`.
- API path `MUST` be like `/api/v1/{resource plural}:bulk-update`.
- `filter` `MUST` be present and use the [advanced query](#advanced-queries) expression language.
- An `update` field contains the fields being changed.

**Example**

```
POST /api/v1/users:bulk-update
Accept: application/json
Content-Type: application/json
```

```json
{
  "filter": {
    "in": [{ "var": "status" }, ["INVITED", "PENDING"]]
  },
  "update": {
    "status": "DISABLED"
  }
}
```

**Success responses**

Upon success, APIs `SHOULD` return `202` but `MAY` return `200`.

| Status         | Description                                | Response                                                     |
| -------------- | ------------------------------------------ | ------------------------------------------------------------ |
| `200 OK`       | The resources were updated.                | `meta.affectedCount`, the number of resources updated.       |
| `202 Accepted` | The resources are scheduled to be updated. | The [job](#jobs) that was scheduled to update the resources. |

## Bulk deletes

Bulk deletes delete every resource matching a filter.

- HTTP verb `MUST` be `POST`.
- API path `MUST` be like `/api/v1/{resource plural}:bulk-delete`.
- `filter` `MUST` be present and use the [advanced query](#advanced-queries) expression language.

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

**Success responses**

Upon success, APIs `SHOULD` return `202` but `MAY` return `200`.

| Status         | Description                                | Response                                                     |
| -------------- | ------------------------------------------ | ------------------------------------------------------------ |
| `200 OK`       | The resources were deleted.                | `meta.affectedCount`, the number of resources deleted.       |
| `202 Accepted` | The resources are scheduled to be deleted. | The [job](#jobs) that was scheduled to delete the resources. |

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
representing the accepted work and its progress. A formal standard for jobs is forthcoming.

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

> Why are internal APIs versioned? Public APIs aren't.

We feel strongly that internal APIs should be formally versioned. Without formal versioning, every
change must be additive, which means the shape can never change and every new field is optional.
Contracts constrained like that get weaker over time, and what we _want_ to express eventually
cannot be expressed, because we have committed ourselves to "additive changes only". This rules out
adopting the existing public API conventions, which are expressly unversioned.

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
