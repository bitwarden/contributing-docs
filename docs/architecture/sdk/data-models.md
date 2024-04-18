# Data Models

The SDK is expected to be used in a variety of projects, and to that end it defines a stable public
interface. Care must be taken to avoid exposing the inner workings on the SDK including it's data
model.

## Public interface

The public interface of the SDK is anything that is exposed externally, be it function names, types,
or exposed models. The SDK generally exposes request and response models that contains the expected
data for each API call.

We can generally group the public models into the following categories:

- **View models**: These are models that generally represents a decrypted state, examples are
  `CipherView`, `CipherListView`, `FolderView`, etc.
- **Request models**: These are models that are used to send data into the SDK. Some examples are
  `ProjectGetRequest`, `ProjectCreateRequest`, etc.
- **Response models**: Returns data from the SDK, one example is `ProjectResponse`.

## Internal models

The SDK also maintains internal models

- **Api models**: These are [auto-generated models](./server-bindings.md) that are used to interact
  with the server.
- **Domain models**: These are the general data models used to represent a specific concern in the
  SDK. For example, `Cipher`, `Folder`, etc.
- **DTO**: Data Transfer Objects are used to transfer data between layers of the SDK. They are
  generally used to decouple the domain models from the API models.

```kroki type=plantuml
@startuml
skinparam componentStyle rectangle
component [""<Domain>""] as Domain
component [""<API><Modifier>""Requests] As Requests
component [""<API>""Response] as Response
component [""<Domain>""Views] as Views
component [""<Domain>""DTOs] as DTOs

[Response] -r-> [Domain]
[Domain] -r-> [Requests]
[Domain] <--> [Views]
[Domain] <--> [DTOs]
@enduml
```
