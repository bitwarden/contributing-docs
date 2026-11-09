---
sidebar_position: 1
---

# Publishing events

## Event topics

Every service that publishes one or more events has exactly one event topic, `{service}.events`, to
which all of its events are published. Other services `MUST NOT` be able to send to it.

```mermaid
flowchart LR
  org["Organization Service"]
  t_org[["organization.events"]]
  org -->|"events"| t_org
```

## Subscribing

A service subscribes to each event type it consumes with a subscription of its own: **one
subscription per event type**. The broker does the filtering, so a service never receives an event
type it has not subscribed to, and a burst of one type never holds up another.

```mermaid
flowchart LR
  org["Organization Service"]
  t_org[["organization.events"]]
  s1(["subscription: organization.deleted"])
  s2(["subscription: membership.removed"])
  vault["Vault Service"]
  org -->|"organization.deleted"| t_org
  org -->|"membership.removed"| t_org
  t_org --> s1
  t_org --> s2
  s1 --> vault
  s2 --> vault
```

- The Vault Service consumes two event types, so it has two subscriptions.
- Only the Vault Service may read from them.

## Naming

Events `SHOULD` be named in the past tense, for what happened, such as `user.deleted`.

## Breaking changes

A publisher `MUST NOT` make a breaking change to an event type it already publishes, except to fix a
[bug](./index.md#versioning).

The publisher owns an event's contract and writes the event, so a change is breaking when the
publisher stops sending something that subscribers that have not yet deployed rely on.

These changes are breaking:

- Changing a field's type, format, meaning, or units.
- Renaming a required field.
- Removing a required field.
- Making a required field optional.

These changes are not:

- Adding a field, required or optional.
- Making an optional field required.
- Adding a constraint to a field.
- Removing an optional field.

When a breaking change is unavoidable, the publisher introduces a new version of the event type, as
[Versioning](./index.md#versioning) describes.
