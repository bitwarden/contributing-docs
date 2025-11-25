# Event Logs

Bitwarden event logs are used for Teams and Enterprise organizations to capture timestamped records
of events that occur within the organization. For documentation on how to view events, see the
[Help Center](https://bitwarden.com/help/event-logs/).

## Types of Events

The events that we log can be broken down into two different types, based on where the event is
triggered.

<!--prettier-ignore-->
| Trigger Location | Description |
| ---------------- | ------------ |
| Server | User actions that manifest as server-side operations, generally anything related to organization management. |
| Client | User interactions on locally synced data that does not result in server-side operations. These are typically prefixed with a `Client_` prefix. One example is `Cipher_ClientAutofill` which logs the autofill of organization items. |

Whenever possible we prefer to use server-side events since they incur less network traffic and
cannot be circumvented by modifying the client.

## Writing events

Events are handled on our clients through the
[`EventCollectionService`](https://github.com/bitwarden/clients/blob/main/libs/common/src/services/event/event-collection.service.ts)
and
[`EventUploadService`](https://github.com/bitwarden/clients/blob/main/libs/common/src/services/event/event-upload.service.ts)
for our JavaScript clients and the
[`EventService`](https://github.com/bitwarden/mobile/blob/main/src/Core/Services/EventService.cs)
for our mobile clients. These services enqueue the events into a collection stored client-side which
is periodically uploaded to the server, currently at 60 seconds intervals. Logs are also uploaded on
logout, so there are no events orphaned in the collection.

Uploaded event logs are sent to the server through `POST` requests to the `/collect` endpoint on the
Events service, which is handled by the `CollectController`. The controller performs some basic
mapping before passing the events to the `EventService`.

Server-side events are sent directly to the `EventService`, bypassing the Events service completely.

The `EventService` implementation differs for the cloud and self-hosted instances. This is handled
by the `IEventWriteService`.

### Cloud-Hosted

For cloud-hosted instances, we use the
[`AzureQueueEventWriteService`](https://github.com/bitwarden/server/blob/main/src/Core/Services/Implementations/AzureQueueEventWriteService.cs)
implementation, which writes the events to an Azure Queue that is specified in the
`globalSettings.Events.ConnectionString` configuration setting.

The events in the Azure Queue are then processed by the `EventsProcessor` service that runs in the
Bitwarden cloud-hosted instance. The `EventsProcessor` is running the
[`AzureQueueHostedService`](https://github.com/bitwarden/server/blob/main/src/EventsProcessor/AzureQueueHostedService.cs),
which dequeues the event logs from the Azure Queue and writes them to Azure Table storage using the
[`EventRepository`](https://github.com/bitwarden/server/blob/main/src/Core/Repositories/TableStorage/EventRepository.cs).

### Self-Hosted

On self-hosted instances, the
[`RepositoryEventWriteService`](https://github.com/bitwarden/server/blob/main/src/Core/Services/Implementations/RepositoryEventWriteService.cs)
writes the event logs to the `Events` database table directly using the `EventRepository`.

## Querying events

Event logs are queried through the
[`EventsController`](https://github.com/bitwarden/server/blob/main/src/Api/Public/Controllers/EventsController.cs)
on the Bitwarden API.

As with writing events, the querying of events differs based on the hosting method used for your
Bitwarden instance. Since the events are logged to different places (Azure Table storage vs. the
Bitwarden SQL database), the querying of these events must be different as well.

We do this with Dependency Injection in the `Api` project. The
[`IEventRepository`](https://github.com/bitwarden/server/blob/main/src/Core/Repositories/IEventRepository.cs)
will have different implementations based on the hosting environment and the database provider in
use.

### Cloud-Hosted

For cloud-hosted Bitwarden instances, the `EventsController` will query the Azure Table storage to
look for the event logs, through the
[`Bit.Core.Repositories.TableStorage.EventRepository`](https://github.com/bitwarden/server/blob/main/src/Core/Repositories/TableStorage/EventRepository.cs)
class, which implements `IEventRepository`.

### Self-Hosted

On self-hosted Bitwarden instances, the `EventsController` will use the `IEventRepository` to query
the `Events` database table for the event logs.
