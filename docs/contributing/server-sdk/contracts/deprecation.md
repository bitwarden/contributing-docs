---
sidebar_position: 5
---

# Deprecation

**Audience:** engineers writing a Bitwarden service, and its API, with the server SDK.

The package doesn't mark operations deprecated: it doesn't read `[Obsolete]`, adds no `Deprecation`,
`Sunset` or `Link` headers, and writes no `deprecated` flag in the OpenAPI document. To deprecate an
operation, add one attribute, one middleware and one document transformer, as this page shows.

## Record the deprecation on the operation

An attribute records when the operation was deprecated, when it stops working and what replaces it:

```csharp
using System.Globalization;

/// <summary>
/// Marks an operation deprecated, with when it was, when it stops working, and what replaces it.
/// </summary>
/// <param name="deprecatedAt">When the operation became deprecated, as an ISO 8601 date and time.</param>
/// <param name="sunsetAt">When it stops working, as an ISO 8601 date and time.</param>
/// <param name="successor">
/// The path of the replacement, for the <c>Link</c> header. A route parameter such as <c>{id}</c> is
/// filled in from the request.
/// </param>
/// <param name="successorOperation">The replacement's operation identifier, for the OpenAPI description.</param>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public sealed class DeprecatedOperationAttribute(
    string deprecatedAt, string sunsetAt, string successor, string successorOperation) : Attribute
{
    public DateTimeOffset DeprecatedAt { get; } = DateTimeOffset.Parse(deprecatedAt, CultureInfo.InvariantCulture);
    public DateTimeOffset SunsetAt { get; } = DateTimeOffset.Parse(sunsetAt, CultureInfo.InvariantCulture);
    public string Successor { get; } = successor;
    public string SuccessorOperation { get; } = successorOperation;
}
```

Put it on the `v1` handler:

```csharp
using Bitwarden.Server.Sdk.Errors;
using Bitwarden.Server.Sdk.Resources;
using static Bitwarden.Server.Sdk.Resources.StandardResponses;

[ApiTag(Description = "Widgets, which a person keeps.")]
public static class WidgetsEndpoints
{
    public static void Map(IEndpointRouteBuilder endpoints) =>
        endpoints.MapGroup("api/v1/widgets").WithStandards().MapGet("{id}", GetWidget);

    /// <summary>
    /// Get a widget
    /// </summary>
    [DeprecatedOperation("2026-11-01T00:00:00Z", "2027-05-01T00:00:00Z", "/api/v2/widgets/{id}", "getWidgetV2")]
    [StandardReadOne]
    public static async Task<ResourceDocument<Widget>> GetWidget(
        string id, IWidgetStore store, CancellationToken cancellationToken) =>
        ReadOneResponse(await store.FindAsync(id, cancellationToken)
            ?? throw new NotFoundException("widget", id));
}
```

- The attribute ends up in the endpoint's metadata, where the middleware and the transformer below
  find it.
- On the endpoints class instead, it deprecates every operation in the class. The package copies an
  endpoints class's attributes onto each of its standard endpoints.
- Don't use `[Obsolete]` for this. The package ignores it, and with warnings as errors the handler's
  `Map` line stops compiling.

## Add the headers to every response

Middleware adds `Deprecation`, `Sunset` and `Link` when the response starts:

```csharp
using System.Globalization;

/// <summary>
/// Adds the <c>Deprecation</c>, <c>Sunset</c> and <c>Link</c> headers to every response from a
/// deprecated operation, refusals included.
/// </summary>
public sealed class DeprecationHeaders(RequestDelegate next)
{
    public Task InvokeAsync(HttpContext context)
    {
        if (context.GetEndpoint()?.Metadata.GetMetadata<DeprecatedOperationAttribute>() is { } deprecated)
        {
            // When the response starts, so the headers survive the platform's error handling.
            context.Response.OnStarting(() =>
            {
                var headers = context.Response.Headers;
                headers["Deprecation"] = $"@{deprecated.DeprecatedAt.ToUnixTimeSeconds()}";
                headers["Sunset"] = deprecated.SunsetAt.ToString("R", CultureInfo.InvariantCulture);
                headers.Append("Link", $"<{Fill(deprecated.Successor, context.Request.RouteValues)}>; rel=\"successor-version\"");
                return Task.CompletedTask;
            });
        }

        return next(context);
    }

    private static string Fill(string path, RouteValueDictionary values) =>
        values.Aggregate(path, (filled, value) =>
            filled.Replace($"{{{value.Key}}}", Uri.EscapeDataString(value.Value?.ToString() ?? string.Empty), StringComparison.Ordinal));
}
```

- `Deprecation` carries the deprecation time as a Unix timestamp (`@1793491200`), `Sunset` the
  sunset date as an HTTP date, and `Link` the replacement's path with the route's `{id}` filled in.
- Registered in `OnConfiguringPipeline` (below), the middleware wraps the package's, so a `401`,
  `404` or `422` from the package carries the headers as a `200` does.

## Mark the operation in the document

A document transformer sets the operation's `deprecated` flag and names its replacement at the start
of its description:

```csharp
using System.Globalization;
using Microsoft.AspNetCore.OpenApi;
using Microsoft.OpenApi;

/// <summary>
/// Marks every deprecated operation <c>deprecated: true</c> in the OpenAPI document, and names its
/// replacement in its description.
/// </summary>
public sealed class DeprecationDocumentTransformer : IOpenApiDocumentTransformer
{
    public Task TransformAsync(OpenApiDocument document, OpenApiDocumentTransformerContext context, CancellationToken cancellationToken)
    {
        foreach (var description in context.DescriptionGroups.SelectMany(group => group.Items))
        {
            if (description.ActionDescriptor.EndpointMetadata.OfType<DeprecatedOperationAttribute>().FirstOrDefault() is not { } deprecated
                || document.Paths.GetValueOrDefault($"/{description.RelativePath}") is not { Operations: { } operations }
                || operations.GetValueOrDefault(new HttpMethod(description.HttpMethod ?? "GET")) is not { } operation)
            {
                continue;
            }

            operation.Deprecated = true;
            operation.Description =
                $"Deprecated: call `{deprecated.SuccessorOperation}` instead. This operation stops working on "
                + $"{deprecated.SunsetAt.ToString("R", CultureInfo.InvariantCulture)}."
                + (string.IsNullOrEmpty(operation.Description) ? string.Empty : $"\n\n{operation.Description}");
        }

        return Task.CompletedTask;
    }
}
```

- It runs after the package's transformers and the XML documentation, so it prepends to the
  description your `<remarks>` produced rather than replacing it.
- `getWidget` is then published as deprecated, with the description "Deprecated: call `getWidgetV2`
  instead. This operation stops working on Sat, 01 May 2027 00:00:00 GMT."

## Register both

The service registers the transformer and the middleware, beside its `v1` and `v2` endpoints:

```csharp
using Bitwarden.Server.Sdk.Service;

internal sealed class WidgetService(string[] args) : Service("widget-service", "Widget Service", args)
{
    protected override void ConfigureServices(IServiceCollection services)
    {
        services.AddOpenApi(options => options.AddDocumentTransformer<DeprecationDocumentTransformer>());
        services.AddSingleton<IWidgetStore, WidgetStore>();
    }

    // Outside the platform's middleware, so a refusal (a 401, say) carries the headers too.
    protected override void OnConfiguringPipeline(WebApplication app) =>
        app.UseMiddleware<DeprecationHeaders>();

    protected override void MapEndpoints(IEndpointRouteBuilder endpoints)
    {
        WidgetsEndpoints.Map(endpoints);
        WidgetsV2Endpoints.Map(endpoints);
    }
}
```

The replacement, `WidgetsV2Endpoints`, is an ordinary `v2` endpoints class. See
[Breaking changes and versioning](breaking-changes-and-versioning.md).

## Things to know

- **Nothing watches the sunset date.** Put it where your team will see it, and remove the `v1`
  endpoints class, or publish a new date, before it passes. Never let `Sunset` pass with the
  operation still working.
- **Name a real replacement** in both the `Link` path and the successor's operation identifier, and
  map it before you deprecate.
- **Headers reach only callers that read them.** Find who still calls a deprecated operation from
  your traces before its sunset.

## See also

- [Breaking changes and versioning](breaking-changes-and-versioning.md): publishing the replacement.
- [OpenAPI](openapi.md): document transformers and the committed document.
- [Defining a service](../running-a-service/defining-a-service.md): `OnConfiguringPipeline` and the
  middleware order.
