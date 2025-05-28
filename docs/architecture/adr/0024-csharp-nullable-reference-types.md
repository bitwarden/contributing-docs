---
adr: "0024"
status: Proposed
date: 2025-05-27
tags: [server]
---

# 0024 - Adopt nullable reference types

<AdrTable frontMatter={frontMatter}></AdrTable>

## Context and Problem Statement

C# 8 introduced nullable reference types (NRT) that allows for enhanced compiler tracking of null
references. This allows for null problems to be caught sooner during the compilation phase vs the
runtime phase. One of those problems are `NullReferenceException` which happens when you try to
interact with a reference when it is actually a `null` reference. We see [thousands of
these][errors] exceptions every week.

### Nullable Reference Types

> Nullable reference types are a group of features that minimize the likelihood that your code
> causes the runtime to throw System.NullReferenceException. Three features that help you avoid
> these exceptions, including the ability to explicitly mark a reference type as nullable:
>
> - Improved static flow analysis that determines if a variable might be null before dereferencing
>   it.
> - Attributes that annotate APIs so that the flow analysis determines null-state.
> - Variable annotations that developers use to explicitly declare the intended null-state for a
>   variable.
>
> <cite>https://learn.microsoft.com/en-us/dotnet/csharp/nullable-references</cite>

### Enablement

NRT can be enabled project wide with `<Nullable>enable</Nullable>` in the project file. Which
enables the default for all files in that project. Each file can also choose to opt in/out through a
compiler directive `#nullable enable` or `#nullable disable` respectively.

## Considered Options

- **Do not enable NRT** - We've already started enabling NRT and I think it would be akin to
  disallowing code comments. It can be pretty easy for just one team to adopt if they want to do so.
- **Disabled project-wide, enabled at the file level** - This is where we are, it allows teams to
  opt into using it when you want. The problem is it's easy to want to use NRT but forget to enable
  it in the file.
- **Enable project-wide, disable at the file level** - Requires a large PR updating all files to
  disable NRT unless they have already opted in. New files will then automatically have NRT turned
  on.
- **Enable repo-wide, have one engineer resolve issues** - Enabling NRT on the `Core` project alone
  results in 1497 warnings.

## Decision Outcome

Chosen option: **Enabled project-wide, disable at the file level**.

### Positive Consequence

- New files will get null warnings
- Easier "checklist" for what is left to migrate `Ctrl+F` for `#nullable disable`

### Negative Consequence

- Slower migration to 100% NRT annotated than having a single engineer do it.
- We will continue to have parts of the code with null issues.

### Plan

Uncomment
[this line](https://github.com/bitwarden/server/blob/fbc8e06c998b6f73814f6b80af8d6d06195a4104/Directory.Build.props#L15)
in our `Directory.Build.props` file to enable NRT for all non-test projects. For each file that has
warnings, we will add `#nullable disable` (with a following new line) to the top of the file. If
there are files that are already compatible with having NRT on then they will automatically get it.

This change would have the following amount of files changed for each team:

- @bitwarden/team-admin-console-dev: 63
- @bitwarden/team-auth-dev: 64
- @bitwarden/team-billing-dev: 36
- @bitwarden/team-data-insights-and-reporting-dev: 4
- @bitwarden/team-key-management-dev: 3
- @bitwarden/team-tools-dev: 7
- @bitwarden/team-vault-dev: 19

A PR would be created for each team to add the disable and once all of those merge a PR enabling
Nullable repo-wide would be made. Each team would then have a tech debt ticket created for them to
remove the exclusion from their file and fix resulting null warnings.

The plan does NOT involve migrating our test projects to have nullable enabled but to allow nullable
annotations only for them. This is actually already in place today. Often, in test files you
explicitly want to go against the null annotations of files in order to test unhappy paths. For
example, you want to pass in `null` and assert that the method throws a `ArgumentNullException` when
that is done. It's a bit nicer to not have to use the null assertion operator `!` every time you do
that. It does mean that you may get runtime null errors in tests a little more often but tests have
a much quicker runtime feedback loop than the general application so this is not usually a big
problem.

### Guidelines

Below are some helpful guidelines for migrating files to be nullable annotated.

#### Null forgiving operator

It may sometimes be needed to assert to the compiler that you know something is not null even when
it thinks it might be. To do that you can use the [`!` operator][null-forgiving]. You may want to do
this for properties that you know are populated elsewhere. For example:

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

#### `required` modifier

The `required` modifier can be nice to place on properties that are required to have a value during
construction but you don't want to include it in the constructor. The compiler ensures that those
properties are always set and will therefore not warn about a possible null reference.

##### `required` modifier vs `[Required]` attribute

When using the `required` modifier it's important to understand the difference between it and how it
affects model binding and validation. [Read more][required-attribute]

#### Null attributes

There are a [suite of attributes][null-state-attributes] that help inform the compiler about the
null-state for your code.

#### Debug.Assert

Another thing to help the compiler with null state awareness is [`Debug.Assert`][debug-assert]. You
can use it to place a null check that as long as business rules haven't changed will always be true.
For example you might have an assertion like `Debug.Assert(user.IsVerified)` in a part of the app
that only expects verified users. `Debug.Assert` works by using one of the aforementioned attributes
`[DoesNotReturnIf(false)]` to make it work in case you want to implement your own assertion.

[errors]:
  https://us3.datadoghq.com/error-tracking?query=error.type%3ASystem.NullReferenceException&fromUser=true&refresh_mode=sliding&source=all&from_ts=1747751457422&to_ts=1748356257422&live=true
[null-forgiving]:
  https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/operators/null-forgiving
[null-state-attributes]:
  https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/attributes/nullable-analysis
[required-attribute]:
  https://learn.microsoft.com/en-us/aspnet/core/mvc/models/validation?view=aspnetcore-9.0#non-nullable-reference-types-and-required-attribute
[debug-assert]:
  https://learn.microsoft.com/en-us/dotnet/api/system.diagnostics.debug.assert?view=net-9.0
