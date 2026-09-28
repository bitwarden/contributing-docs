---
sidebar_position: 4
---

# API paths

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

Paths `SHOULD` be traversable. If `GET /api/v1/users/123/addresses/456` returns the details about
address 456 of user 123, then every parent path `SHOULD` resolve:

- `GET /api/v1/users/123/addresses` should return all addresses of user 123.
- `GET /api/v1/users/123` should return details about user 123.
- `GET /api/v1/users` should return all users.

Organization IDs `SHOULD NOT` appear in the path because "the current organization" is part of the
context of almost every request and, thus, need not be duplicated in the URL path.
