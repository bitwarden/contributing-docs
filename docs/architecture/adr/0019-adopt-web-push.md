---
adr: "0019"
status: In progress
date: 2023-02-06
tags: [server, clients, browser, notifications]
---

# 0019 - Adoption of Web Push

<AdrTable frontMatter={frontMatter}></AdrTable>

## Context and Problem Statement

Millions of users now utilize push notifications for background vault syncs and passwordless login
requests. As the platform has grown, so has the need to maintain the current
[SignalR][signalr]-based solution that utilizes WebSockets, a system that places significant
pressure on cloud components in the event of deployments or other application updates. Combined with
the need to also support mobile devices with proprietary push notification protocols, a
next-generation and hybridized service offering is needed to simplify and scale up notification
delivery.

### Modern Infrastructure Management

The [notifications service][notifications] is an independently-deployed component and for the
Bitwarden-hosted version is backed by dozens of virtual machines each supporting tens of thousands
of concurrent connections. With the move to less manual component maintenance in the cloud --
specifically Kubernetes -- the burden of keeping up the large amount of connections with
[pods][podlife] is complex and performance spikes are expected.

### WebSockets

Usage of SignalR, even with much larger workloads, has at face value worked well, but the nature of
the work being performed and usage of persistent WebSockets connections for certain clients has
become tenuous. In aggregate the amount of input and output from the notifications service is quite
large and is used almost entirely for background-oriented operations. Various new technologies have
come out that are better suited towards synchronization work. The technology or protocol used must
be usable at large scale in the cloud as well as for self-hosted installations.

Browser extension changes and mandates such as [Manifest V3][mv3] additionally present support
problems with long-lived background connections.

### Cost and Reliability

New solutions must be able to not only scale to essentially infinite connections but balance cost
with user growth, all the while delivering high availability. Existing options for mobile
notifications specifically either have device limits (e.g. [Azure Notification Hubs][hubspricing])
or lack service level guarantees while not offering modern technologies. Furthermore, some clients
(e.g. [F-Droid][fdroid]) cannot utilize well-established (albeit proprietary) push backends. A
single service provider is desired for as much functionality as possible, while still offering
flexibility for self-host.

## Considered Options

With respect to mobile notifications:

- **Work around Azure Notification Hubs limits** - Since all mobile devices, even for self-hosted
  installations, must utilize the Bitwarden cloud for push due to certificate security, devise a
  solution that shards devices across many Notification Hubs within new subscriptions.
- **Adopt a new offering for mobile push notifications** - Use something other than Azure
  Notification Hubs that doesn't have limits, perhaps with some technology sacrifices.
- **Adopt a new combined push service provider** - Not only migrate away from Azure Notification
  Hubs but also select a service provider that supports native mobile notifications as well as other
  desired protocols like Web Push.

With respect to protocol modernization:

- **Keep the SignalR solution and continue to scale up** - Maintain the cluster of notifications
  service virtual machines and keep pushing for a larger set to handle scale. Also move all mobile
  notifications to the custom solution and abandon Azure Notification Hubs.
- **Adopt a new offering for non-mobile push notifications** - Use something other than SignalR like
  a homegrown [Web Push][webpush] backend inside the notifications service. Host a compatible Web
  Push backend for self-host with the clients that need it.
- **Adopt a new combined push service provider** - Not only migrate away from SignalR where possible
  but also select a service provider that supports native mobile notification protocols.
  Additionally implement a Web Push backend for self-host as described above.

## Decision Outcome

Chosen option: **Adopt a new combined push service provider**.

### Positive Consequences

- Web Push is [well-supported][caniuse] in most places we need it and is a valuable technology
  upgrade with ease of maintenance in the future.
- Several service providers offer Web Push backends for our cloud offering, and the protocol can be
  implemented within the notifications service for self-host.
- Web Push fits well into Manifest V3 and service workers.
- Infrastructure maintenance burdens and cost for the notification service should significantly
  decrease.

### Negative Consequences

- Need to watch Safari support for Web Push which was just recently released at time of writing.
- Potential cost increases for selecting a different service provider.

### Plan

The notifications service will continue to exist and support APIs for the SignalR connections as
well as new ones for Web Push. Cloud-based clients will connect to a unified service provider that
has Web Push whenever feasible and otherwise utilize the existing SignalR implementation when Web
Push cannot be leveraged. Self-host clients will utilize a similar blend of Web Push and SignalR
provided by the notification service. Web Push's necessary key exchange and security (VAPID) can use
existing in-house technology for self-host and the service provider for the cloud. Clients will
largely migrate to Web Push connections over time and the load on SignalR will significantly reduce,
although the latter is planned to be supported for certain clients for the foreseeable future.

Mobile devices will all migrate to the same unified service provider that supports native iOS (APNS)
and Android (FCM) push notification protocols alongside Web Push. Future support for [Unified
Push][unifiedpush] will be considered alongside Web Push for incompatible clients, although the
SignalR implementation continues to be available.

Utilizing end-to-end encryption -- with user encryptions keys -- of push notification payloads will
be considered while migrating compatible clients to the new provider to provide stronger security of
potentially-sensitive payload contents.

[signalr]: https://dotnet.microsoft.com/en-us/apps/aspnet/signalr
[notifications]: https://github.com/bitwarden/server/tree/master/src/Notifications
[podlife]: https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/
[mv3]: https://developer.chrome.com/docs/extensions/mv3/intro/
[hubspricing]: https://azure.microsoft.com/en-us/pricing/details/notification-hubs/
[fdroid]: https://mobileapp.bitwarden.com/fdroid/
[caniuse]: https://caniuse.com/push-api
[webpush]: https://web.dev/push-notifications-web-push-protocol/
[unifiedpush]: https://unifiedpush.org/
