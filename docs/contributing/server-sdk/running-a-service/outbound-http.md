---
sidebar_position: 6
---

# Outbound HTTP

**Audience:** engineers writing a Bitwarden service, and its API, with the server SDK.

A service makes two kinds of outbound call: to an address someone outside Bitwarden chose, such as
an organization's webhook or identity provider, and to the deployment's other services. Guard the
first with `AddSsrfProtection()` so it can't reach the private network, and run the second over a
Trusted Channel with `Tls:*` settings. The guard, and the `InternalTls` settings type, are in
[Bitwarden.Server.Sdk.Http](https://github.com/bitwarden/dotnet-extensions/blob/main/extensions/Bitwarden.Server.Sdk.Http/src/PACKAGE.md),
which has no ASP.NET Core dependency; `Service` reads the `Tls:*` settings, trusts the named
authorities for every client and serves HTTPS with them.

## Guard a client whose destination someone else chose

Add the guard to each client whose destination comes from an organization, a user or a document:

```csharp
using Bitwarden.Server.Sdk.Service;

internal sealed class WidgetService(string[] args) : Service("widget-service", "Widget Service", args)
{
    protected override void ConfigureServices(IServiceCollection services)
    {
        // An organization's webhook: an address someone outside Bitwarden chose. Guarded everywhere.
        services.AddHttpClient("widget-webhooks").AddSsrfProtection();

        // An organization's identity provider: guarded in the cloud only, since a self-hosted
        // identity provider often runs on the same private network.
        services.AddHttpClient("widget-identity-provider").AddCloudSsrfProtection();

        // A client that follows redirects itself; the guard checks each request it sends.
        services.AddHttpClient("widget-icons").AddSsrfProtection(followRedirects: false);

        services.AddSingleton<WidgetWebhooks>();
    }
}
```

- The guard resolves each request's host first and refuses an address in a private, loopback,
  link-local or other reserved range, before anything connects.
- It then connects to the address it checked, keeping the original host for TLS, so the name can't
  resolve elsewhere in between.
- It turns off automatic redirects on the primary handler and follows them itself (up to 10),
  checking every hop.
- `AddCloudSsrfProtection()` guards only in Bitwarden's cloud, and leaves a self-hosted install's
  client unguarded.
- The extensions are in the `Microsoft.Extensions.DependencyInjection` namespace.

## Handle a refused address

A refused request throws `SsrfProtectionException` (`Bitwarden.Server.Sdk.Http`). Turn it into an
answer the caller can act on, rather than letting it become a `500`:

```csharp
using System.Net;
using Bitwarden.Server.Sdk.Errors;
using Bitwarden.Server.Sdk.Http;

internal sealed class WidgetWebhooks(IHttpClientFactory clients, ILogger<WidgetWebhooks> logger)
{
    public async Task NotifyAsync(Uri webhook, string widgetId, CancellationToken cancellationToken)
    {
        var client = clients.CreateClient("widget-webhooks");

        try
        {
            // Only the identifier: never a widget's encrypted members.
            using var response = await client.PostAsJsonAsync(webhook, new { widgetId }, cancellationToken);
            response.EnsureSuccessStatusCode();
        }
        catch (SsrfProtectionException)
        {
            // The host resolved to a private, loopback, link-local or reserved address.
            logger.LogWarning("Refused a widget webhook to an internal address.");
            throw new InvalidRequestException("The webhook's address is not reachable.", "/webhook");
        }
    }

    // The check the guard makes, for validating an address when it is saved.
    public static bool IsAllowed(IPAddress address) => !address.IsInternal();
}
```

- `IPAddress.IsInternal()` (`IPAddressExtensions`) is the check the guard makes. Use it to refuse an
  address when it is saved, as well as when it is called.
- Data a service sends out, to a webhook especially, leaves the Bitwarden Secure Environment. Send
  identifiers, never Vault Data, which the service holds only as Protected Data anyway.

## Serve and call other services over TLS

A service serves HTTPS with Kestrel's own settings (`ASPNETCORE_URLS` with an `https://` address,
and `Kestrel:Certificates:Default:Path` and `:KeyPath`, or `Kestrel:Endpoints:Https:*`). A
deployment that hands its services their secrets as settings rather than files can give the
certificate as settings instead: `Tls:ServerCertificate`, base64 of the certificate's DER encoding,
and `Tls:ServerKey`, base64 of its PKCS #8 private key. For its calls to other services, name the
authority that issued their certificates:

```json
{
  "Tls": {
    "CertificateAuthorities": ["/etc/bitwarden/ca/internal-root.pem"],
    "RequireHttps": true
  }
}
```

- `Tls:CertificateAuthorities` adds root authorities to the trust of every client the HTTP client
  factory makes, whoever set its primary handler, and of the bearer handler's discovery and key
  fetches.
- A server certificate is trusted when the system trusts it or it chains to a named root. A host
  name that doesn't match is never trusted.
- `Tls:RequireHttps` refuses a plain-HTTP bearer authority at startup, and a plain-HTTP address the
  service is configured to listen on (`urls`, `http_ports`, `Kestrel:Endpoints:*:Url`, with
  Kestrel's precedence). Once it listens, a plain-HTTP address it listens on, such as one set in
  code or Kestrel's default `http://localhost:5000`, stops it.
- `Tls:HealthPort` is the one port that may stay plain HTTP, for infrastructure that probes without
  TLS. List it with the others (`https://+:8443;http://127.0.0.1:8081`). On it the service answers
  `/api/v1/health`, `/api/v1/readiness` and `/api/v1/startup` alone; anything else is `404`.
- TLS gives these calls a Secure Channel. With the service token each call carries, and the callee's
  audience check, it is a Trusted Channel.

## Settings

| Setting                      | Default | What it does                                                                                                                           |
| ---------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `Tls:CertificateAuthorities` | None    | PEM files of root certificate authorities trusted for outbound calls and the bearer handler's key fetches, besides the system's roots. |
| `Tls:RequireHttps`           | `false` | When true, the bearer authority and every listening address but the health port must be `https://`, or the service does not start.     |
| `Tls:ServerCertificate`      | None    | The server certificate, base64 DER, for every HTTPS endpoint without one of its own. With `Tls:ServerKey`.                             |
| `Tls:ServerKey`              | None    | Its private key, base64 PKCS #8. A secret.                                                                                             |
| `Tls:HealthPort`             | None    | The one port allowed plain HTTP with `Tls:RequireHttps`, answering the probes alone.                                                   |
| `globalSettings:selfHosted`  | `false` | When true, `AddCloudSsrfProtection()` clients are unguarded.                                                                           |

## Security trade-offs

- **Internal TLS.** Every service that calls another must trust the authority that issued the
  callee's certificate, so name the same authority files on every service. A file that can't be
  read, or holds no certificate, stops the service at startup. So does a server certificate in
  settings that can't be read, isn't valid now, or doesn't match its key; the message names the
  setting, never its value.
- **The health port** is unauthenticated plain HTTP. Bind it to an address only the probing
  infrastructure reaches (the loopback for a container's own health check).
- **Self-hosted identity providers.** `AddCloudSsrfProtection()` deliberately leaves a self-hosted
  install unguarded, where the operator chose the destinations. Use `AddSsrfProtection()` for any
  destination a self-hosted install's users, rather than its operator, choose.

## Things to know

- **The guard is opt-in per client.** A client you don't guard can reach anything. Guard none whose
  destination is the deployment's own, since the guard would refuse it.
- **A client with its own primary handler** gets `Tls:CertificateAuthorities` too, whenever it names
  it, unless that handler checks certificates itself (its own validation callback), which it keeps.
  A handler no HTTP client factory makes, such as a reverse proxy's, gets nothing: give it
  `InternalTls.Trusts` yourself.

## See also

- [Authentication and authorization](authentication-and-authorization.md)
- [Configuration and self-hosting](configuration-and-self-hosting.md)
- [Network and request limits](network-and-request-limits.md)
