---
adr: "0023"
status: Accepted
date: 2024-10-22
tags: [server]
---

# 0023 - Identifying Integrated Clients

<AdrTable frontMatter={frontMatter}></AdrTable>

## Context and Problem Statement

Traffic on the Bitwarden platform continues to grow. As that load increases on our systems it
becomes imperative to understand how and when our various clients are connecting to our API and
other server-side components. Not all traffic is currently well-formed and certain key pieces of
information such as accurate device type signatures and user agents as well as client versions are
missing or invalid. To best support client-server interactivity there is a desire to not only inform
deprecated or obsolete integrations that there could be issues, but to protect those server-side
components from integrations that could do outright harm to the platform or client data.

Beyond the immediate observability needs, there is a significant portion of the community that uses
alternative (not developed by Bitwarden) clients to access vault data and perform operations. These
integration methods are perfectly acceptable but are largely unknown, with many not necessarily
being offered as independent applications but custom integrations for proprietary purposes.
Bitwarden would like to register these integrations somehow to better understand platform usage and
utilize common sense constraints to keep the overall platform more resilient and prepare for traffic
shape changes. Furthermore, a number of Bitwarden-developed integrations are largely external such
as our [Splunk][splunk] and [Sentinel][sentinel] apps that should also be registered.

## Considered Options

- **Maintain current integration method** - Make no changes to validation or registration of traffic
  and expect self-regulation of integrations.
- **Support only Bitwarden integrations** - Utilize application signature checks and other security
  features to only allow Bitwarden-developed clients to connect to server-side components, therefore
  constraining traffic to known entities.
- **Validate baseline expectations** - Inspect and eventually enforce several checks on traffic so
  that all integrations provide a minimum amount of information on their state so that the platform
  can be better monitored.
- **Register integrations along with validation** - Develop a simple registration method for
  integrations so that they are enumerated and known to Bitwarden, whether internally or externally
  developed. Associate validation with registered integrations for enhanced developer feedback.

## Decision Outcome

Chosen option: **Register integrations along with validation**.

While this is more effort for Bitwarden to develop than just adding validation, combining efforts to
expect more from integrations' request data with also providing a registration identifier is a
simple addition.

### Positive Consequences

- Integrations are registered and known to the platform for sensible traffic identification.
- Bitwarden's operations group receives data to aid in maintainability of the platform, especially
  to keep things running well for users while keeping out bad actors.
- Feedback to Bitwarden support teams on version usage is available.
- Bitwarden's support policy of a certain number of major versions can be more actively enforced.

### Negative Consequences

- Integrations will need to make the effort to register with Bitwarden and adjust their requests,
  potentially with brief disruptions for them.
- Very small latency may be added for the additional validations.

### Plan

Documentation will be provided on the Help Center or this contributing docs site indicating the
minimally-required request headers for all clients to provide when communicating to the Bitwarden
platform. Release notes will include mention of this and the future enforcement after a set number
of major releases. Documentation will also be expanded to offer guidance on how unofficial clients
should form their provided client version to accurately represent supported "windows" of
client-server interactivity (or a mapping to the latest Bitwarden server release they have certified
or tested their integration against) as well as an appropriate [device type][devicetypes].

Operations teams will perform the necessary development to validate that required headers are
present and enable its enforcement after that time; requests will be rejected as a `400 Bad Request`
when required headers are missing and a `403 Forbidden` when provided headers or their values are
not supported.

A process will be established for integrations to submit support tickets requesting a client
identifier. Customer Success will work with operations teams to register integrations and deliver
the needed information. Existing Bitwarden integrations will be issued their own client identifiers.
Client details will be provided in requests to the Bitwarden platform, with the goal being the
identification of conformance per client to the technical needs of the Bitwarden server infrastructure; attestation and the guarantee that a client is
who they say they are will be considered as a future effort. Subsequent enhancements may occur
beyond the client identifier wherein API keys and authentication token scopes will further refine
permissions of an integration.

Self-hosted instances will not perform any checks for client identifiers or required request data.

[splunk]: https://bitwarden.com/help/splunk-siem/
[sentinel]: https://bitwarden.com/help/microsoft-sentinel-siem/
[devicetypes]: https://github.com/bitwarden/server/blob/main/src/Core/Enums/DeviceType.cs
