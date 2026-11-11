---
sidebar_position: 3
---

# Context

**Audience:** engineers writing a Bitwarden service, and its API, with the server SDK.

A request is about someone: an organization, a person, a provider, and the client and address it
came from. Your handlers read that from `IContext`, and the package fills it in from the session or
from the context another service sends. `IContext` and the context headers are in
[Bitwarden.Server.Sdk.Context](https://github.com/bitwarden/dotnet-extensions/blob/main/extensions/Bitwarden.Server.Sdk.Context/src/PACKAGE.md);
filling in and checking them is
[Bitwarden.Server.Sdk.Authorization](https://github.com/bitwarden/dotnet-extensions/blob/main/extensions/Bitwarden.Server.Sdk.Authorization/src/PACKAGE.md)'s
work, which `Service` registers for you.

## Read whom a request concerns

A handler takes `IContext` and doesn't care where the values came from:

```csharp
using Bitwarden.Server.Sdk.Authorization;
using Bitwarden.Server.Sdk.Context;
using Bitwarden.Server.Sdk.Errors;
using Bitwarden.Server.Sdk.Resources;
using static Bitwarden.Server.Sdk.Resources.StandardResponses;

[ApiTag(Description = "Widgets, which a person keeps.")]
public static class WidgetsEndpoints
{
    public static void Map(IEndpointRouteBuilder endpoints)
    {
        var widgets = endpoints.MapGroup("api/v1/widgets").WithStandards();
        widgets.MapGet("current", GetMyWidget);
        widgets.MapPost("{id}/actions/expire", Expire);
    }

    /// <summary>
    /// Get the person's own widget
    /// </summary>
    [Authorization(User = ContextRequirement.Required)]
    [StandardReadOne("current")]
    public static async Task<ResourceDocument<Widget>> GetMyWidget(
        IContext context, IWidgetStore store, CancellationToken cancellationToken)
    {
        // The same code in a domain or a product service: only where the values come from differs.
        var user = context.UserId!.Value;
        var widget = await store.FindForAsync(user, cancellationToken);

        return ReadOneResponse(widget ?? throw new NotFoundException("widget", "current"));
    }

    /// <summary>
    /// Expire a widget
    /// </summary>
    [AcceptsAssertedContext("The widget jobs expire widgets on their owners' behalf.", "widget-jobs")]
    [Authorization(User = ContextRequirement.Required)]
    [StandardAction]
    public static Task Expire(string id, IWidgetStore store, CancellationToken cancellationToken) =>
        store.ExpireAsync(id, cancellationToken);
}
```

- `IContext` has `OrganizationId`, `UserId`, `ProviderId`, `ClientIpAddress`, `DeviceType`,
  `DeviceIdentifier` and, for audit records only, `Credential`, `RecordedUserId` and
  `RecordedProviderId`.
- `context.UserId!.Value` is safe here because the operation requires a user: a request without one
  is refused before the handler runs.
- `Expire` acts for a person when `widget-jobs` asserts one on its own authority. From any other
  service, an asserted context naming a person is refused with `403`.

## Know what each kind of service believes

A product service reads the context from the person's session. A domain service reads it from the
context another service sends, and believes it only as Identity signed it.

|                                | Domain service (default)                                                               | `[ProductService]`                                                 |
| ------------------------------ | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `IContext.UserId`              | The context token's user, from another service                                         | The validated token's `sub`                                        |
| `IContext.OrganizationId`      | The context token's organization                                                       | The token's signed `organization` claim                            |
| `IContext.ProviderId`          | The context token's provider                                                           | A provider session's `provider` claim                              |
| Address, device and credential | `Bitwarden-Context`, as the token signed it                                            | The connection's address, the `device` claim, the client's headers |
| A context header               | Believed from an internal service with a valid context token; ignored from anyone else | Refused with `400`, whoever sends it                               |
| A token without a GUID `sub`   | Accepted                                                                               | Refused with `401`, except a credential an operation accepts       |
| `ICallerRole`                  | Always `None`                                                                          | From the session, for the organization it names                    |

The context headers are `BitwardenHeaders.All`: `Bitwarden-Organization`, `Bitwarden-User`,
`Bitwarden-Provider`, `Bitwarden-Context` (a closed, versioned JSON object) and
`Bitwarden-Delegation` (the signed form of the other four).

- **A product service** refuses all five with `400`, before authentication, whoever sends them.
- **A domain service** believes them only from another service (a token whose `client_id` is
  `internal.*`), and only as its context token says. From a person's token, a Send's token or no
  token, they are not read and the context is empty. The request then meets the operation's
  authorization like any other.

## Call another service with the context

You don't write the headers yourself. The generated clients in Bitwarden.Server.Sdk.Client write
them and exchange a context token from Identity for each callee: from the person's token at a
product service, and from the context token the call carried at a domain service. The person's token
itself is never forwarded.

A context token is a short-lived JWT of type `bitwarden-context+jwt`, obtained by RFC 8693 token
exchange and signed by Identity. A domain service accepts it only when it is:

- signed by a key, and issued by the issuer, that the service's bearer handler trusts;
- unexpired, and addressed (`aud`) to this service by its own name;
- issued to the caller presenting the service token (its `client_id` matches);
- marked `DELEGATED` (proven by a person's, organization's or machine account's own token) or
  `ASSERTED` (the calling service's own word), in `ctx_mode`.

The context is then the token's. A plain header that is present must say the same thing. A call with
no context token and none of the headers has an empty context.

A domain service refuses an asserted context that names a person with `403`, unless the operation
names the calling service in `[AcceptsAssertedContext]`. An asserted context naming nobody, and a
delegated one, are accepted everywhere.

## What a domain service refuses

When another service's call carries context the package can't believe, it is refused before your
handler runs. Each refusal names the header at fault in the error's `source.header`.

| The call                                                                      | Status | Header named           |
| ----------------------------------------------------------------------------- | ------ | ---------------------- |
| Context but no context token                                                  | `401`  | `Bitwarden-Delegation` |
| A context token that is forged, expired or for another service                | `401`  | `Bitwarden-Delegation` |
| A context token issued to another caller                                      | `401`  | `Bitwarden-Delegation` |
| A plain header that disagrees with the context token                          | `400`  | That header            |
| A context header sent more than once                                          | `400`  | That header            |
| A malformed `Bitwarden-Context` object in the token                           | `400`  | `Bitwarden-Context`    |
| An asserted context naming a person, at an operation not admitting the caller | `403`  | `Bitwarden-Delegation` |

## Things to know

- **Strip the headers at the edge.** Every proxy in front of a service must strip
  `BitwardenHeaders.All` from what clients send. A product service refuses them anyway; a domain
  service reached through a public entry point relies on the proxy.
- **Name the callers that may assert a person.** Put them in `[AcceptsAssertedContext]` with the
  reason, on each operation, so the exception is reviewed where it is read.
- **Enforce your own access rules.** A context says whom a call concerns, not what the caller may
  do. An asserted context is only the calling service's word, so check your own rules too.
- **Keep audit-only members audit-only.** `Credential`, `RecordedUserId`, `RecordedProviderId` and
  `UserOrganizationIds` must never drive authorization, a row filter or a cache.
- **The context carries identifiers only.** Never put a key or an encrypted value in it. Vault Data
  moves between services only as Protected Data, in request bodies.

## See also

- [Authentication and authorization](authentication-and-authorization.md)
- [Network and request limits](network-and-request-limits.md)
- [Defining a service](defining-a-service.md)
