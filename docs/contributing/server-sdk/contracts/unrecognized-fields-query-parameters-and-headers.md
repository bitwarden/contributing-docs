---
sidebar_position: 4
---

# Unrecognized fields, query parameters, and headers

**Audience:** engineers writing a Bitwarden service, and its API, with the server SDK.

The package ignores request members, query parameters and headers your handler doesn't declare, and
refuses a result-shaping parameter it declares but can't honour. To also refuse a shaping parameter
the operation doesn't declare at all, add an `IStandardEndpointFilterProvider`.

## What the package ignores and refuses

You declare what an operation accepts through the handler's parameters and the resource's members.
The package then handles the rest:

- **Unknown members are dropped.** In a resource document, a member the resource doesn't have,
  inside `attributes` or beside them, is dropped before your handler sees the resource. So is a
  `[ReadOnly]` member.
- **Undeclared query parameters are ignored.** Only parameters the handler declares are bound.
- **Unknown headers are ignored.** The exception: a product service refuses the context headers
  (`Bitwarden-Organization` and the rest) with `400`, because only a domain service takes them.
- **`sort` is checked when the handler takes `Sort`.** A field the resource doesn't mark
  `[Sortable]` is refused with `422`, and the error lists the sortable fields.
- **`fields[type]` is checked when the handler takes `Fields<T>`.** An attribute the resource
  doesn't have is refused with `422`.
- **`atomic` is checked on every bulk operation.** A value the attribute's `Supports` doesn't allow
  is refused with `422`.

The package does not refuse these; they are ignored:

- A `filter[name]` that no `Filter<T>` parameter called `name` declares.
- `sort` on an operation without a `Sort` parameter, or `fields[...]` without `Fields<T>`.
- `page[number]` on an operation without `PageNumber`, or `page[after]` on one without `PageAfter`.

## Refuse shaping parameters an operation doesn't declare

The package doesn't refuse a `filter`, `sort`, `fields` or `page` parameter the handler doesn't
declare. To refuse it, add an `IStandardEndpointFilterProvider`. The package asks it once for every
standard endpoint, and runs the filter it returns after binding and validation, before the handler.
This one reads which shaping parameters the handler declares, and refuses any other:

```csharp
using System.Reflection;
using Bitwarden.Server.Sdk.Errors;
using Bitwarden.Server.Sdk.Resources.Endpoints;
using Bitwarden.Server.Sdk.Resources.Querying;

/// <summary>
/// Refuses a result-shaping query parameter (<c>filter[...]</c>, <c>sort</c>, <c>fields[...]</c>
/// or <c>page[...]</c>) that the operation does not declare, rather than ignoring it.
/// </summary>
public sealed class WidgetQueryShapeCheck : IStandardEndpointFilterProvider
{
    private static readonly string[] Shaping = ["filter[", "fields[", "page["];

    public IEndpointFilter? For(MethodInfo method, ICollection<string> problems)
    {
        var declared = new HashSet<string>(StringComparer.Ordinal);

        foreach (var parameter in method.GetParameters())
        {
            var type = Nullable.GetUnderlyingType(parameter.ParameterType) ?? parameter.ParameterType;
            var definition = type.IsGenericType ? type.GetGenericTypeDefinition() : null;

            if (definition == typeof(Filter<>))
            {
                declared.Add($"filter[{parameter.Name}]");
            }
            else if (definition == typeof(Fields<>))
            {
                declared.Add((string)type.GetProperty(nameof(Fields<>.Parameter))!.GetValue(null)!);
            }
            else if (type == typeof(Sort))
            {
                declared.Add(Sort.Parameter);
            }
            else if (type == typeof(PageNumber))
            {
                declared.Add(PageNumber.Parameter);
            }
            else if (type == typeof(PageSize))
            {
                declared.Add(PageSize.Parameter);
            }
            else if (type == typeof(PageAfter))
            {
                declared.Add(PageAfter.Parameter);
            }
        }

        return new Filter(declared);
    }

    private sealed class Filter(HashSet<string> declared) : IEndpointFilter
    {
        public ValueTask<object?> InvokeAsync(EndpointFilterInvocationContext context, EndpointFilterDelegate next)
        {
            foreach (var name in context.HttpContext.Request.Query.Keys)
            {
                var shapes = name == Sort.Parameter || Shaping.Any(prefix => name.StartsWith(prefix, StringComparison.Ordinal));

                if (shapes && !declared.Contains(name))
                {
                    throw new UnsupportedQueryParameterException(name);
                }
            }

            return next(context);
        }
    }
}

/// <summary>
/// A query parameter that would shape the result, on an operation that doesn't support it.
/// </summary>
public sealed class UnsupportedQueryParameterException(string parameter)
    : Exception($"This operation does not support '{parameter}'."), IProvideErrors
{
    public IReadOnlyList<Error> Errors =>
    [
        new()
        {
            Status = "422",
            Code = ErrorCodes.InvalidValue,
            Title = ErrorTitles.InvalidValue,
            Detail = Message,
            Source = new ErrorSource { Parameter = parameter },
        },
    ];
}
```

Register it in `ConfigureServices`:

```csharp
services.AddSingleton<IStandardEndpointFilterProvider, WidgetQueryShapeCheck>();
```

- An exception that implements `IProvideErrors` is answered with its own errors. A misspelled
  `filter[color]` is now refused with `422`, with the parameter named in the error's `source`.
- `page[after]` on an offset-paged list, or `page[number]` on a cursor-paged one, is refused the
  same way.
- A parameter that shapes nothing, such as `?trace=1`, is still ignored.
- Register the provider once in each service; it covers every standard endpoint.

## Things to know

- **Parameters bound another way aren't seen.** The filter above reads the handler's own parameters.
  A shaping parameter inside an `[AsParameters]` model, or one a handler reads from
  `HttpRequest.Query` itself, is the handler's to check.
- **Your own headers are yours.** If your service reads a header and doesn't recognize its value,
  refuse or ignore it in the handler. Any other header is ignored.
- **Dropped members never reach the handler.** If you need to know a caller sent a read-only or
  unknown member, the package won't tell you.

## See also

- [Filtering](../querying/filtering.md), [Sorting](../querying/sorting.md),
  [Paging](../querying/paging.md) and [Sparse fieldsets](../querying/sparse-fieldsets.md): the
  parameters an operation declares.
- [All-or-nothing and best-effort](../bulk-and-asynchronous-work/bulk-operations/all-or-nothing-and-best-effort.md):
  the `atomic` parameter.
- [Errors](../payloads-and-responses/errors.md): `IProvideErrors` and the error document.
- [Context](../running-a-service/context.md): the headers a product service refuses.
