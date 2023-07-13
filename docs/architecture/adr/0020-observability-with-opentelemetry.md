---
adr: "0020"
status: In progress
date: 2023-07-13
tags: [server]
---

# 0020 - Observability with OpenTelemetry

<AdrTable frontMatter={frontMatter}></AdrTable>

## Context and Problem Statement

Along with the maturation of the codebase over the years, the userbase of the platform has also
grown significantly and more insight is needed into how services are performing at a fine-grained
level. External profilers can certainly be attached in any running environment, but the platform
itself needs to offer internal metrics not just to support customers running the product but to
enable engineers to improve it and tackle performance issues with solid data and evidence as to what
and why something should change.

## Considered Options

:::note

Bitwarden uses [Datadog][dd] as its monitoring tool and desires to increase its usage by engineers
across the board to improve what we deliver.

:::

- **Maintain current observability options** - Expect those running the platform to configure what
  they need outside of it for log collection and profiling / monitoring.
- **Extend the plaform to specifically support Datadog** - [Tracing for Datadog][ddtracer] exists in
  package form and could be coded into application startup. Datadog-specific signals and metrics can
  be collected via code and sent to the platform.
- **Use open observability standards** - Utilize [OpenTelemetry][otel] and emit signals on the
  console as well as utilize its own eventing approach for instrumentation and metrics data.

## Decision Outcome

Chosen option: **Use open observability standards**.

### Positive Consequences

- Console logging fits well into container and orchestration tools.
- No new dependencies that are merely aligned with the Bitwarden-specific cloud and its service
  providers.
- Components can be monitored with far more detail and lead to future improvements.

### Negative Consequences

- Proprietary profiler implementations may offer signal information that OpenTelemetry can't,
  including automatic instrumentation.

### Plan

.NET Core's `System.Diagnostics` library supports the emission of metrics compatible with
OpenTelemetry, and traces and metrics within the platform will become available on the console and
via OTLP export. Configuration will be provided to turn either on or off.

The initial implementation will provide default instrumentation details coming from ASP.NET Core and
any used HTTP clients. Automatic instrumentation at a lower level will be explored at a future date.
It is expected that local processes will ingest logs / exports.

Over time and where needed, application logic to track custom [signals][otelsignals] will be added
for deeper insights, especially in critical code paths. Standards will be developed and documented
on how to approach metric collection.

[dd]: https://www.datadoghq.com/
[ddtracer]: https://www.nuget.org/packages/Datadog.Trace.Bundle
[otel]: https://opentelemetry.io/
[otelsignals]: https://opentelemetry.io/docs/concepts/signals/
