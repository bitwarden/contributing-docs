# API paths

Notation follows the [APIs index](./index.md#notation).

API paths `MUST` use **lowercase "kebab-case"** and conform as follows:

1. The first one or more elements of the API path `MUST` be a namespace. By default, the namespace
   `SHOULD` be `api`.
2. The next element of the API path `MUST` be the version number starting with `v1`.
3. The next element of the API path `MUST` specify the resource or resources it targets. For
   resource-oriented APIs, this element `SHOULD` be the "resource plural", such as `users`.
   [Bulk-processing](./bulk-operations/index.md) APIs are an exception to this rule.
   - APIs that create resources stop here.
4. If the API targets a specific resource, as an update or delete does, the next element of the API
   path `SHOULD` be the ID of the resource it targets.
5. Additional elements `MAY` be specified to target sub-resources.

**Examples**

```text
/api/v1/users
/api/v1/users/123
/api/v1/users/123/devices
```

Paths `SHOULD` be traversable. If `GET /api/v1/users/123/devices/456` returns the details about
device 456 of user 123, then every parent path would resolve as follows:

- `GET /api/v1/users/123/devices` should return all devices of user 123.
- `GET /api/v1/users/123` should return details about user 123.
- `GET /api/v1/users` should return all users.

Not every parent path has to exist as a callable API, and a caller is not necessarily authorized to
call one that does. Traversable paths show how paths fit together, and how they _would_ resolve if
APIs existed for every parent path.

Each API is versioned independently. The version belongs to the API, not to the path prefix, so
`GET /api/v2/users/123/devices` does not imply that `GET /api/v2/users/123` exists.

:::note

2. The version is in the path because it is then visible in logs, traces, routing rules, and curl
   commands, needs no content negotiation to read, and lets two versions coexist behind one host.
   Header and media-type versioning are both defensible but harder to operate.

:::

## Which identifiers belong in the path

Every request targets a **subject** and runs inside a **scope**:

1. The **subject** is what the request acts on, which is a resource or a collection of resources. It
   `MUST` be named in the path.
2. The **scope** is what the request runs inside - the current organization, the current user. It
   `MUST NOT` be named in the path. It travels as context.

That is the whole of the path rule. A path says what is acted on or fetched. It does not say what a
call returns: which parts of the scope an operation requires, permits or refuses is declared by the
operation, and belongs to authentication and authorization, which a forthcoming standard will cover.

**Examples**

| Path                        | Subject                  |
| --------------------------- | ------------------------ |
| `GET /api/v1/users`         | users                    |
| `GET /api/v1/users/123`     | user 123                 |
| `GET /api/v1/users/current` | the user the scope names |

`current` `SHOULD` be used where the subject is whatever the scope names, rather than repeating an
identifier the caller has already supplied.

Callers `SHOULD` send the current organization and the current user on every request where each
exists. Two services may publish the same path and declare different things about the scope - one
`GET /api/v1/organizations` requiring a user and returning theirs, another requiring none and
returning all. Both name the same subject. The path is not what distinguishes them.

:::note

2. The scope stays out of the path because an identifier in a path is something a caller can try
   other values of, and a path that accepts one must prove on every request that this caller may use
   this value. A scope taken from context is established once, where the caller is authenticated. It
   also keeps one path for a resource that can belong to more than one kind of owner.

:::

## Working across several scopes

A caller that reaches several organizations does not turn the organization into a subject, nor does
it necessarily mean one call per organization. Options include:

- If it is somewhat rare and typically only "a few", then making N calls with a different
  organization in context is probably fine.
- The API may be enhanced to let the caller specify which organizations to return data for, as in
  `GET /api/v1/users?filter[organization]=123,456,789`.
- An [advanced query](./advanced-queries.md) may be used where the list travels in the body rather
  than the URL.

An operation can also be declared so that supplying less scope means more.

For example, `GET /api/v1/users` called with a user and an organization in context returns every
user within the specified organization, but that _same_ API called with only a user in context might
return every user for every organization the user is a member of. Whether it behaves that way is the
operation's declaration rather than the path's - and the option exists without any of these patterns
putting the organization in the path.
