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

## Usage

- publish/subscribe
- request/response

## Message format
