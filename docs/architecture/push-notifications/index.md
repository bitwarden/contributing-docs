---
sidebar_position: 3
---

# Push Notifications

Bitwarden uses push notifications to communicate in real-time from the Bitwarden server to its
clients.

## Uses at Bitwarden

Currently, this functionality is used for:

- Syncing the vault between clients
- Passwordless login requests

## Technology in Use

The Bitwarden server initiates push notifications when relevant actions are performed, typically
either when a user's data has changed and it needs to be synced, or an action requiring user input
is performed.

There are currently two different methods being used for push notifications:

- The mobile applications use Azure Notification Hub, which is an abstraction of the Push
  Notification Services (PNSs) for the Apple and Android ecosystems. Self-hosted instances relay
  their mobile messages through the Bitwarden cloud-hosted service.
- The other clients use SignalR, which is a two-way RPC usually over WebSockets (but has fallbacks
  to other protocols) to establish real-time client communications with our non-mobile clients.
