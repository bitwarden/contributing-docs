---
sidebar_position: 7
---

# Observability and health

**Audience:** engineers writing a Bitwarden service, and its API, with the server SDK.

Every service exports traces, metrics and logs over OTLP, tags them with whom a request concerns,
and answers the health probes an orchestrator asks. Name your own sources `Bitwarden.*` and register
health checks the usual way; the package does the rest.

## Add traces, metrics and logs

Name your own activity sources and meters `Bitwarden.*`, and the platform exports them without
further registration. Register health checks the usual way, and readiness asks them (unless they are
tagged for monitoring, below):

```csharp
using System.Diagnostics;
using System.Diagnostics.Metrics;
using Bitwarden.Server.Sdk.Service;
using Microsoft.Extensions.Diagnostics.HealthChecks;

internal sealed class WidgetService(string[] args) : Service("widget-service", "Widget Service", args)
{
    protected override void ConfigureServices(IServiceCollection services)
    {
        services.AddSingleton<WidgetPolisher>();

        // Asked by GET /api/v1/readiness; unhealthy answers 503.
        services.AddHealthChecks().AddCheck<WidgetStoreHealthCheck>("widget-store");
    }
}

internal sealed class WidgetPolisher(ILogger<WidgetPolisher> logger)
{
    // Named "Bitwarden.*", so the platform exports them without further registration.
    private static readonly ActivitySource Source = new("Bitwarden.Widgets");
    private static readonly Meter Meter = new("Bitwarden.Widgets");
    private static readonly Counter<long> Polished = Meter.CreateCounter<long>("widgets.polished");

    public void Polish(string widgetId)
    {
        using var activity = Source.StartActivity("Polish widget");
        activity?.SetTag("widget.id", widgetId);

        // The request's OrganizationId, UserId and ProviderId travel with this record as its
        // scope. Log identifiers only: never an encrypted member's value.
        logger.LogInformation("Polished widget {WidgetId}.", widgetId);
        Polished.Add(1);
    }
}

internal sealed class WidgetStoreHealthCheck : IHealthCheck
{
    public Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, CancellationToken cancellationToken = default) =>
        // The description is what readiness reports; exception text never is.
        Task.FromResult(HealthCheckResult.Unhealthy("The widget store is not reachable."));
}
```

What the package exports for you:

- **The resource** is named by the service's identifier, with `env` from the `DD_ENV` environment
  variable. The exporter reads the standard `OTEL_*` variables, such as
  `OTEL_EXPORTER_OTLP_ENDPOINT`.
- **Traces** from ASP.NET Core (exceptions recorded as span events), `HttpClient`, SqlClient, and
  every `Bitwarden.*`, `Azure.*` and `RabbitMQ.Client.*` activity source. A caller's W3C
  `traceparent` continues in the service, and every outgoing `HttpClient` call carries it.
- **Metrics** from ASP.NET Core, `HttpClient`, SqlClient, the runtime, and every `Bitwarden.*` and
  `Bit.*` meter.
- **Logs** with their formatted message and scopes.
- **Nothing** while the process only writes its OpenAPI document (`--emit-openapi`).

## Know who a record concerns

Each request gets a log scope naming `OrganizationId`, `UserId` and `ProviderId`, only those
present. The same values are set on the request's span as `bitwarden.organization_id`,
`bitwarden.user_id` and `bitwarden.provider_id`. You don't add them yourself.

The scope reads `IContext` as each message is written, so a message logged before authentication
carries nothing.

## Notice a call back into your service

Every call one service makes to another through a client package carries `Bitwarden-Call-Chain`: the
services the request passed through, oldest first, the caller last, such as
`widget-portal,widget-jobs`. When a call arrives whose chain already names your service, your
service is being called back while one of its own requests waits on the call: a re-entry, a
synchronous loop-back. The first request holds whatever lock or transaction it took open on work
that may need them, and neither service can see that on its own.

On a re-entry the package:

- counts it in `bitwarden.call.reentries`, tagged `bitwarden.call.chain` (the chain, your service
  last), `http.route` and `bitwarden.call.reentry.accepted`;
- tags the request's span `bitwarden.call.reentry`, beside `bitwarden.call.chain`, which every call
  from another service carries;
- logs a warning naming the operation and the chain;
- with `CallChain:RefuseReentry` on, refuses it: an unexpected failure, a `500`.

`CallChain:RefuseReentry` is off by default. The platform's test host turns it on, and so should a
service's Development settings, so a new loop-back fails the test or the local run that reaches it.

Remove a loop-back where you can: the caller passes what it knows, or the work runs after the
commit, or through the outbox. Where it has to stay, declare it on the operation with
`[AcceptsReentry]` and say why. A declared re-entry is counted and logged at information, never
refused:

```csharp
using Bitwarden.Server.Sdk.Authorization;
using Bitwarden.Server.Sdk.Resources;

public static class WidgetTransfersEndpoints
{
    /// <summary>
    /// Transfer a widget
    /// </summary>
    [AcceptsReentry("The transfer must fail when the old owner's widget can't be released, so the release can't move after the commit.")]
    [StandardAction]
    public static Task Transfer(string id, IWidgetStore store, CancellationToken cancellationToken) =>
        store.TransferAsync(id, cancellationToken);
}
```

The call-chain check and `[AcceptsReentry]` are in
[Bitwarden.Server.Sdk.Authorization](https://github.com/bitwarden/dotnet-extensions/blob/main/extensions/Bitwarden.Server.Sdk.Authorization/src/PACKAGE.md),
which `Service` registers for you.

- The chain is believed only from another service's authenticated call. From anybody else, a
  person's browser included, the header is removed and the request has none.
- It names services only, at most 16, each a registered name. A value that isn't one is read as
  none, so nothing else reaches a log, a span or a metric tag.
- Identity's token endpoint and the health probes are never a re-entry: a token or context exchange
  is the platform's plumbing.
- A call your service makes while handling a message or running a job starts a chain of its own.

## Answer the health probes

The package maps three probes. They are anonymous, tagged `System` in the OpenAPI document, and
never traced.

| Probe                   | Answers                                                                                    |
| ----------------------- | ------------------------------------------------------------------------------------------ |
| `GET /api/v1/health`    | `200` whenever the process is serving. Asks no health check.                               |
| `GET /api/v1/startup`   | `200` once the process is serving. Asks no health check.                                   |
| `GET /api/v1/readiness` | `200` when every health check it asks is healthy or degraded, `503` when any is unhealthy. |

- The package doesn't check your dependencies. Add a check for each dependency the service can't
  serve without.
- When readiness answers `503`, its detail joins the descriptions of the unhealthy checks. Write a
  description an operator can act on.
- A check that failed with an exception, or has no description, is reported as "A dependency is not
  ready.", so exception text never reaches the answer.
- Tag a check `HealthCheckTags.Monitoring` (Bitwarden.Server.Sdk.HealthChecks) when it describes
  something every instance shares, such as the outbox's backlog or a dead-letter queue, that no
  instance leaving rotation would fix. Readiness doesn't ask it. The package publishes its status
  instead, as the `bitwarden.health.status` gauge (0 healthy, 1 degraded, 2 unhealthy, by
  `bitwarden.health.check`) and a log line at warning, error or information on each change, which is
  where an alert on it belongs.

## Settings

| Setting                                                     | Default                                       | What it does                                                                                                             |
| ----------------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `OpenTelemetry:Enabled`                                     | `true` in the cloud, `false` when self-hosted | Turns the OTLP exporters on or off.                                                                                      |
| `OpenTelemetry:Tracing:Enabled`                             | `OpenTelemetry:Enabled`                       | Turns the trace exporter on or off.                                                                                      |
| `OpenTelemetry:Metrics:Enabled`                             | `OpenTelemetry:Enabled`                       | Turns the metric exporter on or off.                                                                                     |
| `OpenTelemetry:Logging:Enabled`                             | `OpenTelemetry:Enabled`                       | Turns the log exporter on or off.                                                                                        |
| `DD_ENV` (environment variable)                             | None                                          | Added to the telemetry resource as `env`.                                                                                |
| `Logging:Console:IncludeScopes`                             | `true`                                        | Writes each request's log scope on console log lines. A deployment can turn it off.                                      |
| `Logging:LogLevel:Microsoft.AspNetCore.Hosting.Diagnostics` | `Warning`                                     | Keeps ASP.NET Core's request lines, which carry the query string, out of the logs.                                       |
| `CallChain:RefuseReentry`                                   | `false`                                       | Refuses a call back into the service while its own request waits, unless the operation declares it (`[AcceptsReentry]`). |

The switches turn exporters on or off only. Spans are created either way, so a trace continues
through a service that exports nothing.

## Security trade-offs

- **Request lines.** ASP.NET Core's "Request starting" and "Request finished" lines carry the query
  string, which can carry a credential (a sign-in link's token, a download link's token). The
  package defaults their category to `Warning`. Set it lower only where no query string ever carries
  a credential.
- **Log scopes** carry organization, user and provider identifiers into every log record and span.
  They are identifiers, not Vault Data, but they say who did what: protect the log and trace
  backends accordingly.

## Things to know

- **What you log is up to you.** The package adds identifiers; your messages add the rest. Never log
  a token, a key or the value of an `[Encrypted]` member. Vault Data reaches a service only as
  Protected Data, and must not leave it in a log.
- **Some libraries aren't instrumented.** Entity Framework Core and StackExchange.Redis are not.
  SqlClient's spans cover SQL Server. To add other instrumentation, use OpenTelemetry's own
  registration in `ConfigureServices`.

## See also

- [Defining a service](defining-a-service.md)
- [Context](context.md)
- [Configuration and self-hosting](configuration-and-self-hosting.md)
