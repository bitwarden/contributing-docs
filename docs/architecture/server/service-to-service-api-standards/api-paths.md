---
sidebar_position: 4
---

# API paths

API paths `MUST` use **lowercase "kebab-case"** and conform as follows:

1. The first element(s) of the API path `MUST` be a namespace. By default, the namespace `SHOULD` be
   `api`.
1. The next element of the API path `MUST` be the version number starting with `v1`.
1. The next element of the API path `MUST` specify the resource or resources it targets. For
   resource-oriented APIs, this element `SHOULD` be the "resource plural" (e.g. `users`).
1. For resource-oriented APIs, the next element of the API path `SHOULD` be the ID of the resource
   it targets.
1. Additional elements `MAY` be specified to target sub-resources.

> **Why versioning in the path?** It is visible in logs, traces, routing rules and curl commands; it
> needs no content negotiation to read; and it lets two versions coexist behind one host. Header and
> media-type versioning are both defensible but harder to operate.

**Examples**

```
/api/v1/users
/api/v1/users/123
/api/v1/users/123/addresses
```

Paths `SHOULD` be traversable. If `GET /api/v1/users/123/addresses/456` returns the details about
address 456 of user 123, then every parent path `SHOULD` resolve:

- `GET /api/v1/users/123/addresses` should return all addresses of user 123.
- `GET /api/v1/users/123` should return details about user 123.
- `GET /api/v1/users` should return all users.

## Which identifiers belong in the path

Every request targets a **subject** and runs inside a **scope**:

- The **subject** is what the request acts on (i.e. a resource or a collection of resources). It
  `MUST` be named in the path.
- The **scope** is what the request runs inside — the current organization, the current user. It
  `MUST NOT` be named in the path; it travels as context.

That is the whole of the path rule. A path says what is acted on (or fetched). It does not say what
a call returns: which parts of the scope an operation requires, permits or refuses is declared by
the operation, and belongs to authentication and authorization (standard forthcoming).

**Examples**

| Path                                | Subject                          |
| ----------------------------------- | -------------------------------- |
| `GET /api/v1/users`                 | users                            |
| `GET /api/v1/users/123`             | user 123                         |
| `GET /api/v1/organizations`         | organizations                    |
| `GET /api/v1/organizations/123`     | organization 123                 |
| `GET /api/v1/organizations/current` | the organization the scope names |

`current` `SHOULD` be used where the subject is whatever the scope names, rather than repeating an
identifier the caller has already supplied.

> **Why keep the scope out?** An identifier in a path is something a caller can try other values of,
> and a path that accepts one must prove on every request that this caller may use this value. A
> scope taken from context is established once, where the caller is authenticated. It also keeps one
> path for a resource that can belong to more than one kind of owner.

Callers `SHOULD` send the current organization and the current user on every request where each
exists. Two services may publish the same path and declare different things about the scope — one
`GET /api/v1/organizations` requiring a user and returning theirs, another requiring none and
returning all. Both name the same subject; the path is not what distinguishes them.

### Working across several scopes

A caller that reaches several organizations does not turn the organization into a subject, nor does
it necessarily mean one call per organization. Options include:

- If it is somewhat rare and typically only "a few", then making N calls with a different
  organization in context is probably fine.
- The API may be enhanced to allow the caller to specify what organizations to return data for (e.g.
  `GET /api/v1/users?filter[organization]=123,456,789`).
- An advanced query (standard forthcoming) may be used where the list travels in the body rather
  than the URL.

An operation can also be declared so that supplying less scope means more.

For example, `GET /api/v1/users` called with a user and an organization in context returns every
user within the specified organization, but that _same_ API called with only a user in context might
return every user for every organization the user is a member of. Whether it behaves that way is the
operation's declaration rather than the path's — and the option exists without any of these patterns
putting the organization in the path.
