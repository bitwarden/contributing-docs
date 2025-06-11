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

### RabbitMQ implementation

The RabbitMQ implementation adds a step that refactors the way events are handled when running
locally or self-hosted. Instead of writing directly to the `Events` table via the
`EventsRepository`, each event is broadcast to a RabbitMQ exchange. A new
`RabbitMqEventListenerService` instance, configured with an `EventRepositoryHandler`, subscribes to
the RabbitMQ exchange and writes to the `Events` table via the `EventsRepository`. The end result is
the same (events are stored in the database), but the addition of the RabbitMQ exchange allows for
other integrations to subscribe.

Additional handlers - one for each integration and listening to their own queue - listen for events
and publish messages to an additional tier if there is an active configuration that matches the
event type, integration type, and organization. Once published to the integration tier, there are
additional handlers that use the integration messages to perform the actual integration. In
addition, the integration tier handles failures and retries for each specific integration.

- `SlackIntegrationHandler` posts messages to Slack channels or DMs.
- `WebhookIntegrationHandler` `POST`s each event to a configurable URL.

```kroki type=mermaid
graph TD
	  subgraph With RabbitMQ
        B1[EventService]
        B2[RabbitMQEventWriteService]
        B3[RabbitMQ event exchange]
        B4[EventRepositoryHandler]
        B5[WebhookIntegrationHandler]
        B6[Events Database Table]
        B7[RabbitMQ integration exchange]
        B8[SlackIntegrationHandler]

        B1 -->|IEventWriteService| B2 --> B3
        B3 -->|RabbitMqEventListenerService| B4 --> B6
        B3 -->|RabbitMqEventListenerService| B7
        B7 -->|RabbitMqIntegrationListenerService| B5
        B3 -->|RabbitMqEventListenerService| B7
        B7 -->|RabbitMqIntegrationListenerService| B8
    end

    subgraph Without RabbitMQ
        A1[EventService]
        A2[RepositoryEventWriteService]
        A3[Events Database Table]

        A1 -->|IEventWriteService| A2 --> A3

end
```

#### Running the RabbitMQ container (default using fixed-delay queues)

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

#### Running the RabbitMQ container (with optional delay plugin)

The standard installation of RabbitMQ does not support delaying message delivery. Our default option
instead uses retry queues with a fixed amount of delay and checks the `DelayUntilDate` in each
message to see if it is time for them to br processed. This provides the delay needed for retries
(with backoff and jitter applied), but it does require more processing.

As an alternate approach, we have support for RabbitMQ's optional delay plugin - which does support
adding a precise delay to a message and handles publishing at the specified time. It does require
the plugin to be installed and enabled before running and is therefore not the default setup. To
enable the plugin:

1.  Download the latest version of the
    [RabbitMQ delay plugin GitHub repo](https://github.com/rabbitmq/rabbitmq-delayed-message-exchange).
2.  Add the plugin to your RabbitMQ instance. The easiest way to do this is to add the following
    line to Docker compose, under the `volumes:`. This puts the binary into the container that
    Docker spins up.

```
  -  ./rabbitmq_delayed_message_exchange-4.1.0.ez:/opt/rabbitmq/plugins/rabbitmq_delayed_message_exchange-4.1.0.ez
```

3.  Build/rebuild your RabbitMQ instance with this in place to enable the ability to use the delay
    plugin.
4.  If you have previously created the Integration exchange, you have to delete it and let the
    server code recreate it (Rabbit will use the existing exchange without delay enabled if it
    already exists).
5.  Restart the servers and verify that the exchange was created successfully.
6.  Turn on the `useDelayPlugin` flag in secrets and push that out to the servers (see below)

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
        "useDelayPlugin": false
      }
    }
    ```

    :::info

    The `slackQueueName` and `webhookQueueName` specified above are optional. If they are not
    defined, the system will use the above default names.

    :::

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

As with the RabbitMQ implementation above, handlers for available integrations will listen to the
same event topic and republish to the integration topic when the event integration is configured.
The same `SlackIntegrationHandler` and `WebhookIntegrationHandler` process messages to send to Slack
and/or a webhook and the integration topic handles failures and retries.

```kroki type=mermaid
graph TD
	  subgraph With Service Bus
        B1[EventService]
        B2[AzureServiceBusEventWriteService]
        B3[Azure Service Bus Event Topic]
        B4[AzureTableStorageEventHandler]
        B5[WebhookIntegrationHandler]
        B6[Events in Azure Tables]
        B7[Azure Service Bus Integration Topic]
        B8[SlackIntegrationHandler]

        B1 -->|IEventWriteService| B2 --> B3
        B3 -->|AzureServiceBusEventListenerService| B4 --> B6
        B3 -->|AzureServiceBusEventListenerService| B7
        B7 -->|AzureServiceBusIntegrationListenerService| B5
        B3 -->|AzureServiceBusEventListenerService| B7
        B7  -->|AzureServiceBusIntegrationListenerService| B8
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

   The `slackSubscriptionName` and `webhookSubscriptionName` specified above are optional. If they
   are not defined, the system will use the above default names.

   :::

2. Re-run the secrets script to publish the new secrets

   ```bash
   pwsh setup_secrets.ps1 -clear
   ```

3. Start or re-start all services, including `EventsProcessor`.

### Integrations and integration configurations

Organizations can configure integration configurations to send events to different endpoints -- each
handler maps to a specific integration and checks for the configuration when it receives an event.
Currently, there are integrations / handlers for Slack and webhooks (as mentioned above).

**`OrganizationIntegration`**

- The top level object that enables a specific integration for the organization.
- Includes any properties that apply to the entire integration across all events.

  - For Slack, it consists of the token:

    ```json
    { "token": "xoxb-token-from-slack" }
    ```

  - For webhooks, it is `null`. However, even though there is no configuration, an organization must
    have a webhook `OrganizationIntegration` to enable configuration via
    `OrganizationIntegrationConfiguration`.

**`OrganizationIntegrationConfiguration`**

- This contains the configurations specific to each `EventType` for the integration.
- `Configuration` contains the event-specific configuration.

  - For Slack, this would contain what channel to send the message to:

    ```json
    { "channelId": "C123456" }
    ```

  - For Webhook, this is the URL the request should be sent to:

    ```json
    { "url": "https://api.example.com" }
    ```

- `Template` contains a template string that is expected to be filled in with the contents of the
  actual event.
  - The tokens in the string are wrapped in `#` characters. For instance, the UserId would be
    `#UserId#`
  - The `IntegrationTemplateProcessor` does the actual work of replacing these tokens with
    introspected values from the provided `EventMessage`.
  - The template does not enforce any structure -- it could be a freeform text message to send via
    Slack, or a JSON body to send via webhook; it is simply stored and used as a string for the most
    flexibility.
