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
- **User verification** is a Bitwarden-specific UI flow aimed at re-establishing a user's identity
  before they perform a sensitive action. e.g. entering your password again before viewing an api
  key. This is an aspect of authentication, because it relates to verifying the user's identity

### Current patterns

To date, we have broadly used the following authorization patterns:

- in the individual user context, matching the user ID in the JWT to the resource being accessed.
  This is usually a one-to-one match (e.g. the JWT user id should match the cipher user id) without
  additional requirements
- in organizational contexts, role-based authorization, where the user is assigned a role in an
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
- whether the user belongs to a managed service provider that manages the organization
- the user's level of access (if any) to a collection
- the collections a vault item is associated with
- the organization's collection management settings
- the organization's enterprise policies

A solution to this problem should:

- separate authorization logic from other concerns
- centralize authorization logic in a single location or pattern as much as possible
- abstract away implementation details of _how_ an action is authorized from the process of checking
  whether the action is authorized
- be reusable between endpoints that access the same resource
- support a range of authorization logic (e.g. based on role, resource, relationships, etc)

## Considered Options

### [ASP.NET Core resource-based authorization](https://learn.microsoft.com/en-us/aspnet/core/security/authorization/resourcebased?view=aspnetcore-8.0)

#### Summary

Resource-based authorization makes authorization decisions based on the **resource** being accessed,
the **user** accessing the resource, and the **operations** (actions) they wish to take on the
resource.

To define authorization logic, developers implement one or more `IAuthorizationHandler` classes for
the resource being accessed.

Authorization checks are handled by the default implementation of `IAuthorizationService`, which
calls each authorization handler for the resource to find at least 1 that will authorize the action.

#### Advantages

- included in ASP.NET - standard C# code, no additional dependencies
- already used by Secrets Manager and for some collection operations in Password Manager
- handlers provide good encapsulation of authorization logic, separate to other concerns and the
  `AuthorizationService` implementation itself
- the fixed `AuthorizationService` interface (accepting only the user, the resource, and the
  operations) enforces a consistent usage across our internal teams
- teams can write and have code ownership over their own authorization handlers
- flexibly supports additional sources of authorization (e.g. scoped user API keys) by defining
  additional handlers

#### Disadvantages

- the interface works well for discrete resources (e.g. when specifying IDs or a set of IDs), but
  less well for bulk read operations (e.g. reading all items the user has access to). Bulk read
  operations are likely to duplicate some of the authorization logic in another class or database
  query
- server-side solution only - client code needs to maintain its own logic to enable/disable UI flows
  (although given the offline requirements of our clients, this is difficult to avoid)
- we need to be mindful of database calls within authorization handlers, as they may be called in a
  loop for each resource being authorized

### Third party solution

Third party solutions include:

- [OpenFGA](https://openfga.dev), an open-source implementation of Google's Zanzibar authorization
  system (used in Google Docs)
- [Casbin](https://casbin.org/), an open-source authorization library supporting a variety of
  different models

Each has its own domain-specific language (DSL) used to define authorization rules as well as a
storage layer to store access information about the users and objects in the application. The
storage is (most commonly) a separate database to the Bitwarden database and must be kept up-to-date
with users' roles and relationships in Bitwarden.

#### Advantages

- the DSLs appear to be a flexible and robust way to define an authorization model
- support for complex permission structures
- reduces load on the Bitwarden database, designed for high performance
- single source of truth, strongly separated from our application logic

#### Disadvantages

- vendor lock-in for a core part of our architecture
- new concepts and a DSL unfamiliar to most developers - would probably require a single team to
  become experts in this and maintain it for all teams, which does not work well with our team
  structure
- very costly to implement in terms of engineering resources, particularly for developers, BRE and
  SRE
- risk of the authorization data store becoming out of step with the main Bitwarden database
- may be overkill for our requirements

### Custom Solution

We could develop our own custom solution from scratch, however we have not identified any clear
advantage over choosing an existing solution above.

## Decision Outcome

Chosen option: **ASP.NET Core resource-based authorization**.

### Positive Consequences

- lowest cost/effort implementation
- fits team structure
- existing code can be refactored incrementally

### Negative Consequences

- some duplication of read logic between discrete reads and bulk reads

### Plan

- See the [Authorization deep dive](../deep-dives/authorization.md) for implementation details and
  examples.