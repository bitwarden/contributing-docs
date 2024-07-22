---
adr: "0022"
status: Accepted
date: 2024-06-21
tags: [server]
---

# 0022 - Server Authorization

<AdrTable frontMatter={frontMatter}></AdrTable>

## Context and Problem Statement

Authorization logic determines who is permitted to carry out actions. Our current authorization
logic is dispersed throughout different layers of our server codebase and follows different
patterns, some of which are no longer suitable for our changing permissions structures.

We should decide on clear rules and patterns for implementing authorization checks on the server.

### Terminology

- **Authentication** is the process of verifying a user's identity. ("Who are you?") It tells you
  who they are, but not what they can access.
- **Authorization** is the process of determining who can access or modify a resource. ("Are you
  allowed to do this?") It may or may not require authentication.
- **Validation** is the process of determining whether a request is valid according to business
  logic. ("Can this be done?") Unlike authorization, it usually does not depend on the user's
  identity (authentication) or permissions (authorization). For example, a vault item cannot be
  restored unless it has first been (soft) deleted.
- **Resources** are data on the server that a user may try to access or modify - such as a vault
  item, organization, or group.

### Current practice

To date, we have broadly used the following authorization models:

- in the individual user context - matching the user id in the JWT to the resource being accessed.
  This is usually a one-to-one match (e.g. the JWT user id should match the cipher user id) without
  additional requirements
- in organizational contexts - role-based authorization, where the user is assigned a role in an
  organization, and permission is granted or denied based on the user's role. This closely tracks
  [how access control is presented to the user](https://bitwarden.com/help/user-types-access-control/).
  However, additional requirements have been added over time which have complicated this otherwise
  simple model

This logic is spread throughout controllers in the API layer, JWT claims accessed via
`CurrentContext`, the core service layer, and database queries. This lacks standardization and makes
it difficult to understand and audit access control logic on any particular controller endpoint.

### Requirements

Our authorization requirements have increased in complexity, particularly with the release of
collection management enhancements. Today, the outcome of an authorization decision in respect of an
organization resource may be determined by a combination of (for example):

- the user's role in the organization, and if they are a custom user, their custom permissions
- whether the user belongs to a managed service provider who manages the organization
- the user's level of access (if any) to a collection
- the collections a vault item is associated with
- the organization's collection management settings
- the organization's enterprise policies

A solution to this problem should:

- separate authorization logic from other concerns
- centralize authorization logic in a single location or pattern
- abstract away implementation details of _how_ an action is authorized from the process of checking
  _if_ an action is authorized
- be reusable between endpoints that access the same resource
- support a range of authorization logic (e.g. based on role, resource, relationships, etc)

## Considered Options

### [ASP.NET resource-based authorization](https://learn.microsoft.com/en-us/aspnet/core/security/authorization/resourcebased?view=aspnetcore-8.0)

**Summary**

Resource-based authorization centers authorization decisions around the **resource** being accessed,
the **user** accessing the resource, and the **operations** (actions) they wish to take on the
resource.

To use resource-based authorization in ASP.NET Core:

- define a set of operations that are permitted on a resource, e.g. create, read, update, delete
- define one or more `AuthorizationHandler` classes for the resource. The handler contains the logic
  to decide whether a user is authorized to perform the specified operation(s) on the resource
- multiple handlers can be defined for different sources of permissions. For example, you may be
  authorized to delete a vault item because it is in your individual vault, or because you have
  access to it via an organization. This logic can be defined in separate handlers to keep each
  handler simple and single-purpose; all handlers will be called before a final result is returned
- our experience to date strongly shows that resources (and therefore handlers) should be defined at
  a fairly granular level. Relationships (e.g. `CollectionUser`) should be considered their own
  resource and defined and checked separately

To perform an authorization check:

- call `AuthorizationService.AuthorizeAsync(user, resource, operations)`. It returns an
  `AuthorizationResult` that indicates a success or failure
- for a success result, at least 1 handler must have authorized the action, and no handler must have
  expressly denied the action

**Advantages**

- included in ASP.NET - standard C# code, no additional dependencies
- already partially in use for organization collections - we would be refining and then expanding
  that use
- handlers provide good encapsulation of authorization logic, separate to other concerns and
  separate to the `AuthorizationService` itself
- the fixed `AuthorizationService` interface (accepting only the user, the resource, and the
  operations) enforces a consistent usage across our internal teams
- flexibly supports additional sources of authorization (e.g. scoped user API keys) by defining
  additional handlers

**Disadvantages**

- performance:
  - the `AuthorizationService` interface requires that the resources are fetched from the database
    before an authorization decision can be made. This makes it impractical for large read
    operations, such as syncing a user's vault, as we cannot realistically fetch _all_ ciphers from
    the database and use `AuthorizationService` filter them. Therefore, some high frequency/high
    cost operations would continue to use authorization logic embedded in database queries
  - additionally, the authorization logic may need to fetch additional data from the database to
    make a decision. This may cause many database reads, particularly when iterating over multiple
    items, unless an additional caching solution is implemented. This is probably manageable for now
    by caching frequently needed data in `CurrentContext` or the handler itself, both of which are
    scoped to the lifetime of the request
- for the reasons above, it is not a complete solution: it would cover _most_ but not all of our use
  cases
- server-side solution only - client-side needs to continue to maintain its own very similar logic
  to determine what UI flows it should show/hide and enable/disable
- an endpoint needs to understand what resources are affected, which can be nuanced when dealing
  with relational data (e.g. saving a vault item may require separate authorization checks for the
  `Cipher` resource and the `CollectionCipher` relationship). However, this is likely to be an issue
  for all solutions - you need to know how to use the interface properly

### [OpenFGA](https://openfga.dev)

**Summary**

OpenFGA is an open-source implementation of Google's Zanzibar authorization system, which is used
for Google Docs. It uses
[Relationship Based Access Control (ReBAC)](https://openfga.dev/docs/modeling/getting-started) which
makes authorization decisions based on a user's relationship to an object (resource):

> Authorization decisions are then yes or no answers to the question: "Does user U have relation R
> with object O?".

OpenFGA requires that you define your authorization scheme (in terms of users, objects, and
relationships) in its DSL. It then maintains its own store of users, objects and relationships from
which authorization decisions can be made. This store must be kept in line with the Bitwarden
database, but it can then be queried very quickly and flexibly.

OpenFGA supports the following queries:

- "check requests" (does user U have relation R with object O?) - for simple authorization checks
- "list objects requests" (get all objects with which user U has relationship R) - for bulk read
  operations
- "list users requests" (get all users that have relationship R with object O)

OpenFGA has a [.NET SDK](https://github.com/openfga/dotnet-sdk) and a
[Javascript SDK](https://github.com/openfga/js-sdk) with Typescript types.

**Advantages**

- strong conceptual foundation - if we go through the exercise of defining our authorization logic
  in the OpenFGA model, we will have a single source of truth and hopefully draw out any issues or
  inconsistencies in our current structure
- designed for complex permission structures, e.g. supports cascading permissions (user has a view
  relationship with a cipher if they have a Can Edit relationship with the collection the cipher is
  in)
- focuses on defining the model upfront, then the checks are extremely simple. Expected to result in
  minimal duplication of logic given that you define a single model, rather than defining many
  authorization handlers (for example)
- OpenFGA queries are more flexible and performant, meaning they could cover all our use cases. In
  particular, it could totally replace authorization logic in the database; instead of performing
  table joins to determine what ciphers to return, the server would query OpenFGA with a "list
  objects request", then fetch the ciphers from the database by their ids only
- a solution for both client and server. Clients could also query the OpenFGA store to determine
  what UI flows are available to the user, without having to duplicate logic
- immutable, versioned authorization models allow for graceful changes to and between authorization
  structures

**Disadvantages**

- additional external dependency that is not easily replaced once installed. However, it is
  supported by the Cloud Native Computing Foundation (itself part of the Linux Foundation), see also
  its [list of adopters](https://github.com/openfga/community/blob/main/ADOPTERS.md)
- new concepts and a DSL unfamiliar to most developers - would probably require a single team to
  become experts in this and maintain it for all teams
- heavy implementation impact on engineering resources:
  - requires remodelling of our authorization logic around OpenFGA concepts
  - BRE/SRE resources to support the OpenFGA deployment and separate database
  - rewrite not just authorization checks, but any write operations (commands) to ensure that the
    OpenFGA store is always kept in step with the Bitwarden database
- probably not compatible with Bitwarden Unified due to resource constraints (assumption only) -
  unclear what would replace it in this case

### Casbin

### Custom Solution

We could use our own custom solution, most likely some variation on resource-based authorization.
This is not seriously proposed but is listed for completeness. It is not clear what advantage this
would have over choosing an existing solution above.

## Decision Outcome

Chosen option: **TBD**.

### Positive Consequences

-

### Negative Consequences

-

### Plan

-
