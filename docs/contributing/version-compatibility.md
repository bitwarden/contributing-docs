---
sidebar_position: 14
---

# Version Compatibility

Bitwarden's multi-client portfolio and flexible hosting model makes version compatibility between
our clients and our server APIs more complex and more important than a single web application and
its corresponding API.

Users don't update their clients right away, and self-hosted organizations update their servers on
their own schedule, so the client and the server on either end of a request are not necessarily the
same version.

The compatibility policy can be stated as follows:

- **Server backward and forward compatibility:** Every **server** release has to work with
  **clients** that are up to two months older or newer than it.
- **Client backward and forward compatibility:** Every **client** release has to work with
  **servers** that are up to two months older or newer than it.

This page explains how that window works, how to tell when old behavior can be removed, and what it
means for server, client, and SDK code.

:::info Customer commitment

The customer-facing commitment behind this page is
[Bitwarden software release support](https://bitwarden.com/help/bitwarden-software-release-support/).

:::

## Interpreting a release and its compatibility window

Versions are formatted as `YYYY.MM.XX`: year, month, then patch. Only the year and month matter for
compatibility. Patch releases never change what a version is compatible with.

A server release supports clients from two months before it through two months after it. For
example, server `2026.1` supports:

| **Client version** | **Supported?** |
| ------------------ | -------------- |
| `2025.10`          | No             |
| `2025.11`          | Yes            |
| `2025.12`          | Yes            |
| `2026.1`           | Yes            |
| `2026.2`           | Yes            |
| `2026.3`           | Yes            |
| `2026.4`           | No             |

Clients follow the same rule in reverse: client `2026.1` supports servers from `2025.11` through
`2026.3`. Count months across the year boundary, so `2025.12` and `2026.1` are one month apart.

Each side's obligation protects a different group of users:

- **Servers supporting older clients protects people who haven't updated.** Clients stay installed
  long after the server updates. The cloud server is always on the latest version, so it sees every
  client in its window.
- **Clients supporting older servers protects self-hosted organizations.** A self-hosted server can
  be two months behind the clients its users install.

## When you can introduce breaking changes

As a general rule, you can remove old behavior and thereby introduce breaking changes **three months
after the last release that depends on it**. Three months is the two-month window plus one, so by
then every version that still needed the old behavior has aged out.

To find that release:

1. Identify the surface expectant of the old behavior. For a server change, that means every
   client - desktop, extension, CLI, and our mobile apps.
2. For each one, find the last release that still depends on it.
3. Take the latest of those releases and add three months.

| **Last release that depends on it** | **Earliest release that can remove it** |
| ----------------------------------- | --------------------------------------- |
| `2025.6.1`                          | `2025.9.0`                              |
| `2025.11.0`                         | `2026.2.0`                              |
| `2025.12.2`                         | `2026.3.0`                              |

### Determining when changes are in deployed code

**Release tags are the source of truth for which release contained behavior.** Always work from
release tags, not from the release calendar, as it's the source of truth. Which clients ship in a
given release varies, and each client releases on its own. If the dependency is gone from `main` but
hasn't shipped yet, you can't start counting.

| **Repository** | **Tag format**              | **Example**         |
| -------------- | --------------------------- | ------------------- |
| `server`       | `v<YYYY>.<M>.<patch>`       | `v2026.1.0`         |
| `clients`      | `<app>-v<YYYY>.<M>.<patch>` | `browser-v2026.1.0` |

In `clients`, `<app>` is `web`, `browser`, `desktop`, or `cli`.

## Managing compatibility on the server

The cloud server sees every client in its window, so the server has to keep serving a two-month-old
client exactly the way that client expects.

Server changes fall into two groups. **Shape changes** alter the contract of a request or response,
and every client sees the same shape. **Behavior changes** alter what the server does within that
contract, and can be gated by client version in cloud. See
[Gating behavior by client version](#gating-behavior-by-client-version).

Listed below are some representative changes, and how the server code would be expected to handle
them.

### Shape changes

| **Change**                         | **What to do**                                                                                                        |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Add an endpoint                    | No compatibility impact.                                                                                              |
| Add a property to a response       | No compatibility impact.                                                                                              |
| Add a property to a request        | Make it optional, with a default that keeps the old behavior.                                                         |
| Change a property's type or format | Add a new property instead. Remove the old one three months after the last client that reads or sends it.             |
| Remove or rename a property        | Wait three months after the last client that reads or sends it.                                                       |
| Remove an endpoint                 | Wait three months after the last client that calls it. Mark it `[Obsolete]` once its last caller is gone from `main`. |
| Remove a feature flag              | Wait three months after the last client that still checks it. See [Feature flags](#feature-flags).                    |

### Behavior changes

Each of these waits three months after the last client that can't handle the change, unless it is
gated by client version.

| **Change**                                                      | **Can be gated by client version?**                         |
| --------------------------------------------------------------- | ----------------------------------------------------------- |
| Send a new enum value in a response                             | Yes.                                                        |
| Tighten validation on a request                                 | Yes.                                                        |
| Change what a property's value means, without changing its type | Yes.                                                        |
| Change what an endpoint does                                    | Yes.                                                        |
| Change an error response or status code                         | Yes.                                                        |
| Change the values in an identity token response                 | Yes.                                                        |
| Add an authentication or authorization requirement              | No. Security requirements can't be gated by client version. |

The same rules apply to the other ways the server talks to clients. Treat a new push notification
type like a new enum value, and a change to a notification payload or an identity token response
like a change to any other response.

Database schema changes follow a separate rule. See
[Evolutionary database design](./database-migrations/edd.mdx), which keeps the schema working for
both the old and new server during a deployment.

### Gating behavior by client version

You may want to introduce behavior or response data on the server that only applies for
corresponding client versions and above. Normally, you'd have to wait three months to do so after
releasing it in the clients, so that all compatible clients are able to absorb this new behavior.

To prevent this delay in cloud, use a feature flag, gated in LaunchDarkly by client version when
rolled out.

You should **not** condition on `ICurrentContext.ClientVersion`, as that scatters version checks
throughout the code.

The rule is: **behavior that only affects the requesting client can be gated by client version. The
shape of a request or response can't.**

A request or response shape is a static contract. Property names, types, and whether a property is
required are defined once in the server's models and published in the OpenAPI spec that the SDK's
bindings are generated from. There is only one schema, so a flag can't give one client a different
shape. Behavior is decided per request, so a flag can choose which values to send, which validation
to apply, or which status code to return.

Some behavior can be flagged but shouldn't be gated by client version, because it reaches more than
the requesting client or because the version can't be trusted:

- **Security requirements.** The `Bitwarden-Client-Version` header comes from the client, so an
  attacker can send an old version to skip a requirement. Security requirements follow the
  three-month rule.
- **Push notifications.** Notifications go to every device on the account, not to the client that
  made a request.
- **Data other clients read.** The readers never check the flag. See
  [Writing a new data format](#writing-a-new-data-format).

Gating by client version also only shortens the wait in cloud. Self-hosted servers don't have
LaunchDarkly, so the flag is off there. Self-hosted servers get the new behavior when the flag is
removed from server code, and that removal still has to wait three months after the last client that
can't handle the change.

### Restricting obsolete client login

In general, we do not _prevent_ someone from using an obsolete client; we just don't guarantee it
will work as expected, as API contracts may change.

However, sometimes an old client can damage the user's data, for example by writing a vault item in
a format the account no longer uses. In that case the server can refuse to sign the old client in
and tell the user to update.

Because this locks people out, only restrict login when all of the following are true:

- **It protects user data.** The blocked clients would damage or mishandle the user's data.
- **It only applies to the accounts at risk.** Users whose accounts aren't affected can keep using
  older clients.
- **It only blocks clients that are already out of the window.** The restriction can ship three
  months after the last client it blocks.
- **It runs after sign-in credentials are checked.** Otherwise the error reveals the account's state
  to anyone who asks.
- **It returns its own error.** The client can then tell the user to update instead of showing a
  generic sign-in failure.

`ClientVersionValidator` is where this enforcement should take place.

## Managing compatibility on the clients

A client has to work against a server up to two months older than it. In practice that is a
self-hosted server, since the cloud server is always current.

- **Put features that need new server support behind a feature flag.** Self-hosted servers return
  every flag as off, so clients keep using the old behavior with them. The feature reaches
  self-hosted users when the flag check is removed from client code. Remove the flag check from
  client code no earlier than three months after the last server release that doesn't have the
  feature. See [Feature flags](#feature-flags) for the full flag lifecycle.
- **Ignore what you don't recognize.** Don't fail on response properties or enum values you don't
  know about.
- **Don't write data older clients can't read.** See
  [Writing a new data format](#writing-a-new-data-format).

### Writing a new data format

Data one client saves is read by every other client on the account or organization, including older
ones. If an older client can't read the format, the user loses access to that data.

Because the server sits between the writer and the reader, this data crosses two windows: writer to
server, and server to reader. The reader can be up to four months older than the writer, so **double
the window**.

Put the new format behind a feature flag, and count from the first client release that can read it:

| **Step**                           | **Earliest release** | **Why**                                                                                   |
| ---------------------------------- | -------------------- | ----------------------------------------------------------------------------------------- |
| Turn the flag on in cloud          | Two months later     | The cloud server is always current, so only the server-to-reader window applies.          |
| Remove the flag check from clients | Four months later    | Clients then write the new format against self-hosted servers too, so both windows apply. |

For example, if the first client that can read the format ships in `2026.4`, turn the flag on in
server `2026.6` and remove the check in client `2026.8`.

Gating the flag by client version doesn't help here, because the clients that break are the readers,
and readers never check the flag.

### What about the client SDK?

The SDK ships inside the clients, so everything in
[Managing compatibility on the clients](#managing-compatibility-on-the-clients) applies to it. When
you count months, use the client release that shipped the SDK change, not the SDK's own version.

- **Generated API bindings can be ahead of the server.** `bitwarden-api-api` and
  `bitwarden-api-identity` are generated from the server's `main` branch, so a generated method may
  call an endpoint that older servers don't have. Give it a fallback, as you would in a client. The
  [`bitwarden-api-api` README](https://github.com/bitwarden/sdk-internal/tree/main/crates/bitwarden-api-api#updating-bindings-after-a-server-api-change)
  explains how and when the bindings are regenerated.
- **Handle unknown enum values.** Generated enums include an `__Unknown` variant for values from
  newer servers. Handle it. Hand-written enums that come from server responses need a fallback
  variant too, like the error responses in `bitwarden-auth`.
- **Expect properties to disappear.** If a newer server might stop sending a property, make it an
  `Option` or give it `#[serde(default)]`.
- **Don't reject unknown properties.** Don't use `#[serde(deny_unknown_fields)]` on types that come
  from the server or from data other clients wrote.

## Feature flags

Removing a feature flag is the most common place version compatibility comes up. When the server
doesn't return a flag, clients fall back to its default, which is usually off. Removing a flag from
the server too early turns the feature off for everyone on an older client that still checks it.

1. Remove the code that checks the flag from every client and from the server. Leave the flag itself
   defined on the server, so older clients still get its value.
2. Find the last release of each client that still checked the flag.
3. Remove the flag from the server three months after the latest of those releases.

For example, if the browser extension stopped checking a flag in `2025.7.0`, its last release that
checked it was `2025.6.1`. If every other client stopped earlier, the server can remove the flag in
`2025.9.0`.

<Bitwarden>

[Feature flags](./feature-flags.md) covers creating, using, and rolling out flags, including the
self-hosted release sequence.

</Bitwarden>
