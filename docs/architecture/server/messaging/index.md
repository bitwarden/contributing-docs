# Messaging

**Audience:** Developers and AI agents designing or implementing communication between services.

Messaging is how services in Bitwarden's
[service-oriented architecture](../../adr/0035-service-oriented-architecture.md) communicate with
each other asynchronously. A service sends a message and carries on, and the services that receive
it act on it in their own time. A service that needs an answer calls the other service's
[API](../apis/index.md) instead.

## Events and commands

There are two kinds of messages: **events** and **commands**. They are used in different ways, and
both are needed.

- An **event** reports something that has already happened to data the publishing service owns, such
  as `organization.deleted`. [Events are published to a topic](./publishing-events.md) the publisher
  owns. Any number of services may subscribe, and each decides for itself what to do. The publisher
  does not know or care if any subscribers exist or when they are added.
- A **command** asks one particular service to do something, such as `send.mail`.
  [Commands are sent to a queue](./sending-commands.md) the receiving service owns. The sender
  decides exactly what is to be done and the receiver carries it out.

## Message processing

Messages must be processed according to these principles:

- **A stable identifier.** A message's identifier is assigned by the sender when it is sent and
  never changes through re-sends, retries, and replays.
- **At least once.** Every message is delivered at least once, and sometimes more than once (though
  this is rare).
- **Duplicates are harmless.** If a duplicate message does arrive, it is either inherently safe to
  repeat (e.g. deleting data that is already gone), or the message's identifier is used to recognize
  the repeat and ignore it.
- **No ordering.** Messages can arrive in any order, so consumers must not assume any particular
  order.

## Sending messages

Services that send messages, whether it is an event or a command, must follow two rules:

1. A message is sent if, and only if, its associated transaction commits.
2. It must be impossible for a service to _fail_ to send a message that should be sent.

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
deletes from this table when the message is sent successfully.

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

## Versioning

Services publishing _events_ define the shape of those events. Likewise, services consuming
_commands_ define the shape of those commands. Naturally, other services will come to depend on
those events and commands looking "just so" so it is incumbent upon services that publish events or
consume commands to not make breaking changes.

- Event publishers must assume consumers will continue to run "old code" for some period of time
  that expects events to look the way they used to.
- Services consuming commands must assume they will receive "old commands" sent by senders running
  old code that send commands that look the way they used to.

We address this by following two rules:

1. **Avoid making breaking changes.** Surprisingly, what constitutes a breaking change depends on
   whether the message is an [event](./publishing-events.md#breaking-changes) or a
   [command](./sending-commands.md#breaking-changes).
2. When breaking changes are unavoidable, establish a formal way to **version** messages so existing
   consumers (and senders) continue to work.

When a breaking change is unavoidable, the owner introduces a new message type with the version in
its name, such as `membership.removed.v2` or `send.mail.v2`, and keeps the old one alongside it
until nothing uses it:

- A publisher publishes both versions until no consumer subscribes to the old one.
- A service that consumes commands accepts both versions until no sender sends the old one.
