---
adr: "0039"
status: Proposed
date: 2026-10-05
tags: [server, server-sdk]
---

# 0039 - Base API standards on IETF RFCs

<AdrTable frontMatter={frontMatter}></AdrTable>

{/* cspell:ignore CSDL Hydra */}

## Notation

This ADR uses [RFC 2119](https://www.rfc-editor.org/info/rfc2119/) keywords (`MUST`, `MUST NOT`,
`SHOULD`, `SHOULD NOT`, `MAY`) deliberately.

## Context and problem statement

[ADR-0036](./0036-service-to-service-api-standards.md) requires service-to-service APIs to conform
to a comprehensive, documented set of standards. It does not say what those standards are built on:
an existing specification, published design guidelines, a different API technology, or nothing at
all. This ADR decides that. The ADRs that follow set the standards themselves:

- ADR-0040: request, response, and error payloads.
- ADR-0041: contracts and their evolution.
- ADR-0042: creating resources.
- ADR-0043: reading resources.
- ADR-0044: updating and deleting resources.
- ADR-0045: acting upon resources.
- ADR-0046: bulk processing resources.

Authentication and authorization will follow in a later ADR.

Three ground rules keep the comparison fair:

- **Earlier decisions are not criteria.** ADR-0035's OpenAPI requirement and ADR-0036's list of
  topics both assume HTTP resource APIs. Choosing GraphQL or gRPC would mean revising them, and that
  cost is not counted against those options.
- **No option is adopted wholesale.** Each would be adapted, so the choice is what the standards
  start from and borrow from, not whom they defer to. Whatever the starting point, the standards
  state every rule themselves.
- **Every audience counts.** The scope is service-to-service APIs, but each option is judged as if
  it would also serve our own clients and our customers. A second standard for those APIs would mean
  two of everything.

## Decision drivers

1. Answers the common design questions: payloads, errors, querying, paging, concurrency, bulk
   operations, asynchronous work, versioning, and deprecation.
2. Leaves room for a version, so an unavoidable breaking change has somewhere to go.
3. Customer-friendly: callable from any language, from a browser, and with `curl`.
4. Machine-readable contracts and generated clients in C#, Rust, TypeScript, Swift, and Kotlin.
5. The owning service decides what can be queried, because every query it supports has to be indexed
   and authorized.
6. Works through customer-operated proxies on self-hosted installs, and with standard HTTP
   infrastructure.
7. Fits ASP.NET Core and data access that is largely Dapper over stored procedures.

## Considered options

- **Our own standards on IETF RFCs:** write the standards ourselves, and wherever an IETF RFC covers
  a topic, adopt it or record why not.
- **[JSON:API](https://jsonapi.org/):** a published specification for JSON resource APIs, covering
  document shape, errors, and query parameter families.
- **Hypermedia formats:** [HAL](https://datatracker.ietf.org/doc/draft-kelly-json-hal/),
  [Siren](https://github.com/kevinswiber/siren),
  [Collection+JSON](https://github.com/collection-json/spec), and
  [JSON-LD](https://www.w3.org/TR/json-ld11/) with
  [Hydra](https://www.hydra-cg.com/spec/latest/core/). Links and actions let a client discover an
  API at run time.
- **[OData](https://www.odata.org/documentation/):** an OASIS standard with a URL query language
  over a declared entity data model.
- **[GraphQL](https://spec.graphql.org/):** a typed schema and caller-composed queries, usually sent
  to a single endpoint.
- **[gRPC](https://grpc.io/):** Protocol Buffers contracts called over HTTP/2 with binary payloads.
- **[Google AIP](https://google.aip.dev/):** Google's numbered API design guidance, defined in
  Protocol Buffers.
- **[Microsoft Azure REST API Guidelines](https://github.com/microsoft/api-guidelines/blob/vNext/azure/Guidelines.md):**
  Microsoft's guidelines for Azure HTTP APIs.

✅ yes, ❌ no, ⚠️ partly or with qualification.

|                                     | Own on RFCs | JSON:API | Hypermedia | OData | GraphQL | gRPC | AIP | Azure |
| ----------------------------------- | :---------: | :------: | :--------: | :---: | :-----: | :--: | :-: | :---: |
| Answers the common design questions |     ⚠️      |    ⚠️    |     ❌     |  ✅   |   ❌    |  ❌  | ✅  |  ✅   |
| Room for a version                  |     ✅      |    ✅    |     ✅     |  ✅   |   ⚠️    |  ✅  | ✅  |  ✅   |
| Contracts express required fields   |     ✅      |    ✅    |     ✅     |  ✅   |   ✅    |  ⚠️  | ⚠️  |  ✅   |
| Customer-friendly                   |     ✅      |    ✅    |     ✅     |  ⚠️   |   ❌    |  ❌  | ⚠️  |  ✅   |
| Generated clients                   |     ✅      |    ✅    |     ⚠️     |  ⚠️   |   ✅    |  ✅  | ✅  |  ✅   |
| Owner decides what can be queried   |     ✅      |    ✅    |     ✅     |  ⚠️   |   ⚠️    |  ✅  | ⚠️  |  ⚠️   |
| Works through customer proxies      |     ✅      |    ✅    |     ✅     |  ✅   |   ✅    |  ❌  | ⚠️  |  ✅   |
| Works with HTTP infrastructure      |     ✅      |    ✅    |     ✅     |  ✅   |   ❌    |  ⚠️  | ⚠️  |  ✅   |
| Fits our stack                      |     ✅      |    ⚠️    |     ✅     |  ⚠️   |   ✅    |  ✅  | ⚠️  |  ✅   |
| Streaming and push                  |     ❌      |    ❌    |     ❌     |  ❌   |   ✅    |  ✅  | ⚠️  |  ❌   |
| Compact wire format                 |     ❌      |    ❌    |     ❌     |  ❌   |   ❌    |  ✅  | ⚠️  |  ❌   |
| Published origin                    |     ⚠️      |    ✅    |     ⚠️     |  ✅   |   ✅    |  ✅  | ⚠️  |  ⚠️   |

What each row means:

- **Answers the common design questions:** whether the option itself answers the questions every API
  faces, such as payload shape, errors, querying, paging, concurrency, bulk operations, asynchronous
  work, versioning, and deprecation, rather than leaving them to us. ✅ means most are answered, ⚠️
  some, ❌ few.
- **Room for a version:** whether an API can carry a version and introduce a new one when a breaking
  change is unavoidable. GraphQL is ⚠️ because, although versioning is possible, its documentation
  discourages it in favor of additive evolution.
- **Contracts express required fields:** whether a contract can say that a field is always present,
  so contracts do not drift toward every field being optional. proto3 has no required fields, so
  gRPC and AIP can express this only through validation annotations.
- **Customer-friendly:** whether a developer who has never seen Bitwarden can call the API from any
  language, from a browser, and with `curl`, without learning a query language or installing special
  tooling.
- **Generated clients:** whether a machine-readable contract (OpenAPI, a GraphQL schema, or Protocol
  Buffers) can generate typed clients in the languages we ship: C#, Rust, TypeScript, Swift, and
  Kotlin. A JSON:API API is described in OpenAPI like any other HTTP API, so standard generators
  work. Its envelope appears in the generated types unless the generators are configured to hide it,
  which is a question of payload shape, not of whether clients can be generated. Hypermedia formats
  are ⚠️ because their links add little to a generated client, and OData because its contract is
  CSDL, with OpenAPI produced by conversion.
- **Owner decides what can be queried:** whether the owning service controls exactly which fields
  can be filtered, sorted, or expanded, rather than exposing a general-purpose query language over
  every field. This matters because every supported query has to be indexed and authorized.
- **Works through customer proxies:** whether the API works through the proxies and load balancers
  that self-hosted customers operate, which cannot be assumed to support HTTP/2 with trailers end to
  end.
- **Works with HTTP infrastructure:** whether caching, rate limiting, firewall rules, metrics, and
  tracing can work per route and method without understanding request bodies. GraphQL sends
  everything as a `POST` to one endpoint.
- **Fits our stack:** whether the option is well supported on ASP.NET Core and on data access that
  is largely Dapper over stored procedures. JSON:API is ⚠️ because its .NET implementations are
  oriented to controllers and Entity Framework Core, and OData because its ASP.NET Core library
  depends on `IQueryable`.
- **Streaming and push:** whether the option itself supports streaming responses or pushing changes
  to callers.
- **Compact wire format:** whether payloads use an efficient binary encoding rather than JSON text.
- **Published origin:** whether the option comes from a published, adopted specification. ⚠️ means
  guidelines, drafts, or, for our own standards, an RFC per topic where one exists rather than a
  single document.

## Decision outcome

Chosen option: **Our own standards on IETF RFCs**.

- Three options are customer-friendly and leave the query surface entirely to the owning service:
  this one, JSON:API, and the hypermedia formats. The hypermedia formats answer almost none of the
  design questions. JSON:API answers more, but would be departed from in many places. It does not
  cover concurrency or deprecation, and covers asynchronous processing only in non-normative
  recommendations. This option takes RFCs topic by topic and covers those topics through them.
- Where a published standard exists, it is used as published. Where none exists, the standards
  supply their own answer. They are therefore entirely ours without being invented from nothing.
- Good conventions from elsewhere remain available on their merits, with credit, such as JSON:API's
  document shape and query parameters and AIP-136's custom-method syntax.

The rules:

1. The standards `MUST` be self-contained. Every rule is stated in the standards, and no rule is
   incorporated by reference.
2. Where an IETF RFC covers a topic, the standards `SHOULD` adopt it as published. Where they keep
   their own answer instead, they `MUST` record why.
3. Conventions taken from other specifications `SHOULD` be credited to their source.

This decision does not preclude GraphQL or gRPC. A service `MAY` also offer either where it makes
sense, for example GraphQL where callers need to compose data from a richly connected model, or gRPC
on a high-volume path between services. The standards govern the HTTP APIs that services publish,
and a GraphQL or gRPC interface is offered in addition to those, not instead of them.

### Positive consequences

- One set of answers, stated in our own words, with every borrowed rule credited.
- Wherever an RFC exists, a rule rests on an IETF standard that HTTP libraries and tooling already
  understand.
- The owning service keeps control of what can be queried.
- The same standards could later serve client-facing and public APIs without a second design.

### Negative consequences

- Topics with no RFC, such as payload shape, filtering, sorting, paging, and bulk operations, are
  ours to write and maintain.
- No single outside document describes the standards. They are learned from these ADRs.
- Every departure from an RFC needs a recorded reason, and each is a point someone may contest.

### Rejected options

Each of these was rejected as the foundation for the standards. As noted above, GraphQL and gRPC
remain available as additional interfaces.

#### JSON:API

- Full conformance is impractical. Its required media type, `PATCH` as the only way to update, `400`
  for any unrecognized query parameter, and `relationships` objects for references to other
  resources would all be departed from, leaving a long list of deviations from a specification the
  standards would cite.
- It does not cover concurrency or deprecation, and covers asynchronous processing only in
  non-normative recommendations, so those topics would be ours to write anyway.
- Existing .NET implementations are oriented to controllers and Entity Framework Core rather than
  minimal APIs over Dapper.
- Adopting it as the foundation is not needed to use its best ideas. Its document shape and query
  parameter families remain available to the standards on their merits, with credit.

#### Hypermedia formats

- They answer almost none of the common design questions. Beyond links, and an error object in
  Collection+JSON, errors, validation, paging, filtering, sorting, concurrency, bulk operations, and
  long-running operations are all left to us.
- They are built for clients that discover an API at run time. Our clients are generated from a
  contract at build time and already know the operations, so links are weight that generated clients
  do not use.
- None is an adopted API standard. HAL is an individual IETF draft that expired in 2024 without
  being adopted, Siren has not changed since 2020, and JSON-LD is a data format rather than an API
  standard.
- Links, their one distinctive feature, can be added to the standards later if a use for them
  appears.

#### OData

- Its query language reaches every exposed property unless restricted, where the owning service
  needs to control exactly which queries it supports, because each one has to be indexed and
  authorized.

- `$expand` assumes related entities live in the same model. Across service boundaries, they live in
  another service's store.
- Its ASP.NET Core library translates queries to `IQueryable`, which suits Entity Framework but not
  Dapper over stored procedures.
- `$filter` is a string expression language, so building one means concatenating, quoting, and
  escaping strings, which is how injection bugs happen.
- It does not specify API versioning. The `OData-Version` header versions the protocol, not the API.

#### GraphQL

- It discourages versioning. Its documentation "takes a strong opinion on avoiding versioning" in
  favor of additive evolution, the posture that eventually makes every new field optional.
- Customers cannot walk up and use it. Calling it means learning schemas, fragments, variables, and
  nullability.
- The request surface is any traversal the schema allows, so authorization has to be decided per
  field and per path through the graph.
- Every request is a `POST` to one endpoint, so caching, rate limiting, firewall rules, and tracing
  need GraphQL-aware infrastructure, along with query depth and cost limits.
- Mutations have no standard semantics, so create, update, delete, idempotency, concurrency, and
  most other design questions would still be ours.
- Its main strength, caller-composed queries over a richly connected graph, has less to work with
  when each service owns a narrow slice of the data.

#### gRPC

- It is a transport and an interface definition language, not an API design standard. Apart from
  status codes, it does not address paging, filtering, sorting, bulk operations, concurrency, or
  deprecation, so it would still need design guidance alongside it.
- proto3 has no required fields. Required-ness can be expressed only through validation annotations,
  so the contract itself treats every field as optional.
- Customers and browsers cannot call it without extra tooling. Payloads are binary, the command line
  needs specialized tools, and browsers need gRPC-Web and a proxy. Serving them through JSON
  transcoding adds a second surface to document, test, and secure.
- It needs HTTP/2, including trailers, end to end, which cannot be guaranteed through
  customer-operated proxies on self-hosted installs.

#### Google AIP

- It is protobuf-first. The definition is the `.proto` file and its linter works on it, so applied
  to APIs described any other way it loses its tooling and becomes a style guide.
- Its filter grammar (AIP-160) is a string expression language, with the same drawbacks as OData's.
- Errors use `google.rpc.Status`, a Google-specific shape.
- It is written for Google's own APIs, and many proposals assume Google's infrastructure, so we
  would adopt only a subset.

#### Microsoft Azure REST API Guidelines

- They are written for Azure service teams and enforced by Microsoft's own review process, and many
  rules assume Azure infrastructure, such as Resource Manager, Azure SDK conventions, and `x-ms-`
  headers.
- The error envelope is Azure's own.
- Versioning is a dated `api-version` query parameter on every request, built around Azure's release
  process.
- Filter expressions follow OData syntax, a string grammar.
- They are guidelines rather than a specification, revised at Microsoft's discretion.
