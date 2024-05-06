---
adr: "0018"
status: Accepted
date: 2023-02-01
tags: [server]
---

# 0018 - Feature management

<AdrTable frontMatter={frontMatter}></AdrTable>

## Context and Problem Statement

New functionality continues to be added to the platform while pressures exist to deploy more
frequently with less development in isolation. Quality assurance teams desire to keep said quality
of the products in place as do operations teams with respect to reliability and performance.
Features can often be delivered in small chunks over time in parallel and there is a need to control
their impact on systems by limiting their release to specific audiences and enabling
experimentation.

## Considered Options

- **Add / change functionality directly** - Make changes via the SDLC and code review and merge into
  the mainline release branch once approved. Work through issues and hotfixes as needed, alongside
  other feature development.
- **Implement a feature management system internally** - Utilize frameworks in code and store
  feature flags and other components in our own storage, streaming their updates in a proprietary
  way if at all (e.g. only loading configuration at application startup).
- **Adopt a feature management system with local fallback** - Implement a service provider's
  offering for more robust feature management capabilities such as real-time streaming and user /
  context targeting. Support a local configuration for self-hosted installations that may want to
  test or adopt a feature that isn't fully supported yet.

## Decision Outcome

Chosen option: **Adopt a feature management system with local fallback**.

### Positive Consequences

- Robust feature set for flags and their variations.
- Protection from changes and targeted impact, along with a speed in overall delivery (with managed
  functionality assumed to be turned "off").
- Context-sensitive application of features.
- Logging and traceability of who can experience or experiment with a feature.

### Negative Consequences

- Costs for selecting a service provider.

### Plan

The [server][server] codebase will adopt a .NET SDK for a service provider that offers feature
management. Only the server-side SDK will be used to manage access and cost and feature states will
be communicated down to calling clients where appropriate via API response elements. New features
will be set up inside the service provider's platform, and changes to them will be streamed to the
running applications. Access to the provider will be controlled internally.

To facilitate when feature states need to be used by clients amongst other configuration, API(s)
will be expanded to provide a collection of configuration values. Some of these values are already
maintained persistently and will be intermixed with feature keys. Clients will refresh configuration
upon startup, login, when their local configuration is updated, and when sync events come in.

Contexts will be established that communicate to the API using supported clients. Said contexts will
be available within the service provider for specific targeting as desired. Contexts will be
established for the user, organization, and machine account (previously known as service account),
with unique IDs for the entity as a key and other details as needed. Context attributes when needed
can be marked as private to avoid spillover to the service provider, and the provider will be added
if needed to the [subprocessor list][subprocessors] with respective communication should PII be
used.

Compile-time configuration will be converted wherever possible to use the feature management service
provider. SDK access to the service provider will be segmented by environment; some features may
never progress to all environments.

New features will be expected to be "off" as a default state. Variations for non-Boolean values will
allow for customization. Offline access (also implying there is no connectivity needed outside the
installation) to feature states via the service provider will be available given the default state
configuration. Local files can exist to load opt-ins to features for self-hosted installations, and
said installations will default to an offline mode.

The software development lifecycle will be enhanced to make clear that essentially all feature
development should be protected with flags.

Support for using an [OpenFeature][openfeature]-compatible interface in the codebase will be
considered.

[server]: https://github.com/bitwarden/server
[subprocessors]: https://bitwarden.com/help/subprocessors/
[openfeature]: https://docs.openfeature.dev/docs/reference/intro/
