---
sidebar_position: 33
---

# Frequently asked questions

> Why JSON:API?

We believe an established standard, with thoughtful answers to every API question, will be more
robust than any standard we might invent ourselves. It is widely adopted among some of the largest
SaaS vendors in the industry including [Datadog](https://docs.datadoghq.com/api/latest).

We adopt the standard selectively, however, to get most of the benefits of JSON:API without the
burden of full conformance.

> Why is there an envelope? Can't the API just return the object?

1. The envelope gives pagination, counts, and other response metadata somewhere to live that is not
   mixed in with the resource itself.
1. It is a serialization concern, not a programming model concern. Handlers take and return plain
   model classes; how those serialize is the framework's business. No application code should ever
   see `data` or `attributes`.

> Why are service-to-service APIs versioned? Public APIs aren't.

We feel strongly that service-to-service APIs should be formally versioned. Without formal
versioning, every change must be additive, which means the shape can never change and every new
field is optional. Contracts constrained like that get weaker over time, and what we _want_ to
express eventually cannot be expressed, because we have committed ourselves to "additive changes
only". This rules out adopting the existing public API conventions, which are expressly unversioned.

> Why do I have to specify the ID in the path _and_ the JSON body?

1. So that the JSON is comprehensive and self-describing.
1. Establishing just one rule to "always include it" is easier to remember than multiple rules for
   when it is required and when it is not required.

> Why do I have to specify the type? You can infer that from the URL path.

1. So that the JSON is comprehensive and self-describing.
1. Establishing just one rule to "always include it" is easier to remember than multiple rules for
   when it is required and when it is not required.

> Why should empty strings be treated like `null`?

A system where `""` and `null` mean two different things requires every caller, every service, and
every database column to agree on the distinction. This can be a challenge to preserve as data gets
serialized to and from various representations across various languages and, in our experience, this
is one class of bug that can be entirely eliminated by just treating them the same.

> Why shouldn't we support partial updates?

1. `PUT` with completely-replace semantics is simpler to implement and far more common.
1. UI teams tend to prefer read-modify-write semantics which works well with `PUT`.
1. Services that support `PATCH` frequently have to _also_ support `PUT` which creates two endpoints
   to do the same thing.
1. It is hard to tell the difference between "null this field out" vs. "do not update this field".

To be clear, teams _can_ support partial updates. We just think you will be better served by just
sticking to simple updates.

> How do I support just adding or removing an element from a collection?

You `MAY` implement the [JSON Patch](https://www.rfc-editor.org/info/rfc6902/) specification, which
was designed for exactly this. However, we think an [action](./acting-upon-resources.md) works just
as well and is simpler:

```
POST /api/v1/groups/62bed180-1f78-45d4-8a56-c996936a2947/actions/add-collection
```

> Why are we standardizing on JSON Logic instead of OData?

1. OData's `$filter` is a string expression language, so both building and parsing it require string
   handling where JSON is already right there.
1. Composing a filter by concatenating strings means quoting and escaping, which is how injection
   bugs happen. Composing a JSON object does not.
1. OData brings a great deal more than filtering — metadata documents, `$expand`, batch, its own
   conventions — and we only want the filtering.

> Why not JSON:API's Atomic Operations extension?

It solves a different problem. Atomic Operations runs a heterogeneous list of operations — create
this, update that, delete the other — as one transaction. Our bulk operations apply one operation to
many resources, and need best-effort and asynchronous execution, which the extension does not offer.

> Why not `207 Multi-Status` for best-effort results?

`207` comes from WebDAV and carries an XML body by definition. Callers already have to inspect
`meta.failedCount` and `errors` to learn which resources failed, so a distinct status code adds
nothing but another case to handle.
