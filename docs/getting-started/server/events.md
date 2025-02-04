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
integrations to subscribe to the events.

The RabbitMQ implementation adds a step that refactors the way events are handled when running
locally or self-hosted. Instead of writing directly to the `Events` table via the
`EventsRepository`, each event is broadcast to a RabbitMQ exchange. A new
`RabbitMqEventRepositoryListener` subscribes to the RabbitMQ exchange and writes to the `Events`
table via the `EventsRepository`. The end result is the same (events are stored in the database),
but the addition of the RabbitMQ exchange allows for other integrations to subscribe.

To illustrate the ability to fan-out events, `RabbitMqEventHttpPostListener` subscribes to the
RabbitMQ events exchange and `POST`s each event to a configurable URL. This is meant to be a simple,
concrete example of how multiple integrations are enabled by moving to distributed events.

```kroki type=mermaid
graph TD
	  subgraph With RabbitMQ
        B1[EventService]
        B2[RabbitMQEventWriteService]
        B3[RabbitMQ exchange]
        B4[RabbitMqEventRepositoryListener]
        B5[RabbitMqEventHttpPostListener]
        B6[Events Database Table]
        B7[HTTP Server]

        B1 -->|IEventWriteService| B2 --> B3
        B3--> B4 --> B6
        B3--> B5
        B5 -->|HTTP POST| B7
    end

    subgraph Without RabbitMQ
        A1[EventService]
        A2[RepositoryEventWriteService]
        A3[Events Database Table]

        A1 -->|IEventWriteService| A2 --> A3

end
```

### Running the RabbitMQ container

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

### Configuring the server to use RabbitMQ for events

1.  Add the following to your `secrets.json` file, changing the defaults to match your `.env` file:

    ```json
    "eventLogging": {
      "rabbitMq": {
        "hostName": "localhost",
        "username": "bitwarden",
        "password": "SET_A_PASSWORD_HERE_123",
        "exchangeName": "events-exchange",
        "eventRepositoryQueueName": "events-write-queue",
      }
    }
    ```

2.  (optional) To use the RabbitMqEventHttpPostListener, specify a queue name and destination URL
    that will receive the POST inside the RabbitMq object:

    ```json
        "httpPostQueueName": "events-httpPost-queue",
        "httpPostUrl": "<HTTP POST URL>",
    ```

    - Tip: [RequestBin](http://requestbin.com/) provides an easy to set up server that will receive
      these requests and let you inspect them.

3.  Re-run the PowerShell script to add these secrets to each Bitwarden project:

    ```bash
    pwsh setup_secrets.ps1
    ```

4.  Start (or restart) all of your projects to pick up the new settings

With these changes in place, you should see the database events written as before, but you'll also
see in the RabbitMQ management interface that the messages are flowing through the configured
exchange/queues.
