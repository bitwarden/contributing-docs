# Mobile Push Notifications

## Diagrams

### Cloud instance

```kroki type=plantuml
@startuml
participant MC_LS as "Mobile Device"
participant PNS as "Platform Notification Service"
participant NH as "Azure Notification Hub"
participant WC as "Web Client"
participant API as "Bitwarden Cloud API"

group Register for token
MC_LS->>PNS: Register
PNS->>MC_LS: Push Token
MC_LS->>API: Store Push Token
end

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

### Self-hosted instance

```kroki type=plantuml
@startuml
 participant MC_LS as "Mobile Device"
    participant PNS as "Platform Notification Service"
    participant NH as "Azure Notification Hub"
    participant WC as "Web Client"
    participant API as "Self-Hosted API"
    participant SHN as "Self-Hosted Notification API"
    participant BWAPI as "Bitwarden Cloud API"

    group Register
        MC_LS->>PNS: Register
        PNS->>MC_LS: Push Token
        MC_LS->>API: Store Push Token with User
        API->>BWAPI: RelayPushRegistration sends message to /push/register
        BWAPI->>NH: Add Device to Notification Hub (same as Cloud)
    end

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

## What does a push token represent?

A push token is an opaque value that is received on the mobile application from the Platform
Notification Service (PNS). The PNS varies based on the operating system of the mobile device:

- Apple: Apple Push Notifications (APN)
- Android: Firebase Cloud Messaging (FCM)

From the OS perspective, this value is tied to the physical device that requested it. It is up to
our application to associate it with any metadata required to ensure that notifications arrive to
the proper devices.

## Obtaining a token on the mobile client

The first step in the push notification architecture is obtaining the push token from the Platform
Notification Service (PNS) for the operating system on the device. Bitwarden currently supports push
notifications from iOS and Android devices.

### Android

Android push tokens are received by the `FirebaseMessagingService`, found
[here](https://github.com/bitwarden/mobile/blob/master/src/Android/Push/FirebaseMessagingService.cs).
Firebase Cloud Messaging (FCM) is the Platform Notification Service used for push notifications to
Android devices. When the Android OS initially obtains a token for the application, or the token is
updated, the `OnNewToken()` method in this service is triggered.

In the `OnNewToken()` method, we update the `PushRegisteredToken` in the device's state and trigger
the `RegisterAsync()` method of the `AndroidPushNotificationService`.

:::note For Android devices, there are two important properties in the application state that are
used to persist these asynchronous token updates from the `FirebaseMessagingService` to the rest of
the application.

- `PushRegisteredToken`
  - Represents the most recent token received from FCM. It is maintained once in application state
    for the device.
- `PushCurrentToken` - Represents the current push token _for a given user_. It is maintained in
  state once for each user. :::

#### Registering the user's push token with `RegisterSync()`

The `RegisterSync()` method on the `AndroidPushNotificationService` is responsible for:

- Determining if the `PushRegisteredToken` on the device differs from the `PushCurrentToken` for the
  active user on the device, and if so
- Calling `OnRegisteredSync()` on the `PushNotificationListenerService` to:

  - Register the new `PushRegisteredToken` through the Bitwarden API for the active user
  - Set the `PushCurrentToken` to the new value for the active user

As we can see, the `RegisterSync()` handles registering the push token _for the active user_ only.
In the case that there are multiple users on the device, only the user active when FCM issues a new
token will get the update through the process described thus far.

For other users on the device, `RegisterSync()` is initiated when they next log in to the
application or the application is switched to their account. This is done in the initialization of
the `GroupingsPage`. The same comparison is done for this user, and in this case the
`PushRegisteredToken` is still different than the `PushCurrentToken` for that user (as we've only
updated the `PushCurrentToken` for the initial user thus far). It is at this point that the
Bitwarden API is notified that the subsequent users are registered for the new token.

:::warning **Implication for Push Notification Delays**

The Android push notification implementation described above may cause delays in push notifications
if there are multiple accounts on the device. This can happen in the following cases:

- Normally, push notifications will be received for all accounts on the device, regardless if they
  are the active account or not. However, if a new token is received from FCM, non-active accounts
  will stop receiving push notifications until they become the active account and can update their
  push token.
- There is a delay of up to one day built in to the logic that runs when the vault page opens for a
  user. This means that if FCM provides a new token, it could be up to a day before the application
  actually checks for this new token and registers it for the active user. :::

### iOS

When a user logs in to the iOS application or switches accounts, the application loads the
`GroupingsPage`. In the `GroupingsPage` initialization, we first check to make sure the device has
accepted push notifications. If not, the Bitwarden push notification prompt is shown. This prompt
explains why iOS will be requesting push notifications for the Bitwarden mobile app.

> Bitwarden keeps your vault automatically synced by using push notifications. For the best possible
> experience, please select "Allow" on the following prompt when asked to allow push notifications.

If the user accepts this prompt, or if they already have accepted it, the application checks to see
if the _current user_ has registered for push notifications within the last day. If they have never
registered before, or if more than one day has elapsed, the Bitwarden app registers with iOS for
push notifications, requesting a push token. This is done in the `RegisterAsync()` method in
`iOSPushNotificationService`, found
[here](https://github.com/bitwarden/mobile/blob/master/src/iOS/Services/iOSPushNotificationService.cs).

:::note Note that to iOS, the push token represents the _device_, but we track this at the _user_
level. This is because when we send a push token to Azure Notification Hub, we tag it with both the
device identifier _and_ the user ID. This allows us to target the resulting notifications only to
the device and user combination. :::

The registration for a push token with iOS happens asynchonously. When a token is obtained for the
device, the `OnRegisteredSuccess()` method in `iOSPushNotificationHandler` is triggered. This then
calls the `OnRegisteredAsync()` method of the `PushNotificationListenerService`, passing along the
newly-acquired token. This method is responsible for sending the push token to the back-end API to
register the device + user combination for push notifications.

:::note We are registering for a push token once a day for each account on the device. However, it
is quite likely that the token received from iOS will be the same each day. A different token should
only be generated for a device when the device is uninstalled and re-installed, but we check on a
daily basis to ensure our database is up to date. :::

## Sending the push token to Azure Notification Hub

The mobile client - whether iOS or Android - receives an opaque token that represents that physical
device to the platform-specific notification service. The client transmits this token to the server
through a `POST` request to the `/devices/identifier/{deviceIdentifier}/token` endpoint on the
Bitwarden API. On the mobile client this is done in the `OnRegisteredAsync()` method of the
`PushNotificationListenerService`.

The Bitwarden API is then responsible for submitting this token to the Azure Notification Hub. On
the server, the opaque push token is associated with a specific user via the user presented in the
`access_token` on the request and a physical device from the URL path. This is stored in SQL in the
`Device` table.

:::note It is important to recognize here that at this point we have associated a token with the
combination of **both** a user **and** a physical device, as both of these are used as tags on the
registration in Azure Notification Hub. This is how we ensure that subsequent notifications are only
sent to the device when the appropriate user triggers them on another device. :::

### Cloud implementation

If we are running a Bitwarden cloud instance, the Bitwarden API is responsible for directly
communicating with the Azure Notification Hub to register the push token. This is done in the
`CreateOrUpdateRegistrationAsync()` method in the `NotificationHubPushRegistrationService`.

### Self-hosted implementation

For self-hosted instances, the self-hosted instance cannot communicate directly with Bitwarden's
Azure Notification Hub. In order to provide push notifications for self-hosted instances, the
self-hosted Bitwarden API must register with the Azure Notification Hub through the
`CreateOrUpdateRegistrationAsync()` method on `RelayPushRegistrationService`.

This implementation of `IPushRegistrationService` allows the self-hosted Bitwarden API to register
the push token by calling the `/push/register` endpoint on the `PushController` in the Bitwarden
Cloud API. This is exposed to the self-hosted instance as httos://push.bitwarden.com. The
`PushController` on the Bitwarden Cloud API then registers the push token as if it were a cloud
registration - sending it to Azure Notification Hub.

:::tip It is important to understand the change in context when moving through the relay push
notification service. The relay communicates between two different servers running the Bitwarden
API - the self-hosted instance and the Bitwarden Cloud instance. Each of these servers has different
implementations of IPushNotificationService. Once the message is received by the Bitwarden Cloud API
`/push/register` endpoint, it is handled just like any other push notification triggered from the
service itself. :::

## Using the push token to send notifications to the device

When a client changes data, or a Passwordless Authentication Request is sent, the server is
responsible for sending push notifications to all mobile clients to make them aware of the change.

### Cloud implementation

For notifications to mobile devices, this is handled in the
`NotificationHubPushNotificationService`. This service the `Microsoft.Azure.NotificationHubs` SDK to
send notifications to the Azure Notification Hub.

When registering with Azure Notification Hub, each push token was associated with both a user and a
device, as we saw above. It is at this point that these tags are used to target specific
notifications. For each type of notification that the server wishes to send, it is tagged with the
device identifier and user ID. Azure Notification Hub then uses those tags to look up the push token
and send the notification to the proper device. This ensures that we only send notifications to a
device when the user _and_ device match.

### Self-hosted implementation

Just as with the registration of the push token, the self-hosted instance uses the `PushController`
on the Bitwarden Cloud API as a proxy to communicate with the Azure Notification Hub.

The self-hosted Bitwarden API calls the `/send` endpoint on the `PushController` on the Bitwarden
Cloud API to transmit the push payload to the Bitwarden Cloud API. The Cloud API then transmits the
data to the Azure Notification Hub using the same `NotificationHubPushNotificationService` as it
would for a cloud-generated message.

It is important to note that from the Cloud API's perspective, it handles a message received from
the `/send` endpoint the same way it does a message generated from an action on the Bitwarden Cloud
server; there is no difference and the same code is executed either way.

No decrypted data is ever send in push notification payloads, and the data is never stored on the
Bitwarden Cloud database when being proxied by the push relay. This allows our self-hosted instances
to keep their data segregated from the Bitwarden Cloud and still use push notifications.

:::tip It is important to understand the change in context when moving through the relay push
notification service. The relay communicates between two different servers running the Bitwarden
API - the self-hosted instance and the Bitwarden Cloud instance. Each of these servers has different
implementations of IPushNotificationService. Once the message is received by the Bitwarden Cloud API
`/push/send` endpoint, it is handled just like any other push notification triggered from the
service itself. :::
