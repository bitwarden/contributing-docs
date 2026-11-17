---
sidebar_position: 8
---

# Errors

**Audience:** engineers writing a Bitwarden service, and its API, with the server SDK.

A handler reports a failure by throwing, and the package writes the error document: its own failures
and your exceptions alike. You never build one in a handler. The exceptions and the document types,
`ErrorResponse` and `Error`, are in `Bitwarden.Server.Sdk.Errors`.

## Throw an exception

Most handlers only throw. `NotFoundException("widget", id)` writes the detail for you:

```csharp
using Bitwarden.Server.Sdk.Errors;
using Bitwarden.Server.Sdk.Resources;
using static Bitwarden.Server.Sdk.Resources.StandardResponses;

/// <summary>
/// Get a widget
/// </summary>
[StandardReadOne]
public static async Task<ResourceDocument<Widget>> GetWidget(
    string id, IWidgetStore store, CancellationToken cancellationToken) =>
    // 404, code not-found, detail "No widget with ID '...' exists."
    ReadOneResponse(await store.FindAsync(id, cancellationToken)
        ?? throw new NotFoundException("widget", id));
```

What each exception becomes:

| Throw                                             | Status                              | Code                       | What the caller is told                                       |
| ------------------------------------------------- | ----------------------------------- | -------------------------- | ------------------------------------------------------------- |
| `NotFoundException()`, `(type, id)` or `(detail)` | `404`                               | `not-found`                | The detail, such as "No widget with ID '...' exists."         |
| `ForbiddenException(detail)`                      | `403`                               | `forbidden`                | The detail.                                                   |
| `UnauthenticatedException(detail)`                | `401`                               | `unauthenticated`          | The detail.                                                   |
| `ConflictException()` or `(detail)`               | `409`                               | `conflict`                 | The detail, or that the resource changed since it was read.   |
| `InvalidRequestException(detail, pointer, code)`  | `422`                               | `code`, or `invalid-value` | The detail, at `source.pointer` when one is given.            |
| `PendingServiceException(service, requirement)`   | `501`                               | `not-implemented`          | Which service the rule waits on, and what it needs.           |
| `NotImplementedException`                         | `501`                               | `not-implemented`          | A fixed detail.                                               |
| `ServiceUnavailableException`                     | `503`                               | `service-unavailable`      | Which dependency, and what happened; never how it is reached. |
| An exception implementing `IProvideErrors`        | Its `StatusCode` (`422` by default) | Its own                    | Its `Errors`, as many as it has.                              |
| Anything else                                     | `500`                               | `internal-error`           | Nothing.                                                      |

- The detail of a recognized exception is sent as you wrote it. Write it for the caller, and never
  put Vault Data, ciphertext, a secret or an internal address in one.
- Any other exception is a `500` with a fixed title and detail. The exception is logged at `Error`
  with the request's trace identifier, which the caller gets as the error's `id`. Nothing else of it
  reaches the caller.
- To choose between `403` and `404`, or `404` and `422`, see
  [Standard responses](standard-responses.md#choose-the-status-of-a-failure).

## Know what the error document holds

The package fills in each error's members, and leaves out those without a value:

| Field              | What the package puts there                                                                                                                         |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `status`           | The response's status, as a string.                                                                                                                 |
| `code`             | A stable code from `ErrorCodes`, such as `not-found`, `invalid-value`, `field-required`, `invalid-type`, `conflict`; or the one an exception gives. |
| `title`            | The same text for every error with that code (`ErrorTitles`).                                                                                       |
| `detail`           | What went wrong this time. For an exception the package recognizes, its message.                                                                    |
| `source.pointer`   | A JSON Pointer into the body, on the wire's names: `/data/attributes/name`, `/data/attributes/part/code`, `/shine`.                                 |
| `source.parameter` | The query parameter, such as `filter[createdAt]` or `page[number]`.                                                                                 |
| `source.header`    | The context header that was refused. Any other header parameter is reported with a pointer instead, `/{header-name}`.                               |
| `meta.resource`    | The `type` and `id` of a resource a bulk operation couldn't act on (`FailedResource`), when there's nothing in the request to point at.             |
| `id`               | On a `500`, `501` or `503` an exception produced: the request's trace identifier, which the log records with the exception. Other errors have none. |

## Report several errors at once

A rule that can fail in several places reports every failure with an exception that implements
`IProvideErrors`:

```csharp
using Bitwarden.Server.Sdk.Errors;

/// <summary>
/// Parts a widget names that don't exist: one error for each.
/// </summary>
public sealed class UnknownPartsException(IReadOnlyList<Guid> sent, IReadOnlySet<Guid> missing)
    : Exception("A widget names parts that don't exist."), IProvideErrors
{
    // 422 unless a status is given.
    public IReadOnlyList<Error> Errors { get; } =
    [
        .. sent.Select((part, index) => (part, index))
            .Where(item => missing.Contains(item.part))
            .Select(item => new Error
            {
                Status = "422",
                Code = "resource-not-found",
                Title = "Referenced resource does not exist",
                Detail = $"'{item.part}' is not a widget part.",
                Source = new ErrorSource { Pointer = $"/data/attributes/partIds/{item.index}" },
            }),
    ];
}
```

The create handler checks every part the widget names, then throws once:

```csharp
/// <summary>
/// Create a widget
/// </summary>
[StandardCreate]
public static async Task<ResourceDocument<Widget>> CreateWidget(
    ResourceDocument<Widget> request, IWidgetStore store, CancellationToken cancellationToken)
{
    // Every part that doesn't exist is reported, not only the first.
    var missing = await store.MissingPartsAsync(request.Data.PartIds ?? [], cancellationToken);
    if (missing.Count > 0)
    {
        throw new UnknownPartsException(request.Data.PartIds ?? [], missing);
    }

    return CreateResponse(await store.AddAsync(request.Data, cancellationToken));
}
```

- The caller gets one `422` with an error for each missing part, each pointing at its index in
  `partIds`.
- Override `StatusCode` for another status.
- The package sets `id` only on server faults. An `IProvideErrors` exception may set `Id` on the
  errors it returns.

## Translate a library's exceptions

`IExceptionTranslator` says what a library's own exception means. Register one in
`ConfigureServices`, and the library's exceptions are answered as the package's:

```csharp
using Bitwarden.Server.Sdk.Errors;
using Bitwarden.Server.Sdk.Service;

/// <summary>
/// Says what the widget store library's own exceptions mean.
/// </summary>
public sealed class WidgetStoreExceptionTranslator : IExceptionTranslator
{
    public Exception? Translate(Exception exception) => exception switch
    {
        // Another write got there first: 409.
        WidgetStoreWriteConflictException => new ConflictException(),

        // The store didn't answer: 503, naming it and nothing of how it is reached.
        WidgetStoreTimeoutException timeout => ServiceUnavailableException.TimedOut("widget-store", timeout.Waited),

        // Not ours to say: the next translator, or a 500.
        _ => null,
    };
}

internal sealed class WidgetService(string[] args) : Service("widget-service", "Widget Service", args)
{
    protected override void ConfigureServices(IServiceCollection services) =>
        services.AddSingleton<IExceptionTranslator, WidgetStoreExceptionTranslator>();
}
```

- The first registered translator to return an exception wins, and the caller is answered as if that
  exception had been thrown. A store timeout here becomes `503` `service-unavailable`, with the
  detail "The widget-store service did not answer within 5 seconds."
- The log keeps the original exception.
- Without a translator, a library's exception is a `500`.

## Name a header in an error

The package reports a failing header parameter with a pointer, `/{header-name}`, not in
`source.header`. To name the header, take it as a string, check it in the handler, and throw an
`IProvideErrors` exception whose error sets `Source.Header`:

```csharp
using Bitwarden.Server.Sdk.Errors;

/// <summary>
/// A header the service refuses, named in source.header rather than pointed at.
/// </summary>
public sealed class InvalidHeaderException(string header, string detail) : Exception(detail), IProvideErrors
{
    public IReadOnlyList<Error> Errors { get; } =
    [
        new Error
        {
            Status = "422",
            Code = ErrorCodes.InvalidValue,
            Title = ErrorTitles.InvalidValue,
            Detail = detail,
            Source = new ErrorSource { Header = header },
        },
    ];
}

public static class RegionHeader
{
    public const string Name = "Widget-Region";

    // Take the header as a string, check it in the handler, and throw with its name.
    public static string Require(string? region) =>
        region is "eu" or "us"
            ? region
            : throw new InvalidHeaderException(Name, $"The {Name} header must be 'eu' or 'us'.");
}
```

## Things to know

- **Codes are part of your contract.** Use an `ErrorCodes` constant where one fits. Callers branch
  on a code of your own, so never change it. Titles and details may be reworded.
- **Keep a title per code.** `ErrorTitles` holds the package's titles. Give a code of your own the
  same title every time, as `UnknownPartsException` does.
- **Details reach the caller.** Only a `500` hides what happened. Everything else you write in an
  exception's message is sent.

## See also

- [Standard responses](standard-responses.md): which status fits which failure.
- [Request validation](request-validation.md): the errors binding and validation produce.
- [Bulk responses](../bulk-and-asynchronous-work/bulk-operations/bulk-responses.md): errors inside a
  best-effort `200`, and `meta.resource`.
