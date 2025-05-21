# Credential Generation

Bitwarden's credential generation framework provides services used to generate passwords, usernames,
and email addresses across all of our clients. At present, there are several frameworks in use.

- The Android and iOS clients directly invoke SDK functions.
- The CLI client invoke promise-based `PasswordGenerationService` and `UsernameGenerationService`
  interfaces.
- All other clients are transitioning to the reactive `CredentialGeneratorService` interface.

This deep dive is focused on the reactive interfaces, which are the compatibility target Tools is
focusing on across all implementations.

## Concepts

### Algorithms and Types

Credential algorithm - each algorithm provides a different way to generate a credential. Credential
types - these allow a caller to say ‘use my preferred credential algorithm’.

### Metadata

The core logic resides in several files:

    metadata/data.ts - these are enum-alike data structures used to derive and conveniently access type information
    metadata/type.ts - root data structures used to identify extensions and interact with extension data

Domain metadata then builds on top of the algorithms and types:

    Algorithm metadata - describes algorithms and capabilities
    Profile metadata - describes a use-case for the generator
        At present all generators share the "account" profile.
        This was introduced to enable a secondary profile for master password generation.
        Profiles also enable settings to be provided by the generator ("core") or to be delegated to a secondary system. The first use-case enables the extension system to provide settings (future PR). It could also be used to create collection-bound or autofill-provided profiles.
    Generator metadata - combines algorithm metadata, profile metadata, and engine creation logic for use by the credential generator service.

The metadata provider combines static generator metadata provided at startup time with a dynamic
list of forwarder metadata computed at metadata-lookup-time. This lets observables with complex type
signatures, such as the generator code, operate in a type-safe way with type erasure while
encapsulating policy, platform availability, and user preference settings.

### Profiles

Credential profiles - these allow system integrations (e.g. device login) to customize how policy
and settings are managed at an integration site. The generator profiles may include their own
storage options, default generator values, generator UI rules (constraints), and policy targets.

### Preferences

## Logging

The generator's reactivity model is time-sensitive, which makes identifying and diagnosing runtime
behaviors difficult. Consider, for example, interactively debugging an observable subject to
`timeout()`. Because the computer's clock keeps running when the debugger is paused, stopping a
program subject to this operation can exhaust the timeout, resulting in
[heisenbugs](https://en.wikipedia.org/wiki/Heisenbug). The generator's permanent runtime logging
facilities decrease this complexity of debugging by writing structured logs using the
`SemanticLogger`.

When a generator creates a logger, it sets the log's `type` parameter. This can be filtered by
editing XYZ.

> [!WARNING] The `SemanticLogger` writes arbitrary runtime information into the console. It is
> automatically disabled outside of development environments to mitigate data leaks.
