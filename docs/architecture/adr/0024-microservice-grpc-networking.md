---
adr: "0024"
status: Proposed
date: 2024-11-20
tags: [server, architecture, communication]
---

# 0024 - Adopting gRPC for Inter-Service Communication

<AdrTable frontMatter={frontMatter}></AdrTable>

## Context and Problem Statement

As Bitwarden's microservices architecture continues to evolve, the need for efficient, reliable, and
performant inter-service communication becomes increasingly critical. Our current REST-based API
communication model, while functional, may not be optimal for all types of service-to-service
interactions, especially as we scale and introduce more complex, high-throughput operations.

We need to evaluate whether adopting gRPC for inter-service communication could provide benefits in
terms of performance, type safety, and developer productivity.

### What is gRPC and why is it beneficial?

gRPC (gRPC Remote Procedure Call) is an open-source framework developed by Google for efficient and
fast inter-service communication. It offers several advantages over traditional REST APIs and other
HTTP/1.1 technologies:

1. **Performance**: gRPC uses Protocol Buffers as its interface definition language and binary
   serialization format, resulting in smaller payload sizes and faster processing compared to
   text-based serialization formats like JSON or XML.

2. **HTTP/2 Support**: gRPC leverages HTTP/2, which provides features like multiplexing, header
   compression, and bidirectional streaming, leading to improved network utilization and reduced
   latency.

3. **Strong Typing**: With Protocol Buffers, gRPC provides strong typing for request and response
   objects, reducing errors and improving developer productivity.

4. **Code Generation**: gRPC automatically generates client and server code, simplifying development
   and ensuring consistency across different languages and platforms.

5. **Streaming**: gRPC not only supports unary RPCs, but also natively supports server-to-client
   streaming, client-to-server streaming, and bidirectional streaming, allowing for more efficient
   real-time communication between services.

6. **Language Agnostic**: gRPC supports multiple programming languages, making it easier to build
   polyglot microservices architectures, if desired.

7. **Deadline/Timeout Propagation**: gRPC has built-in support for deadline propagation and request
   cancellation, improving system resilience and resource management.

These benefits, and others not mentioned, make gRPC particularly well-suited for microservices
architectures, high-performance systems, and scenarios requiring real-time communication between
services.

## Considered Options

- **Maintain current REST-based communication** - Continue using REST APIs for all inter-service
  communication.
- **Adopt gRPC for all inter-service communication** - Completely replace REST with gRPC for all
  service-to-service interactions.
- **Hybrid approach** - Implement gRPC for all new services while maintaining existing solutions.
- **Evaluate alternative RPC frameworks** - Consider other RPC frameworks like Apache Thrift or
  Apache Avro.

## Decision Outcome

Chosen option: **Hybrid approach - Implement gRPC for all new services while maintaining REST for
existing ones**.

This approach allows us to leverage the benefits of gRPC for future development without the need to
immediately refactor existing services, providing a gradual transition path. This leaves us the
flexibility to refactor existing services to gRPC as needed, while also providing a path for gradual
migration and new development.

### Positive Consequences

- Improved performance and efficiency for all new services due to gRPC's binary serialization and
  HTTP/2 support.
- Simplifies contracts between services due to gRPC's usage of Protocol Buffers as the interface
  definition language and serialization format.
- Enhanced type safety and contract-first development with Protocol Buffers for new services.
- Better support for streaming in new services, enabling more real-time features.
- Gradual adoption allows for learning and adjustment without disrupting existing systems.

### Negative Consequences

- Increased complexity in the system architecture with two communication protocols.
- Slight learning curve for developers to become proficient with gRPC and Protocol Buffers.
- Additional tooling and infrastructure required to support both gRPC and REST.
- Inconsistency in communication protocols across the architecture during the transition period.
- While Android, iOS, and Rust, all support gRPC, browser support is currently limited for gRPC. If
  we want a future reality where we primarily use gRPC, we'll likely still need a RESTful, HTTP/1
  based API gateway for browsers to route requests to downstream gRPC services.

### Plan

1. Establish guidelines and best practices for implementing gRPC in new services.
2. Develop a proof-of-concept implementation for the next planned service.
3. Create comprehensive documentation and training materials for the development team on gRPC and
   Protocol Buffers.
4. Implement gRPC for all new services moving forward.
5. Develop strategies for efficient communication between gRPC and REST services during the
   transition period.
6. Implement monitoring and observability solutions that support both gRPC and REST traffic.
7. Evaluate the impact and benefits after implementing several new services with gRPC.
8. Consider a long-term plan for gradually migrating existing REST services to gRPC based on the
   success of new implementations.

## Additional Considerations

- Ensure compatibility with our current C# server-side codebase and tooling for both REST and gRPC
  implementations.
- Adapt our CI/CD pipelines and testing strategies to accommodate both REST and gRPC services.
- Evaluate the implications for our SDK written in Rust and plan for potential updates to support
  gRPC.
- Consider the opportunities for our mobile clients to adopt gRPC for client-server communication.
- Assess the impact on our self-hosted instances and ensure they can support both communication
  protocols.
- Consider the implications for external integrations and develop strategies to support both REST
  and gRPC interfaces as needed.

This decision allows for a gradual adoption of gRPC while maintaining stability in existing
services. We will continuously evaluate the effectiveness of this approach and adjust our strategy
as necessary.
