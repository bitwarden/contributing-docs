---
sidebar_position: 5
---

# Content negotiation

**Audience:** engineers writing a Bitwarden service, and its API, with the server SDK.

The package checks a request's `Content-Type` for you and refuses a body it can't read with `415`.
It answers everything as `application/json; charset=utf-8` and ignores `Accept`. This page shows how
to take a body that isn't JSON, and how to refuse an `Accept` you can't answer.

## Take a JSON body

You don't declare anything. What each kind of body accepts:

- **A resource document (`ResourceDocument<T>`):** `application/json`, or a `+json` type such as
  `application/vnd.api+json`. Anything else is refused `415` by routing, so a caller without a valid
  token is told `401` first.
- **A plain JSON body:** `application/json`, `text/json`, or any `application/*+json`. Anything else
  is refused `415` after authorization. An optional body may be left out with no `Content-Type` at
  all.

Each refusal is an error document with the code `unsupported-media-type`. See [Errors](errors.md).

## Take a body that isn't JSON

A raw upload takes `HttpRequest` and names its media type with `[Consumes]`
(`Microsoft.AspNetCore.Mvc`). Here the body is an attachment the person encrypted on their device,
stored without being read:

```csharp
using Microsoft.AspNetCore.Mvc;

/// <summary>
/// Upload a widget's attachment
/// </summary>
/// <param name="id">The widget.</param>
/// <param name="request">The request, whose body is the attachment, encrypted on the person's device.</param>
/// <param name="store">Where attachments are kept.</param>
/// <param name="cancellationToken">Cancels the upload.</param>
[Consumes("application/octet-stream")]
public static Task UploadAttachment(
    string id, HttpRequest request, IWidgetStore store, CancellationToken cancellationToken) =>
    // Stored as sent: the service never reads the ciphertext.
    store.SaveAttachmentAsync(id, request.Body, cancellationToken);
```

- Map it like any other handler: `widgets.MapPut("{id}/attachment", UploadAttachment)`.
- A body sent as anything but `application/octet-stream` is refused `415` by routing.
- The package can't know a raw body's media type. Name every one with `[Consumes]`.
- The attachment is Protected Data. Pass the stream to storage; never read, log or inspect it.

## Refuse an Accept header you can't answer

The package doesn't check `Accept`. To answer `406` when a caller asks for something other than
JSON, add a filter to every standard endpoint with an `IStandardEndpointFilterProvider`. This one
lets a request through when it has no `Accept` header, or one that admits JSON, and otherwise
answers a bare `406`:

```csharp
using System.Reflection;
using Bitwarden.Server.Sdk.Resources.Endpoints;
using Bitwarden.Server.Sdk.Resources.Querying;
using Microsoft.Net.Http.Headers;

/// <summary>
/// Refuses a standard endpoint's request with 406 when its Accept header admits no JSON.
/// </summary>
public sealed class JsonOnlyResponses : IStandardEndpointFilterProvider
{
    private static readonly IEndpointFilter Filter = new AcceptCheck();

    public IEndpointFilter? For(MethodInfo method, ICollection<string> problems) => Filter;

    private sealed class AcceptCheck : IEndpointFilter
    {
        private static readonly MediaTypeHeaderValue Json = new("application/json");

        public ValueTask<object?> InvokeAsync(EndpointFilterInvocationContext context, EndpointFilterDelegate next)
        {
            var accepted = context.HttpContext.Request.GetTypedHeaders().Accept;

            // No Accept header accepts anything. Otherwise one range must admit JSON. Only the range's
            // type and subtype are compared, so a parameter such as charset doesn't refuse it.
            if (accepted.Count == 0 || accepted.Any(range =>
                    range.Quality != 0 && Json.IsSubsetOf(new MediaTypeHeaderValue(range.MediaType))))
            {
                return next(context);
            }

            // A bare status: the package writes the error document for it.
            return ValueTask.FromResult<object?>(Results.StatusCode(StatusCodes.Status406NotAcceptable));
        }
    }
}
```

Register it in `ConfigureServices`:

```csharp
using Bitwarden.Server.Sdk.Resources.Endpoints;
using Bitwarden.Server.Sdk.Service;

internal sealed class WidgetService(string[] args) : Service("widget-service", "Widget Service", args)
{
    protected override void ConfigureServices(IServiceCollection services)
    {
        services.AddSingleton<IWidgetStore, WidgetStore>();
        services.AddSingleton<IStandardEndpointFilterProvider, JsonOnlyResponses>();
    }

    protected override void MapEndpoints(IEndpointRouteBuilder endpoints) =>
        WidgetsEndpoints.Map(endpoints);
}
```

- The package turns the bare `406` into an error document with the code `not-acceptable`.
- The filter runs after the package's own checks, so a request that is also invalid is answered
  `422`, not `406`.
- It covers standard endpoints only. The health probes, the OpenAPI document and the documentation
  UI are left alone.

## Things to know

- **Every response is JSON.** Whatever `Accept` says, the package answers
  `application/json; charset=utf-8` unless you add a filter like `JsonOnlyResponses`.
- **Refusal order differs by body kind.** A resource document or `[Consumes]` body in the wrong
  media type is refused by routing, before authorization. A plain JSON body is refused after it.

## See also

- [Standard responses](standard-responses.md): every status the package answers with.
- [Errors](errors.md): the error document.
- [Caching and extensions](../running-a-service/caching-and-extensions.md):
  `IStandardEndpointFilterProvider`.
