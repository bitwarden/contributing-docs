---
sidebar_position: 11.5
sidebar_label: "Server SDK"
---

# Bitwarden.Server.Sdk.Service developer guide

**Audience:** engineers writing a Bitwarden service, and its API, with the server SDK.

How to run a Bitwarden service with `Bitwarden.Server.Sdk.Service`, and write its API with
`Bitwarden.Server.Sdk.Resources`, one topic per page: defining the service, securing it, configuring
it and watching it run, then its resources and the operations on them. New to the package? Start
with
[Getting started](https://github.com/bitwarden/dotnet-extensions/blob/main/extensions/Bitwarden.Server.Sdk.Service/src/PACKAGE.md#getting-started)
in PACKAGE.md.

Each page shows the code to write, compiled against the package, and what you need to know about it:
what the package does for you, what stops the service starting, and what is left to you.

A resource is always served by a service, and `Service` brings `Resources` and calls its entry
points, so the pages on resources build on both. "The package" there means what a service gets from
the two together. Where something comes from `Service` alone, such as the serializer settings or the
documentation UI, the page says so.

The examples share one small service: a `widget-service` whose people keep widgets. A `Widget` has a
`Name` and `Notes` the person encrypts on their device. Types named `Widget...`, such as
`IWidgetStore`, are the service's own.

## Running a service

Defining the service itself, securing it, configuring it and running it.

- [Defining a service](running-a-service/defining-a-service.md): the `Service` class, its hooks, the
  middleware order and the three kinds of service.
- [Authentication and authorization](running-a-service/authentication-and-authorization.md): scopes,
  organization, user and provider requirements, roles, and token audiences.
- [Context](running-a-service/context.md): whom a call between services concerns, and how a service
  knows to believe it.
- [Configuration and self-hosting](running-a-service/configuration-and-self-hosting.md): settings,
  self-hosted installs, feature flags and the config resource.
- [Network and request limits](running-a-service/network-and-request-limits.md): trusted proxies,
  per-address rate limits and browser origins.
- [Outbound HTTP](running-a-service/outbound-http.md): calls guarded against SSRF, and internal TLS.
- [Observability and health](running-a-service/observability-and-health.md): traces, metrics, logs
  and health probes.
- [Caching and extensions](running-a-service/caching-and-extensions.md): a short in-process memo,
  and extending the platform from a package.

## Contracts

How an API is described, addressed, versioned and retired.

- [OpenAPI](contracts/openapi.md): the generated document, the documentation UI, operation
  identifiers and committing the contract.
- [API paths](contracts/api-paths.md): collection and resource paths, which identifiers belong in
  the path, and working across several scopes.
- [Breaking changes and versioning](contracts/breaking-changes-and-versioning.md)
- [Unrecognized fields, query parameters, and headers](contracts/unrecognized-fields-query-parameters-and-headers.md)
- [Deprecation](contracts/deprecation.md)

## Payloads and responses

What goes over the wire, and what a caller gets back.

- [Payload shape](payloads-and-responses/payload-shape.md): resources, the document envelope and
  resource fields.
- [JSON](payloads-and-responses/json.md): dates, enumerations and free-form values.
- [Naming conventions](payloads-and-responses/naming-conventions.md)
- [Standard fields](payloads-and-responses/standard-fields.md): `id`, `type`, `version` and the
  audit fields.
- [Content negotiation](payloads-and-responses/content-negotiation.md)
- [Standard responses](payloads-and-responses/standard-responses.md): the response helpers and
  status codes.
- [Request validation](payloads-and-responses/request-validation.md)
- [Errors](payloads-and-responses/errors.md): the error document and the exceptions that produce it.

## Operations

Creating, reading, changing and deleting resources, and acting upon them.

- [Verbs](operations/verbs.md): the standard attributes and how routes are checked.
- [Creating resources](operations/creating-resources.md)
- [Reading resources](operations/reading-resources.md)
- [Updating resources](operations/updating-resources.md)
- [Partial updates](operations/partial-updates.md)
- [Optimistic concurrency](operations/optimistic-concurrency.md)
- [Deleting resources](operations/deleting-resources.md), including soft deletes.
- [Acting upon resources](operations/acting-upon-resources.md)

## Querying

Reading a collection the way the caller asks.

- [Filtering](querying/filtering.md), including multi-value parameters and ranges.
- [Paging](querying/paging.md): offset and cursor paging.
- [Sorting](querying/sorting.md)
- [Sparse fieldsets](querying/sparse-fieldsets.md)
- [Advanced queries](querying/advanced-queries.md): searches with filter expressions.

## Bulk and asynchronous work

Working on many resources in one request.

- [Bulk operations](bulk-and-asynchronous-work/bulk-operations/index.md)
  - [Targeting](bulk-and-asynchronous-work/bulk-operations/targeting.md)
  - [Per-resource rules](bulk-and-asynchronous-work/bulk-operations/per-resource-rules.md)
  - [All-or-nothing and best-effort](bulk-and-asynchronous-work/bulk-operations/all-or-nothing-and-best-effort.md)
  - [Synchronous and asynchronous](bulk-and-asynchronous-work/bulk-operations/synchronous-and-asynchronous.md)
  - [Bulk responses](bulk-and-asynchronous-work/bulk-operations/bulk-responses.md)
  - [Bulk creates](bulk-and-asynchronous-work/bulk-operations/bulk-creates.md)
  - [Bulk updates](bulk-and-asynchronous-work/bulk-operations/bulk-updates.md)
  - [Bulk replaces](bulk-and-asynchronous-work/bulk-operations/bulk-replaces.md)
  - [Bulk deletes](bulk-and-asynchronous-work/bulk-operations/bulk-deletes.md)
  - [Bulk actions](bulk-and-asynchronous-work/bulk-operations/bulk-actions.md)
- [Jobs](bulk-and-asynchronous-work/jobs.md)

## Working on the packages

Maintaining `Service` or `Resources`, and each package's known limitations, is in its README:
[Service](https://github.com/bitwarden/dotnet-extensions/blob/main/extensions/Bitwarden.Server.Sdk.Service/src/README.md)
and
[Resources](https://github.com/bitwarden/dotnet-extensions/blob/main/extensions/Bitwarden.Server.Sdk.Resources/src/README.md).
Each page here describes what the packages do today.
