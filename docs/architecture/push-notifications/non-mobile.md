# Other Client Push Notifications

For non-mobile clients, push notifications are handled with
[SignalR](https://learn.microsoft.com/en-us/aspnet/core/signalr/introduction), Microsoft's library
for real-time client communication over WebSockets.

## Server Implementations

When real-time changes must be communicated to the registered non-mobile clients, it is the
responsibiity of the Bitwarden API for their configured server instance to distribute the
information. The server abstracts this with the `IPushNotificationService` interface, which has
different implementations based on whether the instance is cloud-hosted or self-hosted.

### Cloud implementation

```kroki type=plantuml
@startuml
participant C1 as "Initiating Client"
participant C2 as "Receiving Client"
participant API as "Bitwarden Cloud API"
participant Q as "Azure Queue"
participant NAPI as "Bitwarden Notifications API"

group Establish SignalR connection
C2->>NAPI: Registers as SignalR client
end

group Other client updates data
C1->>API: Updates Data
API->>Q: Sends Message to Azure Queue
end

group Notifications API processes message
NAPI<<-Q: Reads from Azure Queue
NAPI->>C2: Sends SignalR message to registered clients
end
@enduml
```

For the Bitwarden Cloud implementation, the API uses the `AzureQueuePushNotificationService`
implementation. This service submits the push notification to an Azure Queue in the Bitwarden Azure
tenant.

The Bitwarden Cloud Notifications API includes a queue processor - the `AzureQueueHostedService` -
that monitors the Azure Queue for pending push notifications. The job pulls messages from the queue
and sends them to all clients registered for the initiating user or organization.

### Self-hosted implementation

```kroki type=plantuml
@startuml
participant C1 as "Initiating Client"
participant C2 as "Receiving Client"
participant SHAPI as "Self-Hosted API"
participant SHNAPI as "Self-Hosted Notifications API"

group Register
C2->>SHNAPI: Registers as SignalR client
end

Group Other client updates data
C1->>SHAPI: Updates data
SHAPI->>SHNAPI: Calls Notifications API to distribute the notification
end

group Update clients
SHNAPI->>C2: Sends Message to registered clients
end
@enduml
```

For a self-hosted implementation, push notification architecture differs because there is no Azure
Queue available.

Self-hosted instances have a slightly simplified flow since they don't have access to Azure
resources like Azure Queues. The overall flow is still the same as the cloud-hosted implementation,
with the exception that instead of buffering the notifications using a Azure Queue, the self-hosted
Bitwarden API submits the notifications directly to the self-hosted Notifications API.

## Client Registration

When a non-mobile client starts and the user is authenticated, it initiates a WebSocket connection
to the Notification service (`/notifications/hub`) for their configured server instance. This
request includes their JWT `bearer` token, which is used to retreive the user ID, which in turn
determines which notifications the user receives.
