# Client Push Notifications

## Diagrams

### Cloud instance

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

### Self-hosted instance

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

## Cloud implementation

### Registering for notifications

For non-mobile clients, push notifications are handled with
[SignalR](https://learn.microsoft.com/en-us/aspnet/core/signalr/introduction), Microsoft's library
for real-time client communication over WebSockets.

When a non-mobile client starts up, it is registered with the Bitwarden Notifications API through
SignalR. This allows the client to receive real-time push notifications.

### Triggering distribution of notifications

When relevant data is changed through another client (this could be triggering a Passwordless login
request or updating vault data, for example), the Bitwarden Cloud API is responsible for initiating
the process of distributing that update to the user's other registered clients.

To do so, the Bitwarden Cloud API uses the `AzureQueuePushNotificationService`. This service submits
the push notification to an Azure Queue.

### Sending notifications to registered clients

The Bitwarden Cloud Notifications API includes a job - the `AzureQueueHostedService` - that monitors
the Azure Queue for pending push notifications. The job will pull messages from the queue and send
them to all clients registered via SignalR for the given user.

## Self-hosted implementation

For a self-hosted implementation, push notification architecture differs because there is no Azure
Queue available.

The overall flow is the same, with the exception that instead of submitting the notifications to the
Azure Queue, the self-hosted Bitwarden API submits the notifications directly to the self-hosted
Notifications API. In the cloud instance, this is buffered through the Azure Queue, but for
self-hosted instances the API calls the `/send` endpoint on the `SendController` on the
Notifications API to send the message directly.
