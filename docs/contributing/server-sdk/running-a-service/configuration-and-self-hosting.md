---
sidebar_position: 4
---

# Configuration and self-hosting

**Audience:** engineers writing a Bitwarden service, and its API, with the server SDK.

A service reads its settings from the standard ASP.NET Core sources. Every setting the package reads
is optional: a service with none of them runs in the cloud configuration. Use feature flags with
`[RequireFeature]` and `IFeatureService`, and keep operations to one kind of install with
`[SelfHostedOnly]` and `[NotSelfHostedOnly]`.

## Where settings come from

- `appsettings.json`, `appsettings.{Environment}.json`, user secrets in Development, environment
  variables and the command line, through `WebApplication.CreateBuilder`.
- Sources you add in `ConfigureConfiguration` come last and win. See
  [Defining a service](defining-a-service.md#override-the-other-hooks).
- The package supplies some defaults as the lowest-precedence source, so a deployment can override
  them: `Bitwarden:ServiceName`, `Logging:Console:IncludeScopes` and the request-line log level.

Keep secrets out of `appsettings*.json`. The LaunchDarkly SDK key, Redis connection strings and
database passwords belong in user secrets or the environment.

## Use feature flags

Every service gets `IFeatureService` (Bitwarden.Server.Sdk.Features). Hold an operation behind a
flag with `[RequireFeature]`, or read a flag inside one:

```csharp
using Bitwarden.Server.Sdk.Environment;
using Bitwarden.Server.Sdk.Features;
using Bitwarden.Server.Sdk.Resources;
using static Bitwarden.Server.Sdk.Resources.StandardResponses;

[ApiTag(Description = "Widgets, which a person keeps.")]
public static class WidgetsEndpoints
{
    public static void Map(IEndpointRouteBuilder endpoints)
    {
        var widgets = endpoints.MapGroup("api/v1/widgets").WithStandards();
        widgets.MapPost("{id}/actions/polish", Polish);
        widgets.MapPost("{id}/actions/share", Share);
    }

    /// <summary>
    /// Polish a widget
    /// </summary>
    // Answers 404 to an authorized caller while the flag is off.
    [RequireFeature("pm-12345-widget-polish")]
    [StandardAction]
    public static Task Polish(string id, IWidgetStore store, CancellationToken cancellationToken) =>
        store.PolishAsync(id, cancellationToken);

    /// <summary>
    /// Share a widget
    /// </summary>
    [StandardAction]
    public static async Task<ResourceDocument<Widget>> Share(
        string id, IFeatureService features, IWidgetStore store, CancellationToken cancellationToken)
    {
        // A flag that changes how an operation behaves, rather than whether it exists.
        var notify = features.IsEnabled("pm-23456-widget-share-notifications");
        return ActionResponse(await store.ShareAsync(id, notify, cancellationToken));
    }
}

// Every operation in the class is refused 422 in Bitwarden's cloud.
[ApiTag(Description = "The license a self-hosted install's widgets run under.")]
[SelfHostedOnly]
public static class WidgetLicensesEndpoints
{
    public static void Map(IEndpointRouteBuilder endpoints)
    {
        var licenses = endpoints.MapGroup("api/v1/widget-licenses").WithStandards();
        licenses.MapPost("current/actions/refresh", Refresh);
    }

    /// <summary>
    /// Refresh the install's widget license
    /// </summary>
    [StandardAction("refresh", template: "current")]
    public static Task Refresh(IBitwardenEnvironment environment, IWidgetStore store, CancellationToken cancellationToken) =>
        store.RefreshLicenseAsync(environment.SelfHostFlavor, cancellationToken);
}
```

- Flags come from LaunchDarkly when `Features:LaunchDarkly:SdkKey` is set, and otherwise from the
  offline values in `Features:FlagValues`, which is what you use in development.
- `[RequireFeature("key")]` goes on a handler or its class. While the flag is off, the operation
  answers `404`, exactly as an address that matches nothing.
- The flag is checked after authentication and authorization. A caller the operation would refuse
  gets `401` or `403` whatever the flag, so only an authorized caller learns that it is off.
- The package doesn't track stale flags. Once a feature has shipped, remove `[RequireFeature]` and
  the flag from `Features:KnownFlags`.

## Keep an operation to one kind of install

`[SelfHostedOnly]` and `[NotSelfHostedOnly]` (Bitwarden.Server.Sdk.Resources), on a handler or its
class, refuse the operation in the other kind of install, as `WidgetLicensesEndpoints` does above.

- The refusal is `422`, with "Only allowed when self hosted." or "Only allowed when not self
  hosted.".
- The check runs after the request is bound and validated, so an invalid request in the wrong kind
  of install is refused for its invalid fields first.
- The attributes apply only to endpoints mapped under `WithStandards()`.

The package doesn't enforce them elsewhere. For an endpoint mapped without `WithStandards()`, check
`IBitwardenEnvironment.SelfHosted` yourself:

```csharp
using Bitwarden.Server.Sdk.Environment;

// [SelfHostedOnly] applies only under WithStandards(), so an endpoint mapped without it checks.
public static class WidgetLicenseSync
{
    public static void Map(IEndpointRouteBuilder endpoints) =>
        endpoints.MapPost("internal/widget-license-sync", Sync);

    private static async Task<IResult> Sync(
        IBitwardenEnvironment environment, IWidgetStore store, CancellationToken cancellationToken)
    {
        if (!environment.SelfHosted)
        {
            return Results.NotFound();
        }

        await store.RefreshLicenseAsync(environment.SelfHostFlavor, cancellationToken);
        return Results.NoContent();
    }
}
```

## Run in a self-hosted install

Setting `globalSettings:selfHosted` to `true` switches a service into a self-hosted install's
behavior:

- `appsettings.SelfHosted.json`, when present, is layered in right after
  `appsettings.{Environment}.json`. It overrides the service's own settings and is overridden by
  user secrets, environment variables and the command line.
- `IBitwardenEnvironment.SelfHosted` is true, and `SelfHostFlavor` is
  `globalSettings:selfHostFlavor` (`unknown` when unset).
- Per-address rate limits are off (Bitwarden.Server.Sdk.RateLimiting reads the setting itself),
  telemetry exporters default to off, and `AddCloudSsrfProtection()` clients are unguarded.
- The config resource reports `settings.selfHosted` as true.

Ship an `appsettings.SelfHosted.json` for what differs in a self-hosted install, rather than
branching on `IBitwardenEnvironment.SelfHosted` in code.

## Publish the config resource (product services)

A product service publishes `GET /api/v1/config`, which a client reads before and after sign-in. You
don't write it; you fill it from settings.

- Anyone may read it. A valid session token, when sent, has the flags evaluated for the person; one
  that fails validation gets the anonymous answer.
- `environment` holds the cloud region, the web vault's address and the fill-assist rules' address,
  from `Service:Environment:*`. A member whose setting is unset is left out.
- `settings` holds `disableUserRegistration`, `suppressOnboardingInterstitials`, `selfHosted`,
  `enableEmailVerification` and `enableOpenInviteLinkEmailVerification`.
- `featureFlags` is `IFeatureService.GetAll()`: only the flags listed in `Features:KnownFlags`.
- `version` is `IBitwardenEnvironment.Version`, or the service assembly's informational version
  without build metadata.

The flags are evaluated for a LaunchDarkly context the platform builds from the request: a `user`
context keyed by the acting user (or a shared anonymous key), with the person's confirmed
organizations; a `device` context from the token's `device` claim or the `Device-Identifier` header;
and the client's version and type. With an SDK key, that context goes to LaunchDarkly: identifiers,
client version and type, never Vault Data. To build your own, register it with
`services.AddContextBuilder<T>()` in `ConfigureServices`.

## Settings

| Setting                                                | Default   | What it does                                                                                                               |
| ------------------------------------------------------ | --------- | -------------------------------------------------------------------------------------------------------------------------- |
| `globalSettings:selfHosted`                            | `false`   | Marks a self-hosted install, with the effects listed above.                                                                |
| `globalSettings:selfHostFlavor`                        | `unknown` | The self-hosted install's flavor, read only when `globalSettings:selfHosted` is true.                                      |
| `Features:LaunchDarkly:SdkKey`                         | None      | Evaluates flags with LaunchDarkly. A secret.                                                                               |
| `Features:FlagValues`                                  | None      | Flag values served offline when there is no SDK key.                                                                       |
| `Features:KnownFlags`                                  | None      | The flags `GetAll()`, and so the config resource, report.                                                                  |
| `Service:Environment:CloudRegion`                      | None      | The config resource's `environment.cloudRegion`.                                                                           |
| `Service:Environment:Vault`                            | None      | The config resource's `environment.vault`, the web vault's address.                                                        |
| `Service:Environment:FillAssistRules`                  | None      | The config resource's `environment.fillAssistRules`.                                                                       |
| `Service:Settings:DisableUserRegistration`             | `false`   | The config resource's `settings.disableUserRegistration`.                                                                  |
| `Service:Settings:SuppressOnboardingInterstitials`     | `false`   | The config resource's `settings.suppressOnboardingInterstitials`.                                                          |
| `globalSettings:enableEmailVerification`               | `false`   | The config resource's `settings.enableEmailVerification`: registration mails a link.                                       |
| `globalSettings:enableOpenInviteLinkEmailVerification` | `true`    | The config resource's `settings.enableOpenInviteLinkEmailVerification`: following an invite link needs a verified address. |

The other settings the package reads are on the page for their topic.

## Things to know

- **The self-hosted refusal looks like a field error.** `[SelfHostedOnly]` and `[NotSelfHostedOnly]`
  refuse with `422` and an invalid-value error that names no field. Callers should read the detail,
  not look for a field to correct.
- **Unknown flags aren't reported.** A flag missing from `Features:KnownFlags` still works in
  `IsEnabled` and `[RequireFeature]`, but clients don't see it in the config resource. Add every
  flag a client needs there.

## See also

- [Defining a service](defining-a-service.md)
- [Network and request limits](network-and-request-limits.md)
- [Observability and health](observability-and-health.md)
- [Outbound HTTP](outbound-http.md)
