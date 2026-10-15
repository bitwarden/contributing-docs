---
sidebar_position: 3
---

# Breaking changes and versioning

APIs `SHOULD NOT` make breaking changes. A breaking change is one that causes a request that is
valid today to be rejected tomorrow, or a response a caller can process today to become
unprocessable. In practice:

- adding a required field, or making an optional field required,
- changing a field's type,
- adding constraints to a field, or
- removing a field from a response.

The keyword is `SHOULD NOT` rather than `MUST NOT` because these are service-to-service APIs and we
own every caller:

- A team `MAY` make a breaking change in place when it can account for every caller, either because
  the change is coordinated with them or because the rejection surfaces where the caller or user can
  act on it.
- Bugs `SHOULD` be fixed in place, even when the fix is technically breaking.
- Otherwise, a breaking change `MUST` be made in a new version of the API, and the old version
  [deprecated](./deprecation.md).

Adding a value to a constrained field is not breaking by this definition, but a generated client
that maps the field to a closed enumeration will fail on a value it has never seen. Consider whether
callers tolerate unknown values before adding one.

Versioning costs a path segment while an API stays at `v1`. In exchange, a contract that needs to
change shape has somewhere to go, instead of making every new field optional so that nothing ever
breaks. The version is in the [path](./api-paths.md) because it is then visible in logs, traces,
routing rules, and `curl` commands, needs no content negotiation, and lets two versions run side by
side behind one host.
