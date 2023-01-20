---
sidebar_position: 5
---

# Event Logs

Bitwarden event logs are used for Teams and Enterprise organizations to capture timestamped records
of events that occur within the organization.

For documentation on how to view events, see our Help documentation
[here](https://bitwarden.com/help/event-logs/).

## Writing Events

Events are handled on our clients through the
[`EventCollectionService`](https://github.com/bitwarden/clients/blob/master/libs/common/src/services/event/event-collection.service.ts)
and
[`EventUploadService`](https://github.com/bitwarden/clients/blob/master/libs/common/src/services/event/event-upload.service.ts)
for our JavaScript clients and the
[`EventService`](https://github.com/bitwarden/mobile/blob/master/src/Core/Services/EventService.cs)
for our mobile clients. These services enqueue the events into a collection stored client-side which
is uploaded to the server on an interval, currently 60 seconds. Logs are also uploaded on logout, so
there are no events orphaned in the collection.

When uploaded, event logs are sent to the server through `POST` requests to the `/collect` endpoint
on the `Events` service.

At this point, the handling of the logs differs based on the hosting configuration of the Bitwarden
instance. This configuration is done through Dependency Injection in the
[`Startup`](https://github.com/bitwarden/server/blob/master/src/Events/Startup.cs) class on the
`Events` project. Namely, the implementation of
[`IEventWriteService`](https://github.com/bitwarden/server/blob/master/src/Core/Services/IEventWriteService.cs)
differs based on whether the instance is self-hosted or cloud-hosted.

### Cloud-Hosted

For cloud-hosted instances, the
[`AzureQueueEventWriteService`](https://github.com/bitwarden/server/blob/master/src/Core/Services/Implementations/AzureQueueEventWriteService.cs)
is injected into the DI container.

This service writes the events to an Azure Queue that is specified in the
`globalSettings.Events.ConnectionString` configuration setting.

The events in the Azure Queue are then processed by the `EventsProcessor` that runs in the Bitwarden
cloud-hosted instance. The `EventsProcessor` is running the
[`AzureQueueHostedService`](https://github.com/bitwarden/server/blob/master/src/EventsProcessor/AzureQueueHostedService.cs),
which dequeues the event logs from the Azure Queue and writes them to Azure Table storage
[`EventRepository`](https://github.com/bitwarden/server/blob/master/src/Core/Repositories/TableStorage/EventRepository.cs).

### Self-Hosted

On self-hosted instances, we cannot use the Azure Queue or Azure Table infrastructure available in
the cloud. Instead, the
[`RepositoryEventWriteService`](https://github.com/bitwarden/server/blob/master/src/Core/Services/Implementations/RepositoryEventWriteService.cs)
is injected into the DI container.

This service writes the event logs to the `Events` table in the Bitwarden database.

## Querying Events

Event logs are queried through the
[`EventsController`](https://github.com/bitwarden/server/blob/master/src/Api/Public/Controllers/EventsController.cs)
on the Bitwarden API.

As with writing events, the querying of events differs based on the hosting method used for your
Bitwarden instance. Since the events are logged to different places (Azure Table storage vs. the
Bitwarden SQL database), the querying of these events must be different as well.

We do this with Dependency Injection in the `Api` project. The
[`IEventRepository`](https://github.com/bitwarden/server/blob/master/src/Core/Repositories/IEventRepository.cs)
will have different implementations based on the hosting environment and the database provider in
use.

### Cloud-Hosted

For cloud-hosted Bitwarden instances, the `EventsController` will query the Azure Table storage to
look for the event logs, through the
[`Bit.Core.Repositories.TableStorage.EventRepository`](https://github.com/bitwarden/server/blob/master/src/Core/Repositories/TableStorage/EventRepository.cs)
class, which implements `IEventRepository`.

### Self-Hosted

On self-hosted Bitwarden instances, the `EventsController` will query the `Events` table in the
Bitwarden SQL database to look for the event logs. The `IEventRepository` implementation depends
upon whether the instance is using Entity Framework or Dapper to query the SQL database.

- Instances using EF:
  [`Bit.Infrastructure.EntityFramework.Repositories.EventRepository`](https://github.com/bitwarden/server/blob/master/src/Infrastructure.EntityFramework/Repositories/EventRepository.cs)
- Instances using Dapper:
  [`Bit.Infrastructure.Dapper.Repositories.EventRepository`](https://github.com/bitwarden/server/blob/master/src/Infrastructure.Dapper/Repositories/EventRepository.cs)
