# Inter-Process Communication (IPC)

Bitwarden uses IPC to allow communication between and within certain parts of our clients. The
oldest use-case is the communication between the Bitwarden browser extension and the Bitwarden
desktop application to allow the extension to be unlocked using biometric authentication.

Bitwarden now has a generic framework for IPC provided in the SDK. This framework is used to provide
a common interface for IPC across all clients. The framework is designed to be cross-platform and
can be used in any client that needs to communicate with another process.

## Architecture

The IPC framework is split into two main parts:

### Platform agnostic

The platform agnostic parts of the IPC framework are written in Rust and are responsible for the
high-level logic of the IPC communication. This includes the serialization and deserialization of
messages, as well as the encryption and decryption of messages. They depend on the platform-specific
parts to integrate with the underlying platform's IPC mechanisms.

```kroki type=plantuml
@startuml
skinparam BackgroundColor transparent
skinparam componentStyle rectangle
skinparam linetype ortho
skinparam Padding 7
hide members

package "Platform agnostic" <<frame>> {
    struct IpcClient

    interface CommunicationBackend
    interface CryptoProvider
    interface SessionRepository

    IpcClient --> CommunicationBackend: owns
    IpcClient --> CryptoProvider: owns
    IpcClient --> SessionRepository: owns

    CryptoProvider .l.> CommunicationBackend: uses
    CryptoProvider .r.> SessionRepository: uses

    struct NoEncryptionCryptoProvider

    CryptoProvider <|.. NoEncryptionCryptoProvider: implements
}

@enduml
```

### Platform specific

The platform specific parts of the IPC framework are written in different languages and are
responsible for the low-level communication between the processes. This includes the actual sending
and receiving of messages, persisting cryptographic sessions, as well as any other platform-specific
details of the IPC communication. Below is an illustration of the platform-specific implementation
for the WebAssembly (WASM) platform, which uses JavaScript to implement how messages are sent and
received.

```kroki type=plantuml
@startuml
skinparam BackgroundColor transparent
skinparam componentStyle rectangle
skinparam linetype ortho
skinparam Padding 7
hide members

package SDK <<frame>> {
    package "Platform agnostic" <<frame>> {
        struct IpcClient

        interface CommunicationBackend

        IpcClient --> CommunicationBackend
    }

    package "Platform specific (WASM)" <<frame>> {
        struct JsCommunicationBackend
    }
}

package JavaScript <<frame>> {
    class WebIpcService
    class IpcBackgroundService
}

JsCommunicationBackend -left|> CommunicationBackend

note bottom of JsCommunicationBackend
  JsCommunicationBackend converts the Rust trait into a JavaScript-compatible interface
end note

WebIpcService .up|> JsCommunicationBackend: implements
IpcBackgroundService .up|> JsCommunicationBackend: implements

WebIpcService -[hidden]-> IpcBackgroundService
JavaScript -down[hidden]-> SDK

@enduml

```

## Security

The IPC framework is designed with security in mind. Every message sent between processes is
converted to a `Vec<u8>` representation and encrypted using a `CryptoProvider` before being sent
over the communication channel. This ensures that messages are not sent in plain text and are
protected from eavesdropping or tampering. For consumers of the framework the encryption is
completely transparent, as the framework handles the encryption and decryption of messages
automatically.

The framework also supports session management, allowing clients to securely store and retrieve
cryptographic sessions. This is useful to avoid having to re-establish shared secrets or keys
between processes every time they communicate. The session management is handled by the
`SessionRepository` trait, and is implemented by the platform-specific parts of the IPC framework.
`CryptoProvider`s have full access to the `CommunicationBackend` which allows them to send and
receive their own messages over the communication channel to establish and maintain sessions. These
messages can be completely separate from the actual IPC data messages and might be completely
transparent to the consumer of the framework.

## Usage

The IPC framework provides a simple interface for sending and receiving messages between processes.
It supports two main communication patterns:

### Publish/Subscribe

This pattern allows consumers to subscribe to specific topics and receive messages published to
those topics. It is useful for scenarios where multiple consumers need to receive the same message,
such as notifications or updates. Consumers can subscribe to the raw data or a specific type of
message, and the framework will handle the serialization and deserialization of the messages, as
long as the type supports conversion to and from a `Vec<u8>` representation.

### Request/Response

This pattern allows a consumer to send a request to a producer and receive a response. It is useful
for scenarios where a consumer needs to request specific information or perform an action, such as
authentication or data retrieval. The framework handles the serialization and deserialization of the
messages, as long as the type supports conversion to and from a `Vec<u8>` representation.

## Message format
