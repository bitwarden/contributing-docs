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
