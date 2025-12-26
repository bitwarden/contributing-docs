---
sidebar_position: 4
---

# Event Logging

## Requirements

- Completed the [Server Setup Guide](./guide.md)
- An
  [enterprise organization](https://bitwarden.com/help/about-organizations/#types-of-organizations)

## `EventService`

The `EventService` controls how events are stored and routed. Here's how this works:

1. A user carries out an action which needs to be logged
2. If the event is client-side (e.g. viewing a password), the client sends details of the event to
   the Events server project, which then calls `EventService`. If the event is server-side, the
   relevant project calls `EventService` itself.
3. The `EventService` then delegates to an implementation of `IEventWriteService` for the Event to
   be stored and/or broadcast.

There are three main implementations that are supported. Dependency injection will decide which
implementation to use based on the configuration provided. If multiple systems are configured, it
picks the first in priority order:

1. Distributed events (over Azure Service Bus)
2. Distributed events (over RabbitMQ)
3. Azure Queue
4. Database Storage

## Distributed events

Events can be distributed via an AMQP messaging system. This messaging system enables new
integrations to subscribe to the events. The system supports either RabbitMQ or Azure Service Bus.
For a detailed look at the architecture and technical details, see
[the documentation in the server repo](https://github.com/bitwarden/server/tree/6800bc57f3eb492222e128cffcd00e16b29cc155/src/Core/AdminConsole/Services/Implementations/EventIntegrations).

### Azure Service Bus

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
           "eventTopicName": "event-logging",
           "integrationTopicName": "event-integrations",
           "eventRepositorySubscriptionName": "events-write-subscription",
           "slackSubscriptionName": "events-slack-subscription",
           "webhookSubscriptionName": "events-webhook-subscription"
         }
       },
   ```

   :::info

   The `slackSubscriptionName` and `webhookSubscriptionName` specified above (as well as other
   integration subscription names not shown here) are optional. If they are not defined, the system
   will use the default names.

   :::

2. Re-run the secrets script to publish the new secrets

   ```bash
   pwsh setup_secrets.ps1 -clear
   ```

3. Start or re-start all services, including `EventsProcessor` (which is where the Azure Service Bus
   listeners run)

### RabbitMQ

#### Running the RabbitMQ container (default using fixed-delay queues)

1.  Verify that you've set a username and password in the `.env` file (see `.env.example` for an
    example)

2.  Use Docker Compose to run the container with your current settings:

    ```bash
    docker compose --profile rabbitmq up -d
    ```

- The compose configuration uses the username and password from the `env` file.
- It is configured to run on localhost with RabbitMQ's standard ports, but this can be customized in
  the Docker configuration.

3.  To verify this is running, open `http://localhost:15672` in a browser and login with the
    username and password in your `.env` file.

#### Running the RabbitMQ container (with optional delay plugin)

The standard installation of RabbitMQ does not support delaying message delivery. Our default option
instead uses retry queues with a fixed amount of delay and checks the `DelayUntilDate` in each
message to see if it is time for them to be processed. This provides the delay needed for retries
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
        "eventExchangeName": "events-exchange",
        "integrationExchangeName": "integration-exchange",
        "eventRepositoryQueueName": "events-write-queue",
        "slackQueueName": "events-slack-queue",
        "webhookQueueName": "events-webhook-queue",
        "useDelayPlugin": false
      }
    }
    ```

    :::info

    The `slackQueueName` and `webhookQueueName` specified above (as well as other integration queue
    names not shown here) are optional. If they are not defined, the system will use the default
    names.

    :::

2.  Re-run the PowerShell script to add these secrets to each Bitwarden project:

    ```bash
    pwsh setup_secrets.ps1
    ```

3.  Start (or restart) all of your projects to pick up the new settings. The `Events` project is
    where the RabbitMQ listeners run (it is not necessary to run `EventsProcessor`)

With these changes in place, you should see the database events written as before, but you'll also
see in the RabbitMQ management interface that the messages are flowing through the configured
exchange/queues.

## Azure Queue

The `AzureQueueEventWriteService` implementation uses a configured Azure Queue to store events. The
`AzureQueueHostedService` (running in `EventsProcessor`) retrieves and processes the events to
storage.

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

Self-hosted instances of Bitwarden use an `IEventWriteService` implementation to write event logs
directly to the `Event` table in their database.

To use database storage for events:

1. Run your local development server in a [self-hosted configuration](./self-hosted/index.mdx) (Api,
   Identity and web vault)
2. Start the Events project using `dotnet run` or your IDE (note: EventsProcessor is not required
   for self-hosted)
