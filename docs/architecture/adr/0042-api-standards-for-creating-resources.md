---
adr: "0042"
status: Proposed
date: 2026-10-05
tags: [server, server-sdk]
---

# 0042 - API standards for creating resources

<AdrTable frontMatter={frontMatter}></AdrTable>

## Notation

This ADR uses [RFC 2119](https://www.rfc-editor.org/info/rfc2119/) keywords (`MUST`, `MUST NOT`,
`SHOULD`, `SHOULD NOT`, `MAY`) deliberately.

## Context and problem statement

[ADR-0036](./0036-service-to-service-api-standards.md) requires service-to-service APIs to conform
to a documented set of standards, and ADR-0039 builds those standards on IETF RFCs. This ADR sets
how a resource is created: the method, the path, the request, and what a successful response
returns. Payload shape and errors are set by ADR-0040.

## Considered options

- **`POST` to the collection, returning the new resource.**
- **`PUT` to a client-chosen ID** as the primary way to create.
- **`POST` returning only a `Location` header** and no body.

## Decision outcome

Chosen option: **`POST` to the collection, returning the new resource**, because the caller usually
needs the server-generated ID and the stored representation, and getting both in one response saves
a second call.

- The method `MUST` be `POST`, and the path `SHOULD` be the collection, `/api/v1/{resource plural}`.
- When the service generates the ID, the request `MUST` omit `id`.
- APIs that support create-or-update `MUST` do so through `PUT` (see ADR-0044).
- On success, APIs `SHOULD` return `201` but `MAY` return `202` or `204`.

| Status           | Meaning                                  | Body                                       |
| ---------------- | ---------------------------------------- | ------------------------------------------ |
| `201 Created`    | The resource was created.                | The latest representation of the resource. |
| `202 Accepted`   | The resource is scheduled to be created. | The job scheduled to create it (ADR-0045). |
| `204 No Content` | The resource was created.                | Nothing.                                   |

```http
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

Creating many resources at once is a bulk create (see ADR-0046).

### Positive consequences

- One round trip returns everything a caller needs about the new resource.
- Creation looks the same on every API.

### Negative consequences

- `201` responses carry the full representation, which is wasted when the caller does not need it.
  `204` remains available for that case.
