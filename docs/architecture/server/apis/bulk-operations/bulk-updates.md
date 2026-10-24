# Bulk updates

Notation follows the [APIs index](../index.md#notation).

Bulk updates apply the same change to every targeted resource.

- `update` `MUST` be present and holds the fields being changed.
- `update` has [partial update](../partial-updates.md) semantics: an absent field is not changed and
  an explicit `null` clears the value. This holds even on services that do not otherwise offer
  `PATCH`.
- `update` `MUST` contain only fields the single-resource update accepts. A request whose `update`
  names a read-only field `MUST` be rejected with `422`. A single-resource update ignores read-only
  fields because the caller sends back the whole resource it read. In a bulk update, the caller
  names only the fields it wants changed, so a read-only field there is a request that cannot be
  honored.
- The single-resource update rules `MUST` be applied to each resource, both as it is and as it would
  be after the change.
- Bulk updates do not check [version](../optimistic-concurrency.md), but `MUST` increment it on
  every resource they change. A request whose `update` includes `version` `MUST` be rejected with
  `422`.

The semantics of `update` are credited to [RFC 7396](https://www.rfc-editor.org/info/rfc7396/) JSON
Merge Patch, with the departure described under
[partial updates](../partial-updates.md#where-we-depart-from-an-rfc).

A bulk update is never a way around an action. A field that changes only through actions, typically
a status whose transitions are governed by business rules, is read-only, and so cannot be set by a
bulk update. Changing it for many resources is a bulk action, such as
`POST /api/v1/users:bulk-disable`, which applies the action's transition rules to each resource.

**Example**

```http
POST /api/v1/users:bulk-update
Accept: application/json
Content-Type: application/json
```

```json
{
  "filter": {
    "in": [{ "var": "culture" }, ["en", "en-us"]]
  },
  "update": {
    "culture": "en-US"
  }
}
```
