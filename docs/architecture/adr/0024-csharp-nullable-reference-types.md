---
adr: "0024"
status: Proposed
date: 2025-05-27
tags: [server]
---

# 0024 - Adopt .NET Nullable Reference Types

<AdrTable frontMatter={frontMatter}></AdrTable>

## Context and Problem Statement

C# 8 introduced nullable reference types (NRT) that allow for enhanced compiler tracking of null
references. This enables nullability problems to be caught sooner during the compilation phase vs.
the runtime phase -- one of those problems is `NullReferenceException` that happens when you try to
interact with a reference when it is actually a `null` reference. We see [thousands of
these][errors] exceptions every week.

### Nullable Reference Types

> Nullable reference types are a group of features that minimize the likelihood that your code
> causes the runtime to throw `System.NullReferenceException`. Three features help you avoid these
> exceptions, including the ability to explicitly mark a reference type as nullable:
>
> - Improved static flow analysis that determines if a variable might be null before dereferencing
>   it.
> - Attributes that annotate APIs so that the flow analysis determines null-state.
> - Variable annotations that developers use to explicitly declare the intended null-state for a
>   variable.
>
> <cite>https://learn.microsoft.com/en-us/dotnet/csharp/nullable-references</cite>

### Enablement

NRT can be enabled project-wide with `<Nullable>enable</Nullable>` in the project file; this enables
the default for all files in that project. Each file can also choose to opt in or out through a
compiler directive `#nullable enable` or `#nullable disable` respectively.

## Considered Options

- **Do not enable NRT** - We've already started enabling NRT and it would be akin to disallowing
  code comments. It can be pretty easy for just one team to adopt if they want to do so.
- **Disabled project-wide, enabled at the file level** - where we are today, as it allows teams to
  opt into using it when you want. The problem is it's easy to want to use NRT but forget to enable
  it in the file.
- **Enable project-wide, disable at the file level** - Requires a large PR updating all files to
  disable NRT unless they have already opted in. New files will then automatically have NRT turned
  on.
- **Enable repo-wide, have one engineer resolve issues** - Enabling NRT on the `Core` project alone
  results in 1497 warnings.

## Decision Outcome

Chosen option: **Enabled project-wide, disable at the file level**.

### Positive Consequences

- New files will get null warnings.
- Easier "checklist" for what is left to migrate `Ctrl+F` for `#nullable disable`.

### Negative Consequences

- Slower migration to 100% NRT annotated than having a single engineer do it.
- We will continue to have parts of the code with null issues.

### Plan

Uncomment
[this line](https://github.com/bitwarden/server/blob/fbc8e06c998b6f73814f6b80af8d6d06195a4104/Directory.Build.props#L15)
in our `Directory.Build.props` file to enable NRT for all non-test projects. For each file that has
warnings, we will add `#nullable disable` (with a following new line) to the top of the file. If
there are files that are already compatible with having NRT on then they will automatically get it.

A PR would be created for each team to add the disable and once all of those merge a PR enabling
Nullable repo-wide would be made. Each team would then have a tech debt ticket created for them to
remove the exclusion from their file and fix resulting null warnings.

The plan does _not_ involve migrating our test projects to have nullable enabled but to allow
nullable annotations only for them; this is actually already in place today. Often in test files you
explicitly want to go against the null annotations of files in order to test unhappy paths; for
example, you may want to pass in `null` and assert that the method throws a `ArgumentNullException`
when that is done. It's a bit nicer to not have to use the null assertion operator `!` every time
you do that. It does mean that you may get runtime null errors in tests a little more often but
tests have a much quicker runtime feedback loop than the general application so this is not usually
a big problem.

Coding standards will be [updated](../../contributing/code-style/csharp.md#nullable-reference-types) to indicate usage of NRTs.

[errors]:
  https://us3.datadoghq.com/error-tracking?query=error.type%3ASystem.NullReferenceException&fromUser=true&refresh_mode=sliding&source=all&from_ts=1747751457422&to_ts=1748356257422&live=true
