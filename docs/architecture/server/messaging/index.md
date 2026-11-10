# Messaging

**Audience:** Developers and AI agents designing or implementing communication between services.

Messaging is how services in Bitwarden's
[service-oriented architecture](../../adr/0035-service-oriented-architecture.md) communicate with
each other asynchronously. A service sends a message and carries on, whether or not the services
that receive it are running, and they act on it in their own time. A service that needs an answer,
or needs to know that the recipient received its request, calls the other service's
[API](../apis/index.md) instead.

## Notation

The keywords `MUST`, `MUST NOT`, `SHOULD`, `SHOULD NOT`, and `MAY` are to be interpreted as
described in [RFC 2119](https://www.rfc-editor.org/info/rfc2119/).

Text in braces, such as `{service}`, is a placeholder for a value.

## Events and commands

There are two kinds of messages: **events** and **commands**. They are used in different ways, and
both are needed.

- An **event** reports something that has already happened to data the publishing service owns, such
  as `organization.deleted`. [Events are published to a topic](./publishing-events.md) the publisher
  owns. Any number of services `MAY` subscribe, and each decides for itself what to do. The
  publisher does not know or care if any subscribers exist or when they are added.
- A **command** asks one particular service to do something, such as `send.mail`.
  [Commands are sent to a queue](./sending-commands.md) the receiving service owns. The sender
  decides exactly what is to be done and the receiver carries it out. The sender does not wait for
  any confirmation that the action took place or even that the intended recipient received the
  command. The receiving service does not need to be running when the command is sent; the command
  waits in its queue until it is. This is what a command offers that an API call does not.

## Message processing

Messages `MUST` be processed according to these principles:

- **A stable identifier.** A message's identifier is assigned by the sender when it is sent and
  never changes through re-sends, retries, and replays.
- **At least once.** Every message is delivered at least once, and sometimes more than once (though
  this is rare).
- **Duplicates are harmless.** If a duplicate message does arrive, it is either inherently safe to
  repeat at any time (e.g. deleting data that is already gone), or the message's identifier is used
  to recognize the repeat and ignore it. Work that sets a value, such as a member's role, is not
  inherently safe to repeat, since a late repeat can overwrite a newer value.
- **No ordering.** Messages can arrive in any order, so consumers `MUST NOT` assume any particular
  order. A consumer that keeps its own copy of another service's data `MUST` be able to recognize a
  stale message, either from a revision the sender includes in the message or by reading the current
  state from the owner's API.

## Sending messages

Services that send messages, whether it is an event or a command, `MUST` follow two rules:

1. A message is sent if, and only if, its associated transaction commits.
2. It `MUST` be impossible for a service to _fail_ to send a message that should be sent.

Before we look at the pattern that helps us comply with these rules, let's take a quick look at how
messaging works without one.

### How not to send a message

The pseudo-code examples below illustrate the problems with sending messages directly.

```sql
PublishEvent("organization.deleted", orgId)
BEGIN TRAN
DELETE FROM ORGANIZATION WHERE ID = {orgId}
COMMIT TRAN // may fail here, but the message has already been sent
```

```sql
BEGIN TRAN
DELETE FROM ORGANIZATION WHERE ID = {orgId}
PublishEvent("organization.deleted", orgId)
COMMIT TRAN // may fail here, but the message has already been sent
```

```sql
BEGIN TRAN
DELETE FROM ORGANIZATION WHERE ID = {orgId}
COMMIT TRAN
PublishEvent("organization.deleted", orgId) // the broker may be temporarily unreachable
```

### Transactional outbox

The "transactional outbox" pattern is used to guarantee that:

- No message is sent if the transaction fails.
- No message fails to be sent if the transaction succeeds.

**Here's how it works:** Instead of sending the message directly, the service writes the message to
an "outbox" table in its own database, _in the same transaction_ as the associated change. If the
transaction fails, the message never gets written to the table. Meanwhile, a lightweight background
task periodically polls this table for any messages to send, sends them to the broker, and only
deletes from this table when the message is sent successfully. This is one reason messages are sent
_at least_ once rather than _exactly_ once: the database transaction cannot include the broker, so a
service that stops after sending a message but before deleting it sends the message again.

```sql
BEGIN TRAN
DELETE FROM ORGANIZATION WHERE ID = {orgId}
INSERT INTO OUTBOX ...
COMMIT TRAN // everything either succeeds or fails here
```

:::info

The pseudo-code above is for illustration only. In practice, the
`Bitwarden.Server.Sdk.MessageBroker` package does this for you.

:::

[Learn more about the transactional outbox pattern](https://microservices.io/patterns/data/transactional-outbox.html)

## Message contents

A message is copied to the sender's outbox table, to the broker, and to any retry or dead-letter
queue, and each copy has its own access and retention. A message therefore carries identifiers and
the minimum facts the receiver needs:

- A message `MUST NOT` carry Vault Data, Authentication Tokens, key material, or other secrets, such
  as a two-factor code or a master password hint.
- Outbox rows and dead-letter queues `MUST` be readable only by the service that owns them, and
  `SHOULD` be kept no longer than needed to deliver the message or investigate its failure.

## Versioning

Services publishing _events_ define the shape of those events. Likewise, services consuming
_commands_ define the shape of those commands. Naturally, other services will come to depend on
those events and commands looking "just so" so it is incumbent upon services that publish events or
consume commands to not make breaking changes.

- Event publishers `MUST` assume consumers will continue to run "old code" for some period of time
  that expects events to look the way they used to.
- Services consuming commands `MUST` assume they will receive "old commands" sent by senders running
  old code that send commands that look the way they used to.

We address this by following two rules:

1. **Avoid making breaking changes.** Surprisingly, what constitutes a breaking change depends on
   whether the message is an [event](./publishing-events.md#breaking-changes) or a
   [command](./sending-commands.md#breaking-changes).
2. When breaking changes are unavoidable, establish a formal way to **version** messages so existing
   consumers (and senders) continue to work.

When a breaking change is unavoidable, the owner adds a new version of the message, not a new
message type. The sender puts every version it supports into one message, and the receiver reads the
newest version it understands and ignores the rest. The message type, such as `membership.removed`,
does not change, so subscriptions and queues do not change either.

For example, suppose version 1 of `membership.removed` gives `removedAt` in seconds since the Unix
epoch, and version 2 changes it to an ISO 8601 timestamp. Until version 1 is retired, the publisher
sends both versions in one message:

```json
[
  {
    "$type": "v2",
    "membershipId": "5d0c8b9e-2f4a-4c1e-9b7a-1e2f3a4b5c6d",
    "organizationId": "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
    "removedAt": "2026-11-03T12:00:00Z"
  },
  {
    "$type": "v1",
    "membershipId": "5d0c8b9e-2f4a-4c1e-9b7a-1e2f3a4b5c6d",
    "organizationId": "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
    "removedAt": 1793707200
  }
]
```

A consumer built before version 2 existed reads `v1` and ignores `v2`. A consumer that knows version
2 reads `v2`. Each consumer upgrades on its own schedule, and messages already waiting in its
subscription contain the version it reads after the upgrade.

Adding a version is not a breaking change, but removing one is. Either side of a message may upgrade
first, so the rules apply to both sides:

- A publisher of an event `MUST NOT` stop sending a version while any consumer still reads only that
  version.
- A consumer of an event `MUST NOT` stop accepting a version while any publisher still sends only
  that version.
- A service that consumes commands `MUST NOT` stop accepting a version of a command while any sender
  still sends only that version.
- A service that sends commands `MUST NOT` stop sending a version of a command while the receiver
  still reads only that version.

`Bitwarden.Server.Sdk.MessageBroker` packs and unpacks the versions and reports which version each
consumer reads, so an owner can tell when an old version is no longer needed.

Bugs, however, including security issues, `MUST` be fixed "in place", without adding a new version,
even if the changes would technically be considered breaking changes. For example, an event found to
carry a field it should not is fixed by removing that field from every version of the event.
