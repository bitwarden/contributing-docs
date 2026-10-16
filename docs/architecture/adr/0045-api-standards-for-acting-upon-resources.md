---
adr: "0045"
status: Proposed
date: 2026-10-05
tags: [server, server-sdk]
---

# 0045 - API standards for acting upon resources

<AdrTable frontMatter={frontMatter}></AdrTable>

{/* cspell:ignore kebab */}

## Notation

This ADR uses [RFC 2119](https://www.rfc-editor.org/info/rfc2119/) keywords (`MUST`, `MUST NOT`,
`SHOULD`, `SHOULD NOT`, `MAY`) deliberately.

## Context and problem statement

[ADR-0036](./0036-service-to-service-api-standards.md) requires service-to-service APIs to conform
to a documented set of standards, and ADR-0039 builds those standards on IETF RFCs. Most operations
are creating, reading, updating, or deleting a resource, but some do not fit: sending an email,
disabling a user, rotating a key. This ADR sets how those operations are exposed, and how work that
completes later is accepted.

## Considered options

- **Actions as a sub-resource:** `POST /api/v1/{resource plural}/{id}/actions/{action}`.
- **Custom methods on the resource path,** as in Google AIP-136: `POST /api/v1/users/{id}:disable`.
- **RPC-style endpoints** outside the resource path, such as `POST /api/v1/disable-user`.
- **Updating a status field** through `PUT` or `PATCH`.

## Decision outcome

Chosen option: **actions as a sub-resource**, because the path still names the resource acted on,
the action reads clearly in logs and routing rules, and transitions governed by business rules stay
out of ordinary updates.

### Modeling operations

- APIs `SHOULD` be modeled as creating, reading, updating, and deleting resources wherever they can,
  and as actions only where an operation does not fit.
- APIs `SHOULD` guard against proliferation from tailoring them to individual callers. One API that
  can be called two ways, for example through query parameters, is better than two APIs that can
  each be called one way.

### Actions

- The method `MUST` be `POST`, and the path `SHOULD` be
  `/api/v1/{resource plural}/{id}/actions/{action}`, with the action named in kebab-case.
- Actions impose no restriction on the shape of the request body.
- Actions `MUST NOT` be named `create`, `update`, `replace`, or `delete`, because bulk actions share
  a namespace with the other bulk operations (see ADR-0046).
- A field that changes only through actions, typically a status whose transitions follow business
  rules, `MUST` be read-only, so that no update can bypass the action.
- On success, APIs `SHOULD` return `204` but `MAY` return `200` with the latest representation of
  the resource, or `202` with the job scheduled to perform the action.

```http
POST /api/v1/users/62bed180-1f78-45d4-8a56-c996936a2947/actions/send-email
Content-Type: application/json
```

```json
{
  "subject": "Hello",
  "body": "World!"
}
```

### Asynchronous work

APIs that accept work to be completed later `MUST` return `202 Accepted` with a **job**: a resource
representing the accepted work and its progress. This applies to creates, updates, deletes, actions,
and bulk operations alike.

### Positive consequences

- Operations outside create, read, update, and delete have one recognizable form on every API.
- Business-rule transitions cannot be bypassed by an ordinary update.
- Every asynchronous operation answers the same way, with a job.

### Negative consequences

- Actions are a judgement call: a team has to decide whether an operation is an update or an action.
- The shape of a job is not yet defined, so early asynchronous APIs may need to change when it is.

### Plan

- Define the job resource, including its fields, its states, and how a caller follows its progress,
  in a later ADR.
