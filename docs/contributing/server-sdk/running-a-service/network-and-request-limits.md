---
sidebar_position: 5
---

# Network and request limits

**Audience:** engineers writing a Bitwarden service, and its API, with the server SDK.

A service needs to know the address a request really came from, limit how often one address may call
it, and decide which web pages may read its answers. The package does all three from settings, and
refuses to start over a setting it can't honour safely. Trusted proxies are
[Bitwarden.Server.Sdk.Authorization](https://github.com/bitwarden/dotnet-extensions/blob/main/extensions/Bitwarden.Server.Sdk.Authorization/src/PACKAGE.md)'s
work, and per-address limits are
[Bitwarden.Server.Sdk.RateLimiting](https://github.com/bitwarden/dotnet-extensions/blob/main/extensions/Bitwarden.Server.Sdk.RateLimiting/src/PACKAGE.md)'s;
`Service` registers both, in the order
[Defining a service](defining-a-service.md#override-the-other-hooks) lists.

## Trust the proxies in front of the service

Name the proxies whose forwarded headers the service believes:

```json
{
  "ForwardedHeaders": {
    "KnownProxies": "proxy",
    "KnownNetworks": "10.0.0.0/8"
  }
}
```

- A request's address is its connection's. When the connection is a trusted proxy's and the request
  carries `X-Forwarded-For`, it is the last address there: the one that proxy added.
- The last `X-Forwarded-Proto` (`http` or `https`) from a trusted proxy is the request's scheme.
- Loopback is always trusted.
- A host name in `KnownProxies` is looked up when a request comes from an untrusted address, and
  again at most every 30 seconds, so a proxy that starts later or moves is trusted without a
  restart.
- A product service records this address and passes it on in `Bitwarden-Context`. It refuses that
  header from a client, so a client can't choose the address its actions are recorded with.

## Limit requests per address

The package ships no rules. Add them in `IpRateLimitOptions`:

```json
{
  "IpRateLimitOptions": {
    "IpWhitelist": ["10.0.0.0/8"],
    "GeneralRules": [
      { "Endpoint": "post:*", "Period": "1s", "Limit": 5 },
      {
        "Endpoint": "post:/connect/token",
        "Period": "1m",
        "Limit": 10,
        "Grants": ["password"]
      }
    ]
  }
}
```

- **Refusal.** A request over a limit is refused with `429`, a `Retry-After` header and the standard
  error document, before authentication.
- **Matching.** `Endpoint` is `*` or `verb:path`, with `*` for any run of characters and `?` for any
  one. It is matched without case against the path in lower case, without a trailing slash and with
  repeated slashes collapsed. `Period` is a number followed by `s`, `m`, `h` or `d`.
- **Counting.** With `EnableEndpointRateLimiting` (the default), each method and path counts apart,
  so `post:*` gives every `POST` route its own allowance. Of the rules that apply, the most
  restrictive for each period counts, shortest period first, and counting stops at the first over
  its limit. Windows are fixed.
- **Grants.** A rule with `Grants` counts a token request only when its form's `grant_type` is one
  of them.
- **Off** when self-hosted, when `Enabled` is false, and when there are no rules.
- **Shared counts.** Set `globalSettings:distributedIpRateLimiting:redisConnectionString` and every
  instance of the service shares one allowance in Redis. Unset, each process counts on its own.
- **Your service network.** List it in `IpWhitelist`, since services call each other and fetch their
  own tokens.

## Refuse in another shape

A route whose answer shape somebody else fixed, such as an OAuth token endpoint, can refuse in its
own shape. Register an `IIpRateLimitRefusal`:

```csharp
using System.Net.Mime;
using Bitwarden.Server.Sdk.RateLimiting;
using Bitwarden.Server.Sdk.Service;

internal sealed class WidgetService(string[] args) : Service("widget-service", "Widget Service", args)
{
    protected override void ConfigureServices(IServiceCollection services) =>
        // Replaces the platform's refusal: ConfigureServices runs after the platform's registrations.
        services.AddSingleton<IIpRateLimitRefusal, WidgetTokenRefusal>();
}

// A route whose answer shape somebody else fixed (an OAuth token endpoint, say) refuses in that shape.
internal sealed class WidgetTokenRefusal : IIpRateLimitRefusal
{
    public Task WriteAsync(HttpContext http, string message)
    {
        // The status and Retry-After are already set.
        http.Response.ContentType = MediaTypeNames.Application.Json;
        return http.Response.WriteAsJsonAsync(
            new { error = "slow_down", error_description = message }, http.RequestAborted);
    }
}
```

The refusal you register replaces the platform's for every route.

## Count limits of your own

The package counts per address only. To limit per person, per organization or anything else, use
`IRateLimitCounters` (Bitwarden.Server.Sdk.RateLimiting) in your own code. `IpRateLimitRules`
applies the same rule choice to rules you define.

## Admit browser origins

Name the web pages that may call the service from a browser:

```json
{
  "Service": {
    "BrowserOrigins": ["https://vault.example.com", "https://*.example.com"]
  }
}
```

- An entry starting `*.` also admits that host's subdomains on the same scheme and port.
- With no origins named, there is no CORS at all: no policy, no middleware, no headers. Name origins
  only for a service a browser calls directly, normally a product service.
- Credentials are never admitted, and the context headers are never among the admitted request
  headers. A page asking to send one gets a preflight answer that doesn't list it, so the browser
  never sends the request.
- CORS runs inside the exception handler and ahead of rate limits and authentication. A preflight is
  answered without a token, and a refused request still carries the headers a page needs to read
  why.

## Settings

| Setting                                                              | Default | What it does                                                                                                           |
| -------------------------------------------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------- |
| `ForwardedHeaders:KnownProxies`                                      | None    | Comma-separated addresses or host names of proxies whose `X-Forwarded-For` and `X-Forwarded-Proto` are believed.       |
| `ForwardedHeaders:KnownNetworks`                                     | None    | Comma-separated CIDR networks of such proxies.                                                                         |
| `IpRateLimitOptions:Enabled`                                         | `true`  | Whether limits apply. Off when self-hosted, and with no rules, whatever this says.                                     |
| `IpRateLimitOptions:GeneralRules`                                    | None    | The rules: `Endpoint` (default `*`), `Period` (default `1m`), `Limit` (default `0`, refusing every request), `Grants`. |
| `IpRateLimitOptions:EnableEndpointRateLimiting`                      | `true`  | Counts each method and path apart. When false, only `*` rules apply, counting all of an address's requests.            |
| `IpRateLimitOptions:IpWhitelist`                                     | None    | Addresses and CIDR networks never limited.                                                                             |
| `IpRateLimitOptions:EndpointWhitelist`                               | None    | `verb:path` patterns never limited.                                                                                    |
| `IpRateLimitOptions:HttpStatusCode`                                  | `429`   | The status a request over a limit is refused with.                                                                     |
| `globalSettings:distributedIpRateLimiting:redisConnectionString`     | None    | A Redis where every instance keeps one shared count. Unset, each process counts on its own.                            |
| `globalSettings:distributedIpRateLimiting:enabled`                   | `true`  | Whether a configured Redis is used.                                                                                    |
| `globalSettings:distributedIpRateLimiting:maxRedisTimeoutsThreshold` | `10`    | How many Redis failures within the window set Redis aside, letting requests through unlimited.                         |
| `globalSettings:distributedIpRateLimiting:slidingWindowSeconds`      | `120`   | The window, in seconds, those failures are counted in.                                                                 |
| `Service:BrowserOrigins`                                             | None    | The browser origins admitted cross-origin, as an array or a single value.                                              |

## Security trade-offs

- **Trusted proxies.** A trusted proxy chooses the address a request is recorded and rate-limited
  under, so name only the proxies in front of the service and keep `KnownNetworks` as narrow as
  their network. Each proxy must add the address it took the request from last in `X-Forwarded-For`,
  and must strip the context headers (`BitwardenHeaders.All`) a client sends. An address that
  doesn't parse is looked up as a host name and trusts nobody if the lookup fails; a network that
  doesn't parse is ignored. Behind a proxy that is not trusted, every request carries the proxy's
  address, so all clients share one allowance.
- **Rate-limit rules.** A `Period` that doesn't parse, or an `IpWhitelist` entry that is neither an
  address nor a CIDR network, stops the service at startup.
- **Shared counts.** Every instance must name the same Redis; counts are kept apart per service
  name, under keys `{service}:ip-rate-limit:{SHA-256}` that expire with their window. The hash is
  unsalted and the IPv4 address space is small, so anyone who can read the Redis can recover the
  addresses: protect it as you would the logs, and keep its connection string (which usually carries
  a password) in secrets. When Redis fails, the service lets requests through rather than refusing
  them.
- **Browser origins.** CORS decides which web pages may read a service's answers. Name each origin
  exactly as a browser sends it. `*`, an empty entry, a path, a trailing slash, a written-out
  default port, user info, a scheme other than `http` or `https`, or a `*` anywhere but the first
  label of the host stops the service at startup.

## Things to know

- **No rules, no limits.** A service with no `GeneralRules` is not limited at all.
- **Self-hosted installs have no limits.** They are always off there. A self-hosted operator who
  needs them puts them in a proxy in front of the service.

## See also

- [Context](context.md)
- [Configuration and self-hosting](configuration-and-self-hosting.md)
- [Observability and health](observability-and-health.md)
