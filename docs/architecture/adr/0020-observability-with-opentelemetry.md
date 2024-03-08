---
adr: "0020"
status: Accepted
date: 2023-07-13
tags: [server]
---

# 0020 - Observability with OpenTelemetry

<AdrTable frontMatter={frontMatter}></AdrTable>

## Context and Problem Statement

Along with the maturation of the codebase over the years, the number of users on the platform has
also grown significantly and more insight is needed into how services are performing at a
fine-grained level. External profilers can certainly be attached in any running environment, but the
platform itself needs to offer internal metrics not just to support self-hosted customers running
the product but to enable engineers to improve it and tackle performance issues with solid data and
evidence as to what and why something should change.

## Considered Options

:::note

Bitwarden currently uses [Datadog][dd] as its monitoring tool and desires to increase its usage by
engineers across the board to improve what we deliver.

:::

- **Maintain current observability options** - Expect those running the platform to configure what
  they need outside of it for log collection and profiling / monitoring.
- **Extend the platform to specifically support Datadog** - [Tracing for Datadog][ddtracer] exists
  in package form and could be coded into application startup. Datadog-specific signals and metrics
  can be collected via code and sent to the platform.
- **Implement native instrumentation** - Add logic via what's available from
  [`System.Diagnostics`][native] for custom instrumentation, and expect profiling to be configured
  per the first option above.
- **Use open observability standards** - Utilize [OpenTelemetry][otel] and emit signals on the
  console as well as utilize its own eventing approach for instrumentation and metrics data.

## Decision Outcome

Chosen option: **Use open observability standards**.

A strong alternative exists in just using native instrumentation, and not tying the platform to the
implementation of any specific ecosystem -- even an open standard like OpenTelemetry. .NET closely
supports OpenTelemetry metric collection integration but the desired power will be in how that data
is used via output mechanisms like OTLP. A profiler attached to running components is independent of
the availability of metrics via other means such as collection by an agent.

Accessibility to metrics via configuration wins out over the expectation to set up and manage a
profiler.

### Positive Consequences

- Console logging of metrics, if desired for use, fits well into container and orchestration tools,
  and said environments can install agents for their collection.
- No new dependencies that are merely aligned with the Bitwarden-specific cloud and its service
  providers.
- Components can be monitored with far more detail and lead to future improvements.
- Use of an open standard like OpenTelemetry creates future flexibility for monitoring and
  observability to grow with the expansion of that ecosystem, examples being the OTLP export vs.
  just console logging.

### Negative Consequences

- Addition of the OpenTelemetry dependency across all services.
- Proprietary profiler implementations may offer signal information that OpenTelemetry can't,
  including automatic instrumentation.
- With the capability to capture signals within the platform comes the burden of needing to maintain
  clear policies around not capturing sensitive data.

### Plan

.NET Core's `System.Diagnostics` library supports the emission of metrics compatible with
OpenTelemetry, and traces and metrics within the platform will become available on the console and
via OTLP export. Configuration will be provided to turn either on or off with new application
settings e.g.:

```json
{
  "OpenTelemetry": {
    "UseTracingExporter": "Console",
    "UseMetricsExporter": "Console",
    "Otlp": {
      "Endpoint": "http://localhost:4318"
    }
  }
}
```

Console and OTLP options will be available for the metrics and tracing export, along with the
ability to specify a gRPC or HTTP endpoint for OTLP. Segmentation of activities will continue to be
made using the configurable `ProjectName`.

The initial implementation will provide default instrumentation details coming from ASP.NET Core and
any used HTTP clients. Within Bitwarden the automatic instrumentation (profiler) may be explored at
a future date but a code-first solution is desired to allow for more control and less setup during
installation. It is expected that local processes will ingest logs / exports as desired.

Software development lifecycle enhancements will be made to clarify best practices and review
requirements for logging or monitoring changes. A [deep dive](/architecture/deep-dives) will be
added on logging and monitoring to showcase patterns for adding signal collection in code. Only
component runtime signals will be collected to start; no application payloads such as input and
output data will be collected in signals.

Over time and where needed, application logic to track custom [signals][otelsignals] (activities and
meters) will be approached for deeper insights, especially in critical code paths. Standards will be
developed and documented in the above deep dive on how to approach metric collection, without also
collecting sensitive information. Core utility classes will be developed that establish a
centralization of OpenTelemetry usage and make use in components easier and generic.

Observability functionality will be moved to a new shared library -- separate from the core -- for
host-oriented utilities. This library will be distributed as a NuGet package so that local `server`
projects as well as new, independent repositories for services can receive the benefits.

[dd]: https://www.datadoghq.com/
[ddtracer]: https://www.nuget.org/packages/Datadog.Trace.Bundle
[native]: https://learn.microsoft.com/en-us/dotnet/core/diagnostics/metrics-instrumentation
[otel]: https://opentelemetry.io/
[otelsignals]: https://opentelemetry.io/docs/concepts/signals/
