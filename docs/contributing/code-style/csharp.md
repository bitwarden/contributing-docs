---
title: C#
---

# C&#35;

We use the [dotnet-format](https://github.com/dotnet/format) tool to format our C# code. Run it as
follows:

```bash
dotnet format
```

However, since it’s fairly rudimentary we also follow some additional code styling guidelines.

We try to follow C# community standards (with a few exceptions). Review the following articles for a
general overview.

1. [https://docs.microsoft.com/en-us/dotnet/csharp/programming-guide/inside-a-program/coding-conventions](https://docs.microsoft.com/en-us/dotnet/csharp/programming-guide/inside-a-program/coding-conventions)
2. [https://stackoverflow.com/a/310967/1090359](https://stackoverflow.com/a/310967/1090359)

## Private fields

Private fields should be camelCased and prefixed with `_`.

Example:

```csharp
private readonly IUserService _userService;
```

See the following article on how to configure Visual Studio code generation shortcuts to assist with
this naming convention:
[https://stackoverflow.com/q/45736659/1090359](https://stackoverflow.com/q/45736659/1090359)

## Public properties

- Properties should be PascalCased and not have a prefix
- Properties should be spelled out and not use abbreviations or rely on brevity, e.g.
  "OrganizationConfiguration" (good) vs. "OrgConfig" (bad)
- Properties should include blank line between the group of properties and the methods below

## Whitespace

- We use spaces (not tabs) for all code-files, including C#. Indentations should be a standard 4
  spaces.
- Code files should end with a newline after the final `}`
- Blank lines should separate each group of code composition types (fields, constructors,
  properties, public methods, private methods, sub-classes)

## Constructors

- Multiple **constructors** should be separated by a newline (empty line between)
- Constructors with multiple arguments should have 1 argument listed per line
- Empty constructors, when necessary, should be all 1-line, i.e., `public ClassName() { }`

## Control Blocks

- Control blocks should always use curly braces (even 1-line braces)
- `using` and `foreach` blocks should declare contextual variables with `var`
- Always include a space after the control keyword and the `()`

## Conditionals

Long conditionals should use trailing operators when separated across multiple lines.

```csharp
// Good example
if (someBooleanExpression &&
    someVariable != null &&
    someVariable.IsTrue)
{
}

// Bad examples (don't do)
if (someBooleanExpression
    && someVariable != null
    && someVariable.IsTrue)
{
}
// Too long, separate
if (someBooleanExpression && someVariable != null && someVariable.IsTrue)
{
}
```

## Nullable Reference Types

Nullable reference types can be used to make safer code.

### Null forgiving operator

It may sometimes be needed to assert to the compiler that you know something is not null even when
it thinks it might be - to do that you can use the [`!` operator][null-forgiving]. You may want to
do this for properties that you know are populated elsewhere; for example:

```c#
public class User
{
    public string Email { get; set; }
}
```

the compiler will complain that `Email` isn't guaranteed to be non-null but since we know that the
database enforces this column as non-null. One way to fix this is to add a `= null!` after the
property. Another option will be to use the [`required` modifier](#required-modifier) after the
access modifier.

### `required` modifier

The `required` modifier can be nice to place on properties that are required to have a value during
construction but you don't want to include it in the constructor. The compiler ensures that those
properties are always set and will therefore not warn about a possible null reference.

#### `required` modifier vs `[Required]` attribute

When using the `required` modifier it's important to understand the difference between it and how it
affects model binding and validation. [Read more][required-attribute]

### Null attributes

There are a [suite of attributes][null-state-attributes] that help inform the compiler about the
null-state for your code.

### Debug.Assert

Another thing to help the compiler with null state awareness is [`Debug.Assert`][debug-assert]. You
can use it to place a null check that as long as business rules haven't changed will always be true.
For example you might have an assertion like `Debug.Assert(user.IsVerified)` in a part of the app
that only expects verified users. `Debug.Assert` works by using one of the aforementioned attributes
`[DoesNotReturnIf(false)]` to make it work in case you want to implement your own assertion.

[null-forgiving]:
  https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/operators/null-forgiving
[null-state-attributes]:
  https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/attributes/nullable-analysis
[required-attribute]:
  https://learn.microsoft.com/en-us/aspnet/core/mvc/models/validation?view=aspnetcore-9.0#non-nullable-reference-types-and-required-attribute
[debug-assert]:
  https://learn.microsoft.com/en-us/dotnet/api/system.diagnostics.debug.assert?view=net-9.0
