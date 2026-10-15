---
sidebar_position: 2
---

# API paths

{/* cspell:ignore kebab */}

- Paths `MUST` be lowercase kebab-case.
- The first element `MUST` be a namespace, `api` by default. The next `MUST` be the version,
  starting at `v1` (see [breaking changes and versioning](./breaking-changes-and-versioning.md)).
  The next `MUST` name the resource, and `SHOULD` be its plural (for example `users`). Where the API
  targets one resource, the next `SHOULD` be its ID.
- Paths `SHOULD` be traversable: if `/api/v1/users/123/addresses/456` names an address, its parent
  paths name all of that user's addresses, the user, and all users. This shows how paths fit
  together. It does not require every parent path to exist.

```text
/api/v1/users
/api/v1/users/123
/api/v1/users/123/addresses
```

## Subject and scope

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
as `filter[organization]=123,456`, or use an [advanced query](./advanced-queries.md). None of these
puts the organization in the path. An operation can also be declared so that less scope means more,
for example returning users across every organization the caller belongs to when no organization is
in context.
