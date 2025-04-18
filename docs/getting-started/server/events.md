---
sidebar_position: 4
---

# Event Logging

## Requirements

- Completed the [Server Setup Guide](./guide.md)
- An
  [enterprise organization](https://bitwarden.com/help/about-organizations/#types-of-organizations)

## Azure Queue (Cloud)

The cloud instance of Bitwarden uses Azure Queue and Table Storage to handle events. Here's how this
works:

1. A user carries out an action which needs to be logged
2. If the event is client-side (e.g. viewing a password), the client sends details of the event to
   the Events server project, which then calls `EventService`. If the event is server-side, the
   relevant project calls `EventService` itself.
3. The event is temporarily stored in Azure Queue Storage (which is designed for handling large
   numbers of messages)
4. The EventsProcessor server project runs a regular batch job to retrieve events from Queue Storage
   and save them to Table Storage
5. Events are retrieved from Table Storage for viewing

To emulate this locally:

1.  Make sure you've installed and setup Azurite, as described in the
    [Server Setup Guide](./guide.md#azurite)

2.  Make sure that the `globalSettings:events:connectionString` user secret is not set, or has the
    default value of `UseDevelopmentStorage=true`

3.  Start the Events and EventsProcessor projects using `dotnet run` or your IDE. (Also ensure you
    have Api, Identity and your web vault running.)

You should now observe that your enterprise organization is logging events (e.g. when creating an
item or inviting a user). These should appear in the Event Logs section of the organization vault.

[Azure Storage Explorer](https://learn.microsoft.com/en-us/azure/vs-azure-tools-storage-manage-with-storage-explorer)
lets you inspect the contents of your local Queue and Table Storage and is extremely useful for
debugging.

## Database storage (Self-hosted)

Self-hosted instances of Bitwarden use an alternative `EventService` implementation to write event
logs directly to the `Event` table in their database.

To use database storage for events:

1. Run your local development server in a [self-hosted configuration](./self-hosted/index.mdx) (Api,
   Identity and web vault)
2. Start the Events project using `dotnet run` or your IDE (note: EventsProcessor is not required
   for self-hosted)

## Distributed events (optional)

Events can be distributed via an AMQP messaging system. This messaging system enables new
integrations to subscribe to the events. The system supports either RabbitMQ or Azure Service Bus.

### Listener / Handler pattern

The goal of moving to distributed events is to build additional service integrations that consume
events. To make it easy to support multiple AMQP services (RabbitMQ and Azure Service Bus), the act
of listening to the stream of events is decoupled from the act of responding to an event.

**Listeners**

- One listener per communication platform (e.g. one for RabbitMQ, one for Azure Service Bus).
- Multiple instances can be configured to run independently, each with its own handler and
  subscription / queue.
- Perform all the aspects of setup / teardown, subscription, etc. for the messaging platform, but do
  not directly process any events themselves. Instead, they delegate to the handler with which they
  are configured.

**Handlers**

- One handler per integration (e.g. HTTP post or event database repository).
- Completely isolated from and know nothing of the messaging platform in use. This allows them to be
  freely reused across different communication platforms.
- Perform all aspects of handling an event.
- Allows them to be highly testable as they are isolated and decoupled from the more complicated
  aspects of messaging.

This combination allows for a configuration inside of `Startup.cs` that pairs instances of the
listener service for the currently running messaging platform with any number of handlers. It also
allows for quick development of new handlers as they are focused only on the task of handling a
specific event.

### RabbitMQ implementation

The RabbitMQ implementation adds a step that refactors the way events are handled when running
locally or self-hosted. Instead of writing directly to the `Events` table via the
`EventsRepository`, each event is broadcast to a RabbitMQ exchange. A new
`RabbitMqEventListenerService` instance, configured with an `EventRepositoryHandler`, subscribes to
the RabbitMQ exchange and writes to the `Events` table via the `EventsRepository`. The end result is
the same (events are stored in the database), but the addition of the RabbitMQ exchange allows for
other integrations to subscribe.

Two additional handlers are available to be configured as well. A `RabbitMqEventListenerService`
instance, configured with a `WebhookEventHandler` subscribes to the RabbitMQ events exchange and
`POST`s each event to a configurable URL. An additional `RabbitMqEventListenerService` configured
with a `SlackEventHandler` can post messages to Slack channels or DMs.

```kroki type=mermaid
graph TD
	  subgraph With RabbitMQ
        B1[EventService]
        B2[RabbitMQEventWriteService]
        B3[RabbitMQ exchange]
        B4[EventRepositoryHandler]
        B5[WebhookEventHandler]
        B6[Events Database Table]
        B7[HTTP Server]
        B8[SlackEventHandler]
        B9[Slack]

        B1 -->|IEventWriteService| B2 --> B3
        B3-->|RabbitMqEventListenerService| B4 --> B6
        B3-->|RabbitMqEventListenerService| B5
        B5 -->|HTTP POST| B7
        B3-->|RabbitMqEventListenerService| B8
        B8 -->|HTTP POST| B9
    end

    subgraph Without RabbitMQ
        A1[EventService]
        A2[RepositoryEventWriteService]
        A3[Events Database Table]

        A1 -->|IEventWriteService| A2 --> A3

end
```

#### Running the RabbitMQ container

1.  Verify that you've set a username and password in the `.env` file (see `.env.example` for an
    example)

2.  Use Docker Compose to run the container with your current settings:

    ```bash
    docker compose --profile rabbitmq up -d
    ```

    - The compose configuration uses the username and password from the `env` file.
    - It is configured to run on localhost with RabbitMQ's standard ports, but this can be
      customized in the Docker configuration.

3.  To verify this is running, open `http://localhost:15672` in a browser and login with the
    username and password in your `.env` file.

#### Configuring the server to use RabbitMQ for events

1.  Add the following to your `secrets.json` file, changing the defaults to match your `.env` file:

    ```json
    "eventLogging": {
      "rabbitMq": {
        "hostName": "localhost",
        "username": "bitwarden",
        "password": "SET_A_PASSWORD_HERE_123",
        "exchangeName": "events-exchange",
        "eventRepositoryQueueName": "events-write-queue",
        "slackQueueName": "events-slack-queue",
        "webhookQueueName": "events-webhook-queue",
      }
    }
    ```

    :::info (optional) The `slackQueueName` and `webhookQueueName` specified above are optional. If
    they are not defined, the system will use the above default names. :::

2.  Re-run the PowerShell script to add these secrets to each Bitwarden project:

    ```bash
    pwsh setup_secrets.ps1
    ```

3.  Start (or restart) all of your projects to pick up the new settings

With these changes in place, you should see the database events written as before, but you'll also
see in the RabbitMQ management interface that the messages are flowing through the configured
exchange/queues.

### Azure Service Bus implementation

The Azure Service Bus implementation is a configurable replacement for Azure Queue. Instead of
writing Events to the queue to be picked up, they are sent to the configured service bus topic. An
instance of `AzureServiceBusEventListenerService` is then configured with the
`AzureTableStorageEventHandler` to subscribe to that topic and write Events to Azure Table Storage.
Similar to RabbitMQ above, the end result is the same (events are stored in Azure Table Storage),
but the addition of the service bus topic allows for other integrations to subscribe.

As with the RabbitMQ implementation above, a `SlackEventHandler` and `WebhookEventHandler` can be
configured to publish events to Slack and/or a webhook.

```kroki type=mermaid
graph TD
	  subgraph With Service Bus
        B1[EventService]
        B2[AzureServiceBusEventWriteService]
        B3[Azure Service Bus Topic]
        B4[AzureTableStorageEventHandler]
        B5[WebhookEventHandler]
        B6[Events in Azure Tables]
        B7[HTTP Server]
        B8[SlackEventHandler]
        B9[Slack]

        B1 -->|IEventWriteService| B2 --> B3
        B3-->|AzureServiceBusEventListenerService| B4 --> B6
        B3-->|AzureServiceBusEventListenerService| B5
        B5 -->|HTTP POST| B7
        B3-->|AzureServiceBusEventListenerService| B8
        B8 -->|HTTP POST| B9
    end

    subgraph With Storage Queue
        A1[EventService]
        A2[AzureQueueHostedService]
        A3[Azure Storage Queue]
        A4[AzureQueueHostedService]
        A5[Events in Azure Tables]

        A1 -->|IEventWriteService| A2 --> A3 -->|RepositoryEventWriteService| A4 --> A5

end
```

#### Running the Azure Service Bus emulator

1. Make sure you have Azurite set up locally (as
   [per the normal instructions](https://contributing.bitwarden.com/getting-started/server/guide#azurite)
   for writing events to Azure Table Storage). In addition, this assumes you're using the `mssql`
   default profile and have the `${MSSQL_PASSWORD}` set via `.env`.

2. Run Docker Compose to add/start the local emulator:

```bash
docker compose --profile servicebus up -d
```

:::info

The service bus emulator waits 15 seconds before starting. You can check the console in Docker
desktop or run `docker logs service-bus` to verify the service is up before launching the server.

:::

#### Configuring the server to use Azure Service Bus for events

1. Add the following to your `secrets.json` in `dev` to configure the service bus:

```json
    "eventLogging": {
      "azureServiceBus": {
        "connectionString": "\"Endpoint=sb://localhost;SharedAccessKeyName=RootManageSharedAccessKey;SharedAccessKey=SAS_KEY_VALUE;UseDevelopmentEmulator=true;\"",
        "topicName": "event-logging",
        "eventRepositorySubscriptionName": "events-write-subscription",
        "slackSubscriptionName": "events-slack-subscription",
        "webhookSubscriptionName": "events-webhook-subscription",
      }
    },
```

    :::info
    (optional) The `slackSubscriptionName` and `webhookSubscriptionName` specified above are optional. If
    they are not defined, the system will use the above default names.
    :::

2. Re-run the secrets script to publish the new secrets

```bash
pwsh setup_secrets.ps1 -clear
```

3. Start or re-start all services, including `EventsProcessor`.
