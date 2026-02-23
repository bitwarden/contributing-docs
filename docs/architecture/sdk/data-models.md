# Data models

The SDK is expected to be used in a variety of projects, and to that end it defines a stable public
interface. Care must be taken to avoid exposing the inner workings on the SDK including its data
model.

## Public interface

The public interface of the SDK is anything that is exposed externally, be it function names, types,
or exposed models. The SDK generally exposes request and response models that contains the expected
data for each API call.

We can generally group the public models into the following categories:

- **View models**: Models that generally represents a decrypted state, examples are `CipherView`,
  `CipherListView`, `FolderView`, etc.
- **Request models**: Models that are used to send data into the SDK. Some examples are
  `ProjectGetRequest`, `ProjectCreateRequest`, etc.
- **Response models**: Returns data from the SDK e.g. `ProjectResponse`.

### Create vs. Edit request models

When a resource supports both create and edit operations, define **separate** `*CreateRequest` and
`*EditRequest` structs rather than a single combined `*AddEditRequest` struct.

The key motivation is encoding intent in the type system. Create and edit operations often have
meaningfully different fields — for example, an edit typically requires identifying the existing
item (e.g. `id`, `revision_date`), while some fields may only be set on creation and are immutable
thereafter. A combined struct forces optional fields where none should exist, obscures which fields
are valid in each context, and pushes the burden of validation from the compiler to the implementer
and consumer. This leads to ambiguous contracts ("what happens if I pass a key on create?") and
potential bugs on either side.

Separate structs make each operation's contract explicit and self-documenting.

### Variant data in models

When a model has a type discriminant where each variant carries its own data, use an **enum with
associated data** rather than a bare discriminant field alongside multiple `Option` fields.

```rust
// Preferred
pub enum SendContent {
    Text(SendTextView),
    File(SendFileView),
}

// Avoid
pub r#type: SendType,
pub text: Option<SendTextView>,
pub file: Option<SendFileView>,
```

The flat pattern allows invalid states — the wrong variant populated for a given type, or multiple
variants populated simultaneously — and forces every consumer to reason about combinations that
should be impossible.

The server wire format uses numeric discriminants and optional fields, but that transformation
belongs at the API→domain mapping boundary, not in the domain or view models.

## Internal models

The SDK also maintains internal models:

- **API models**: Auto-generated models that are used to interact with the server.
- **Domain models**: General data models used to represent a specific concern in the SDK. For
  example, `Cipher`, `Folder`, etc.
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
