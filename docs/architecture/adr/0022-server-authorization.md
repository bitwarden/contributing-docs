---
adr: "0022"
status: Proposed
date: 2024-07-22
tags: [server]
---

# 0022 - Authorization

<AdrTable frontMatter={frontMatter}></AdrTable>

## Context and Problem Statement

Authorization logic decides whether a user is permitted to carry out an action. Our current
authorization logic is dispersed throughout different layers of our server codebase and follows
different patterns, some of which are no longer suitable for our changing permissions structures.

We should decide on a single, consistent solution to how we manage authorization in our
applications. This is primarily concerned with the main Bitwarden server and client code (including
Password Manager, Admin Console and Provider Portal) but could be extended to other products.

### Terminology

- **Authentication** is the process of verifying a user's identity. ("Who are you?") It tells you
  who they are, but not what they can do
- **Authorization** is the process of determining who can access or modify a resource. ("Are you
  allowed to do this?") It may or may not require authentication
- **Validation** is the process of determining whether a request is valid according to business
  logic. ("Can this be done?") Unlike authorization, it usually does not depend on the user's
  identity (authentication) or permissions (authorization). For example, a vault item cannot be
  restored unless it has first been (soft) deleted
- **Resources** are data on the server that a user may try to access or modify - such as a vault
  item, organization, collection, or group

### Current practice

To date, we have broadly used the following authorization models:

- in the individual user context - matching the user id in the JWT to the resource being accessed.
  This is usually a one-to-one match (e.g. the JWT user id should match the cipher user id) without
  additional requirements
- in organizational contexts - role-based authorization, where the user is assigned a role in an
  organization, and permission is granted or denied based on the user's role. This closely tracks
  [how access control is presented to the user](https://bitwarden.com/help/user-types-access-control/).
  However, the expansion of collections has complicated this simple model, and it now looks more
  like
  [attribute-based access control](https://en.wikipedia.org/wiki/Attribute-based_access_control)

This logic is spread throughout controllers in the API layer, JWT claims accessed via
`CurrentContext`, the core service layer, and database queries. This lacks standardization and makes
it difficult to understand and audit authorization logic.

### Requirements

Our authorization requirements have increased in complexity, particularly with the release of
collection management enhancements. Today, the outcome of an authorization decision in respect of an
organization resource may be determined by a combination of (for example):

- the user's role in the organization, and if they are a custom user, their custom permissions
- whether the user belongs to a managed service provider and (in turn) that MSPs relationship to the
  organization
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
- support a range of authorization logic (e.g. based on role, resource, relationships, etc), noting
  that this may change again in the future

## Considered Options

### [ASP.NET resource-based authorization](https://learn.microsoft.com/en-us/aspnet/core/security/authorization/resourcebased?view=aspnetcore-8.0)

#### Summary

Resource-based authorization centers authorization decisions around the **resource** being accessed,
the **user** accessing the resource, and the **operations** (actions) they wish to take on the
resource.

To use resource-based authorization in ASP.NET Core:

- you define a set of operations that are permitted on a resource, e.g. create, read, update, delete
- you implement one or more `IAuthorizationHandler` classes for the resource. The handler contains
  the logic to decide whether a user is authorized to perform the specified operation(s) on the
  resource
- multiple handlers can be defined for different sources of permissions. For example, you may be
  authorized to delete a vault item because it is in your individual vault, or because you have
  access to it via an organization. The individual user logic can be defined in a separate handler
  to the organizational logic, to keep each handler simple and single-purpose; all handlers will be
  called before a final result is returned
- our experience to date strongly shows that resources (and therefore handlers) should be defined at
  a fairly granular level, probably reflecting database entities. Relationships (e.g.
  `CollectionUser`) should be considered their own resource and defined and checked separately

To perform an authorization check:

- call `AuthorizationService.AuthorizeAsync(user, resource, operations)`. It returns an
  `AuthorizationResult` that indicates a success or failure
- for a success result, at least 1 handler must have authorized the action, and no handler must have
  expressly denied the action

#### Advantages

- included in ASP.NET - standard C# code, no additional dependencies
- already partially in use for organization collections - we would be refining and then expanding
  that use
- handlers provide good encapsulation of authorization logic, separate to other concerns and the
  `AuthorizationService` implementation itself
- the fixed `AuthorizationService` interface (accepting only the user, the resource, and the
  operations) enforces a consistent usage across our internal teams
- teams can write and have code ownership over their own handlers
- flexibly supports additional sources of authorization (e.g. scoped user API keys) by defining
  additional handlers

#### Disadvantages

- performance:
  - the `AuthorizationService` interface requires that the resources are fetched from the database
    before an authorization decision can be made. This makes it impractical for large read
    operations, such as syncing a user's vault, as we cannot realistically fetch _all_ ciphers from
    the database and use `AuthorizationService` filter them. Therefore, some high frequency/high
    cost operations would continue to use authorization logic embedded in database queries
  - the authorization handlers may need to fetch additional data from the database to make a
    decision. This may cause many database reads, particularly when iterating over multiple items,
    unless an additional caching solution is implemented. This is probably manageable for now by
    caching frequently needed data in `CurrentContext` or the handler itself, both of which are
    scoped to the lifetime of the request
- for the reasons above, it is not a complete solution: it would cover _most_ but not all of our use
  cases
- server-side solution only - client code (particularly in Admin Console) needs to continue to
  maintain its own duplicate logic to determine what UI flows it should show/hide and enable/disable
- a server endpoint needs to understand what resources are affected, which can be nuanced when
  dealing with relational data (e.g. saving a vault item may require separate authorization checks
  for the `Cipher` resource and the `CollectionCipher` relationship). However, this may be an issue
  for other solutions as well, as our endpoints often update multiple resources at once

### [OpenFGA](https://openfga.dev)

#### Summary

OpenFGA is an open-source implementation of Google's Zanzibar authorization system, which is used
for Google Docs. It uses
[Relationship Based Access Control (ReBAC)](https://openfga.dev/docs/modeling/getting-started) which
makes authorization decisions based on a user's relationship to an object (resource):

> Authorization decisions are then yes or no answers to the question: "Does user U have relation R
> with object O?".

To start using OpenFGA:

- you define your authorization scheme (in terms of users, objects, and relationships) in its DSL
- you seed the OpenFGA store (database) with your current users, objects, and relationships, which
  it will use to make authorization decisions
- you keep the OpenFGA store up-to-date with any changes in your underlying data (e.g. as users are
  added and removed). Changes to the Bitwarden database _do not_ automatically update the OpenFGA
  store

OpenFGA then supports the following queries:

- "check requests" (does user U have relation R with object O?) - for simple authorization checks
- "list objects requests" (get all objects with which user U has relationship R) - for bulk read
  operations
- "list users requests" (get all users that have relationship R with object O)

OpenFGA has a [.NET SDK](https://github.com/openfga/dotnet-sdk) and a
[Javascript SDK](https://github.com/openfga/js-sdk) with Typescript types.

#### Advantages

- strong conceptual foundation - if we go through the exercise of defining our authorization logic
  in the OpenFGA model, we will have a single source of truth and hopefully draw out any issues or
  inconsistencies in our current structure
- designed for complex permission structures, e.g. supports cascading permissions (user has a view
  relationship with a cipher if they have a Can Edit relationship with the collection the cipher is
  in)
- focuses on defining the model upfront, then the checks are extremely simple (because it's just
  checking the existence of relationships). This is expected to result in minimal duplication of
  logic given that you define a single consistent model, rather than defining many authorization
  handlers (for example)
- queries are more flexible and performant and are expected to cover all our use cases:
  - no need to fetch the resource from the database in advance, just pass ids
  - it could totally replace authorization logic in the database; instead of performing table joins
    to determine what ciphers a user has access to, the server would query OpenFGA with a "list
    objects request", then fetch the ciphers from the database by their ids only
- a solution for both client and server. Clients could also query the OpenFGA store to determine
  what UI flows are available to the user, without having to duplicate logic
- could enable more powerful reporting/dashboard features and logging/audit trails in our products
  because we can easily determine at any time who has access to what. This is a pain point today as
  new reports can require complex database queries that necessitate a detailed understanding of how
  user permissions are represented in our relational database
- immutable, versioned authorization models allow for graceful changes to and between authorization
  structures

#### Disadvantages

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
  unclear what would replace it in this case (more research required if we are considering this
  option)

### Casbin

// TODO

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
