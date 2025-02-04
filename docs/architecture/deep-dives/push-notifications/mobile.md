# Mobile Push Notifications

## Overview

Push notifications are a somewhat complex area, and their implementation differs both on the server
and on the client, based on different dimensions.

From a server perspective, the implementation differs between the Bitwarden cloud-hosted instance
and self-hosted instances. The primary difference is that self-hosted clients need to relay their
messages through the Bitwarden cloud-hosted instance. This is needed since only Bitwarden is allowed
to send notifications to the store-distributed Android and iOS mobile applications.

From a client perspective, the implementations differ between mobile operating systems, Android and
iOS. This is because each operating system handles acquiring and refreshing push tokens differently.

We will first look at the server-side implementations, then look at acquiring push tokens on the
clients.

## Server Implementations

### Sending the push token to Azure Notification Hub

The mobile client - whether iOS or Android - receives an opaque token that represents that physical
device to the platform-specific notification service. The client transmits this token to the server
through a `POST` request to the `/devices/identifier/{deviceIdentifier}/token` endpoint on the
Bitwarden API. On the mobile client this is done in the `OnRegisteredAsync()` method of the
[`PushNotificationListenerService`](https://github.com/bitwarden/mobile/blob/main/src/App/Services/PushNotificationListenerService.cs).

The Bitwarden API is then responsible for submitting this token to the Azure Notification Hub. On
the server, the opaque push token is associated with a specific user via the user presented in the
`access_token` on the request and a physical device from the URL path. This is stored in SQL in the
`Device` table.

:::note

It is important to recognize that at this point we have associated a token with the combination of
**both** a user **and** a physical device, as both of these are used as tags on the registration in
Azure Notification Hub. This is how we ensure that subsequent notifications are only sent to the
device when the appropriate user triggers them on another device.

:::

#### Cloud implementation

```kroki type=plantuml
@startuml
participant MC_LS as "Mobile Device"
participant PNS as "Platform Notification Service"
participant API as "Bitwarden Cloud API"
participant NH as "Azure Notification Hub"

group Register for token
MC_LS->>PNS: Register
PNS->>MC_LS: Push Token
MC_LS->>API: Store Push Token with Device and User
API->>NH: Associate Push Token with Device and User
end
@enduml
```

If we are running a Bitwarden cloud instance, the Bitwarden API is responsible for directly
communicating with the Azure Notification Hub to register the push token. This is done in the
`CreateOrUpdateRegistrationAsync()` method on the
[`NotificationHubPushRegistrationService`](https://github.com/bitwarden/server/blob/main/src/Core/Services/Implementations/NotificationHubPushRegistrationService.cs).

#### Self-hosted implementation

```kroki type=plantuml
@startuml
 participant MC_LS as "Mobile Device"
    participant PNS as "Platform Notification Service"
    participant API as "Self-Hosted API"
    participant BWAPI as "Bitwarden Cloud API"
    participant NH as "Azure Notification Hub"

    group Register
        MC_LS->>PNS: Register
        PNS->>MC_LS: Push Token
        MC_LS->>API: Store Push Token with Device and User
        API->>BWAPI: RelayPushRegistration sends message to /push/register
        BWAPI->>NH: Associate Token with Device and User (same as Cloud)
    end
@enduml
```

For self-hosted instances, the self-hosted instance cannot communicate directly with Bitwarden's
Azure Notification Hub. In order to provide push notifications for self-hosted instances, the
self-hosted Bitwarden API must register with the Azure Notification Hub through the
`CreateOrUpdateRegistrationAsync()` method on
[`RelayPushRegistrationService`](https://github.com/bitwarden/server/blob/main/src/Core/Services/Implementations/RelayPushRegistrationService.cs).

This implementation of
[`IPushRegistrationService`](https://github.com/bitwarden/server/blob/main/src/Core/Services/IPushRegistrationService.cs)
allows the self-hosted Bitwarden API to register the push token by calling the `/push/register`
endpoint on the
[`PushController`](https://github.com/bitwarden/server/blob/main/src/Api/Controllers/PushController.cs)
in the Bitwarden Cloud API. This is exposed to the self-hosted instance as
https://push.bitwarden.com. The
[`PushController`](https://github.com/bitwarden/server/blob/main/src/Api/Controllers/PushController.cs)
on the Bitwarden Cloud API then registers the push token as if it were a cloud registration -
sending it to Azure Notification Hub.

:::tip

It is important to understand the change in context when moving through the relay push notification
service. The relay communicates between two different servers running the Bitwarden API - the
self-hosted instance and the Bitwarden Cloud instance. Each of these servers has different
implementations of IPushNotificationService. Once the message is received by the Bitwarden Cloud API
`/push/register` endpoint, it is handled just like any other push notification triggered from the
service itself.

:::

### Using the push token to send notifications to the device

When a client changes data, or a Passwordless Authentication Request is sent, the server is
responsible for sending push notifications to all mobile clients to make them aware of the change.

#### Cloud implementation

```kroki type=plantuml
@startuml
participant MC_LS as "Mobile Device"
participant WC as "Other Client"
participant PNS as "Platform Notification Service"
participant API as "Bitwarden Cloud API"
participant NH as "Azure Notification Hub"

group Other client updates data
WC->>API: Update Data
API->>NH: Send Message to Hub
end

group Mobile message distribution
NH->>PNS: Send Message to Clients by Push Token
PNS->>MC_LS: OnMessageAsync()
MC_LS->>API: Request data
API->>MC_LS: Return data requested
end
@enduml
```

For notifications to mobile devices, this is handled in the
[`NotificationHubPushNotificationService`](https://github.com/bitwarden/server/blob/main/src/Core/Services/Implementations/NotificationHubPushNotificationService.cs).
This service uses the `Microsoft.Azure.NotificationHubs` SDK to send notifications to the Azure
Notification Hub.

When registering with Azure Notification Hub, each push token is associated with both a user and a
device, as we saw above. It is at this point that these tags are used to target specific
notifications. For each type of notification that the server wishes to send, it is tagged with the
device identifier and user ID. Azure Notification Hub then uses those tags to look up the push token
and send the notification to the proper device. This ensures that we only send notifications to a
device when the user _and_ device match.

#### Self-hosted implementation

```kroki type=plantuml
@startuml
 participant MC_LS as "Mobile Device"
    participant WC as "Other Client"
    participant PNS as "Platform Notification Service"
    participant API as "Self-Hosted API"
    participant SHN as "Self-Hosted Notification API"
    participant BWAPI as "Bitwarden Cloud API"
    participant NH as "Azure Notification Hub"

    Group Other client updates data
        WC->>API: Update Data
        API->>BWAPI: RelayPushNotification sends message to /push/send
        BWAPI->>NH: Send Message to Hub (same as Cloud)
    end

    group Update clients
        NH->>PNS: Send Message to Clients
        PNS->>MC_LS: OnMessageAsync()
        MC_LS->>API: Request data
        API->>MC_LS: Return data requested by message
    end
@enduml
```

Just as with the registration of the push token, the self-hosted instance uses the
[`PushController`](https://github.com/bitwarden/server/blob/main/src/Api/Controllers/PushController.cs)
on the Bitwarden Cloud API as a proxy to communicate with the Azure Notification Hub.

The self-hosted Bitwarden API calls the `/send` endpoint on the `PushController` on the Bitwarden
Cloud API to transmit the push payload to the Bitwarden Cloud API. The Cloud API then transmits the
data to the Azure Notification Hub using the same
[`NotificationHubPushNotificationService`](https://github.com/bitwarden/server/blob/main/src/Core/Services/Implementations/NotificationHubPushNotificationService.cs)
as it would for a cloud-generated message.

It is important to note that from the Cloud API's perspective, it handles a message received from
the `/send` endpoint the same way it does a message generated from an action on the Bitwarden Cloud
server; there is no difference and the same code is executed either way.

No decrypted data is ever sent in push notification payloads, and the data is never stored on the
Bitwarden Cloud database when being proxied by the push relay. This allows our self-hosted instances
to keep their data segregated from the Bitwarden Cloud and still use push notifications.

## Client Registration

### Obtaining push tokens on the mobile clients

The process for obtaining the opaque device push tokens on the mobile client varies based on the
mobile OS.

#### Android

Android push tokens are received by the
[`FirebaseMessagingService`](https://github.com/bitwarden/mobile/blob/main/src/Android/Push/FirebaseMessagingService.cs).
Firebase Cloud Messaging (FCM) is the Platform Notification Service used for push notifications to
Android devices. When the Android OS initially obtains a token for the application, or the token is
updated, the `OnNewToken()` method in this service is triggered.

In the `OnNewToken()` method, we update the `PushRegisteredToken` in the device's state and trigger
the `RegisterAsync()` method of the
[`AndroidPushNotificationService`](https://github.com/bitwarden/mobile/blob/main/src/Android/Services/AndroidPushNotificationService.cs).

Here, we use `PushRegisteredToken` in state to represent the recent token received from FCM. It is
scoped to exist once for a given device, because FCM assigns push tokens to a given device,
regardless of Bitwarden accounts on the device.

At this point, the `PushRegisteredToken` represents the token assigned to the device by FCM.
However, Bitwarden stores push tokens for each individual user on the device, in order to target the
notifications appropriately. In order to capture this level of granularity, we store the
`PushCurrentToken` in state at the user level. The `PushCurrentToken` represents the individual
user's push token, which may or may not be out of date with the one assigned by FCM.

It is the responsibility of `RegisterSync()` on the
[`AndroidPushNotificationService`](https://github.com/bitwarden/mobile/blob/main/src/Android/Services/AndroidPushNotificationService.cs)
to determine if the `PushRegisteredToken` assigned to the device differs from the `PushCurrentToken`
assigned to the current user.

If the current token assigned to the device differs from the user's token, we call
`OnRegisteredSync()` on the
[`PushNotificationListenerService`](https://github.com/bitwarden/mobile/blob/main/src/App/Services/PushNotificationListenerService.cs)
to:

- Register the new `PushRegisteredToken` through the Bitwarden API for the active user
- Set the `PushCurrentToken` to the new value for the active user

As we can see, the `RegisterSync()` handles registering the push token _for the active user_ only.
In the case that there are multiple users on the device, only the user active when FCM issues a new
token will get the update through the process described thus far.

For other users on the device, `RegisterSync()` is initiated when they next log in to the
application or the application is switched to their account. This is done in the initialization of
the
[`GroupingsPage`](https://github.com/bitwarden/mobile/blob/main/src/App/Pages/Vault/GroupingsPage/GroupingsPage.xaml.cs).
The same comparison is done for this user, and in this case the `PushRegisteredToken` is still
different than the `PushCurrentToken` for that user (as we've only updated the `PushCurrentToken`
for the initial user thus far). It is at this point that the Bitwarden API is notified that the
subsequent users are registered for the new token.

:::note

The Android Push Notification documentation applies to the Bitwarden application that is installed
from the Google Play store. The FDroid release does not support push notifications. These builds use
the
[`NoopPushNotificationListenerService`](https://github.com/bitwarden/mobile/blob/main/src/App/Services/NoopPushNotificationListenerService.cs)
and the
[`NoopPushNotificationService`](https://github.com/bitwarden/mobile/blob/main/src/App/Services/NoopPushNotificationService.cs).

:::

#### iOS

On iOS devices, push token registration occurs through the Apple Push Notification service (APNs).

When a user logs in to the iOS application or switches accounts, the application loads the initial
vault screen. The
[`VaultListProcessor`](https://github.com/bitwarden/ios/blob/main/BitwardenShared/UI/Vault/Vault/VaultList/VaultListProcessor.swift)
manages this screen, and as part of its processes checks to make sure the device has accepted push
notifications. If not, the Bitwarden push notification prompt is shown. This prompt explains why iOS
will be requesting push notifications for the Bitwarden mobile app.

If the user accepts this prompt, or if they already have accepted it, the application checks to see
if the _current user_ has registered for push notifications within the last day. If they have never
registered before, or if more than one day has elapsed, the Bitwarden app registers with iOS for
push notifications, requesting a push token.

The registration for push notifications is handled by calling
[`registerForRemoteNotifications()`](https://developer.apple.com/documentation/uikit/uiapplication/1623078-registerforremotenotifications)
on `UIApplication`. The response from APNs with the push token is then received asynchronously. When
the token is obtained, the delegate methods on
[`AppDelegate`](https://github.com/bitwarden/ios/blob/main/Bitwarden/Application/AppDelegate.swift)
are called, which acts as a passthrough for the
[`AppProcessor`](https://github.com/bitwarden/ios/blob/main/BitwardenShared/UI/Platform/Application/AppProcessor.swift)
which itself acts more or less as a passthrough for the
[`NotificationService`](https://github.com/bitwarden/ios/blob/main/BitwardenShared/Core/Platform/Services/NotificationService.swift),
which in its `didRegister()` method is responsible for sending the push token to the back-end API to
register the device and user combination for push notifications.

:::note

We are registering for a push token once a day for each account on the device. However, it is quite
likely that the token received from iOS will be the same each day. A different token is generated
for a device in some specific scenarios, like restoring device from a backup. Even though this is
not usually the case, we check on a daily basis to ensure that the Bitwarden Azure Notification Hub
is up to date.

:::

<Bitwarden>

Further information on how to debug issues with push notifications on iOS can be found
[in the mobile section](https://contributing.bitwarden.com/architecture/mobile-clients/ios/push-notification-troubleshooting).

</Bitwarden>
