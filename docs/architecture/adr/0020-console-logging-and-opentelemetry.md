---
adr: "0020"
status: In progress
date: 2023-07-05
tags: [server]
---

# 0020 - Logging and Observability with the Console and OpenTelemetry

<AdrTable frontMatter={frontMatter}></AdrTable>

## Context and Problem Statement

As the server platform has matured so have the various logging extensions to support additional use
cases and customer requests. [Serilog][serilog] is in place via shared logic for all services,
initiated at startup, and over time additional its "sinks" with their needed configuration have been
added as dependencies leaving this core logging layer with a growing list of conditions on how and
when to use certain types of structured logging. Maintenance needs have grown to keep sink
dependencies up to date and more are desired to be added. Some of the presently-available sinks have
very little use and / or better alternatives now exist.

Along with the maturation of the codebase, the userbase of the platform has also grown significantly
and more insight is needed into how services are performing at a fine-grained level. External
profilers can certainly be attached in any running environment, but the platform itself needs to
offer internal metrics not just to support customers running the product but to enable engineers to
improve it and tackle performance issues with solid data and evidence as to what and why something
should change.

## Considered Options

:::note

Bitwarden uses [Datadog][dd] as its monitoring tool and desires to increase its usage by engineers
across the board to improve what we deliver.

:::

- **Maintain current logging and observability options** - Support what is available today for
  logging methods and expect those running the platform to configure what they need outside of it
  for log collection and profiling / monitoring.
- **Extend the plaform to specifically support Datadog** - A Serilog sink [exists][ddsink] and the
  platform can send logs directly to Datadog. Tracing [also exists][ddtracer] in package form and
  could be coded into application startup.
- **Consolidate logging providers and use open standards** - Announce deprecation and migration
  plans for sinks not aligned with core needs and center on the console for logs as well as new
  instrumentation and metrics data.

## Decision Outcome

Chosen option: **Consolidate logging providers and use open standards**.

### Positive Consequences

- Streamlined logging experience across components.
- Console logging fits well into container and orchestration tools.
- Elimination of several third-party dependencies and their maintenance, as well as global settings.
- No new dependencies that are merely aligned with the Bitwarden-specific cloud and its service
  providers.
- Components can be monitored with far more detail and lead to future improvements.

### Negative Consequences

- A small number of users will need to migrate to console or similar ingestion of logs.
- The Admin Portal log browsing function will leave (if configured) in favor of using whatever is
  configured for log processing.

### Plan

#### Logging

Using standard support policies, release notes will include a mention that three Serilog sinks will
be removed:

- CosmosDb
- Sentry
- Syslog

The remaining sinks -- core functionality of Serilog -- will continue to be supported:

- Console (implicit and driven via configuration)
- File (largely as a fallback for deprecated or legacy logging approaches)

While the Serilog [console sink][serilogconsole] is currently an implicit dependency with what's
provided for ASP.NET Core, it will be explicitly referenced.

Solutions exist for users to shift processing of logs for the removed sinks to console or file and
retain their integration. Admin Portal users can similarly continue to use CosmosDb for log
retention, but it is suggested that application monitoring that's available be used instead that
should in essentially all cases be able to receive and process console logs.

Cloud installations -- including Bitwarden's own -- will shift to configuration via environment
variables or otherwise to utilize structured console logs for processing explicitly with [Serilog
configuration][serilogconfig] e.g.:

```json
{
  "Serilog": {
    "Using": ["Serilog.Sinks.Console"],
    "MinimumLevel": "Verbose",
    "WriteTo": [{ "Name": "Console" }],
    "Enrich": ["FromLogContext"],
    "Properties": {
      "Project": "BitwardenProjectName"
    }
  }
}
```

This will allow better usage of `appsettings.json` and a richer developer experience. Existing
built-in ASP.NET Core logging will continue to be available if desired, but the recommendation will
be to move to a Serilog configuration.

Code cleanup will be performed around Serilog usage, such as:

- Removal of overuse of inclusion predicates that complicate (or sometimes block) effective log
  output.
- Alignment with .NET Core and Serilog best practices on initialization and usage of Serilog itself.
- Improvements in logging initialization reliability and working with configuration issues, as well
  as more resilient tear-down when a component stops / ends.
- Removal of the above-deprecated sinks, in the final release of the support window.

#### Observability

.NET Core's `System.Diagnostics` library supports the emission of metrics compatible with
[OpenTelemetry][otel], and traces and metrics within the platform will become available on the
console and via OTLP export. Configuration will be provided to turn either on or off.

The initial implementation will provide default instrumentation details coming from ASP.NET Core and
any used HTTP clients. Automatic instrumentation at a lower level will be explored at a future date.
It is expected that local processes will ingest logs / exports.

Over time and where needed, application logic to track custom [signals][otelsignals] will be added
for deeper insights, especially in critical code paths. Standards will be developed and documented
on how to approach metric collection.

[serilog]: https://serilog.net/
[dd]: https://www.datadoghq.com/
[ddsink]: https://www.nuget.org/packages/serilog.sinks.datadog.logs
[ddtracer]: https://www.nuget.org/packages/Datadog.Trace.Bundle
[serilogconsole]: https://www.nuget.org/packages/serilog.sinks.console
[serilogconfig]: https://www.nuget.org/packages/Serilog.Settings.Configuration/
[otel]: https://opentelemetry.io/
[otelsignals]: https://opentelemetry.io/docs/concepts/signals/
