---
adr: "0037"
status: Proposed
date: 2026-09-22
tags: [clients, mobile, server, sdk, server-sdk]
---

# 0037 - Ratchet restricted dependencies

<AdrTable frontMatter={frontMatter}></AdrTable>

## Context and problem statement

The `server`, `clients`, `sdk-internal`, `ios`, and `android` codebases each deprecate code with an
annotation: `[Obsolete]` in C#, `@deprecated` in TypeScript, `#[deprecated]` in Rust,
`@available(*, deprecated)` in Swift, `@Deprecated` in Kotlin. An annotation names old code. It does
not drain it. Draining requires a software ratchet: a check that lets the codebase move toward a
goal but blocks any step backward. This ADR sets the requirements for the whole stack and decides
the first instance, in the C# `server`. The other four need the same ratchet, each in its own
toolchain.

[ADR-0008](./0008-server-CQRS-pattern.md) replaced `<<Entity>>Service` classes with
[commands and queries](../server/command-query-separation.md). The transition was opportunistic.
[ADR-0032](./0032-break-up-core.md) named the risk: "Without an aggressive timeline, the migration
may stall." Four years on, the migration is not done.

Deprecation by the out-of-the-box `[Obsolete]` attribute has not drained:

- The root `.editorconfig` sets `CS0618` and `CS0612` to suggestion. The build reports 382 `CS0618`
  and 6 `CS0612` locations in 154 files.
- `src/` carries 177 `[Obsolete]` attributes. 37 promise removal. 24 name a ticket.
- `BWA0001` is `[Obsolete]` with a `DiagnosticId`, kept out of `TreatWarningsAsErrors` "so existing
  consumers build while we migrate them." It sits at 283 locations in 141 files. `BWA0002` sits at
  91 in 58.
- `IUserService` has five `[Obsolete]` members. All five still have callers.

`[Obsolete]` cannot tell an existing use from a new one. Raising it to error fails every caller at
once, so it stays a warning. It has no count, no owner, and no expiry. It reports one shape: a
reference to the annotated symbol. It cannot stop the type gaining members.

A ratchet must do five things. Record every existing use. Reject a new one. Let the record only
shrink. Require an owner and an expiry on any exception. Freeze the type's member set.

## Considered options

- **Do nothing:** `[Obsolete]` at suggestion severity, new callers held off by code review.
- **Raise `CS0618` and `CS0612` to error repository-wide:** 388 existing locations fail at once.
- **Per-id `[Obsolete(DiagnosticId)]` at error, opted out per `CODEOWNERS` folder:** `BWA0001`
  already takes this shape and sits at 283 locations as a warning. A folder opt-out has no owner,
  expiry, or count.
- **Roslyn analyzer with a declaration-side attribute and a committed shrink-only baseline per type,
  shipped from `dotnet-extensions`.**

## Decision outcome

Chosen option: **Roslyn analyzer with a declaration-side attribute and a committed shrink-only
baseline per type, shipped from `dotnet-extensions`**. It is the only option that records existing
uses, rejects new ones, and never lets the baseline grow.

The analyzer ships as `Bitwarden.Server.Sdk.RestrictedDependencies` from `dotnet-extensions`. The
type being dissolved is annotated where it is declared:

```csharp
[RestrictedDependency(AllowExistingUses = true, AllowNewUses = false,
    Tracking = "PM-43148", Owner = "@bitwarden/tech-leads",
    SealMembers = true, AllowedPaths = ["src/Core/Services/Implementations/UserService.cs"])]
public interface IUserService
{
    [RestrictedDependency(AllowExistingUses = true, AllowNewUses = true)]
    Guid? GetProperUserId(ClaimsPrincipal principal);

    [RestrictedDependency(Replacement = "IHasPremiumAccessQuery.HasPremiumFromOrganizationAsync")]
    Task<bool> HasPremiumFromOrganization(User user);

    [RestrictedDependency(AllowExistingUses = false, AllowNewUses = false)]
    string GetUserName(ClaimsPrincipal principal);
}
```

`[RestrictedDependency]` replaces `[Obsolete]` on a restricted type. The analyzer does not read
`[Obsolete]`. `Replacement` puts the successor in the error message.

- **Rule.** The `(AllowExistingUses, AllowNewUses)` pair sets it. The default is `(true, false)`.
  - `(true, true)` is tracked only. Uses are counted in the baseline and never a diagnostic.
  - `(true, false)` is gated. Baselined uses pass. Anything beyond the baseline fails.
  - `(false, false)` is forbidden. Every use fails.
  - A member attribute overrides the type's rule for that member.
  - `SealMembers` freezes the declared member set.
  - `AllowedPaths` exempts the implementation file.
- **Baseline.** One committed JSON file per type records every existing use.
  - Rows are keyed by the documentation-comment id of the containing member. Moving lines changes
    nothing.
  - `declaredMembers` lists the type's members. `SealMembers` checks new members against it.
  - An `update` tool regenerates it. The tool hosts the same analyzer the compiler runs, so the two
    cannot disagree.
  - As of today `IUserService` has 475 uses across 6 projects: 83 injection, 365 member, 7 locator,
    1 concrete, 19 escape.
- **Shapes.** Five access shapes, one id each: injection (BW0005), member (BW0006), service locator
  (BW0007), concrete implementation (BW0008), escape (BW0009).
  - A removed use fails the build (BW0013) until the baseline shrinks.
  - A new member on a sealed type fails (BW0014).
  - An annotated type with no committed baseline, or a member attribute on an unannotated type,
    fails (BW0015).
- **Exceptions.** `[RestrictedDependencyException]` with `Owner`, `Reason`, and `Expires` is the
  only sanctioned new gated use.
  - An incomplete exception excepts nothing (BW0010).
  - An expired one warns (BW0011).
  - A pragma or `[SuppressMessage]` naming any of these ids is an error (BW0012).
  - Lowering any id but BW0011 below error in `.editorconfig`, `NoWarn`, or `WarningsNotAsErrors` is
    an error and has no effect (BW0016).
- **Wiring.** One block in `Directory.Build.props`.
  - `RestrictedDependencyAnalysis`, `RestrictedDependencyBaselinesPath`, and
    `RestrictedDependencyUpdateCommand`.
  - A `PackageReference` with `IncludeAssets="analyzers;build" PrivateAssets="all"`.
  - The ids join the `BW0001`–`BW0004` registry in `docs/diagnostics.md` in `dotnet-extensions`.
- **Replacement.** It must not depend on the type being dissolved. A type that injects it and
  forwards to it is a wrapper, not a replacement.

### Positive consequences

- A new gated use fails the build unless an exception names its owner, reason, and expiry.
- The recorded count per type, member, shape, and project is committed and its diff is reviewable.
  It only goes down once the CI check in the Plan lands.
- The error names the replacement.
- Annotating a type and committing its baseline in one change fails nothing.
- Sealing stops the type growing while it is dissolved.
- Expired `[RestrictedDependencyException]` warns as BW0011 instead of failing. Normal work is
  uninterrupted.

### Negative consequences

- Renaming a method that holds baselined uses reports BW0013 for the old key and BW0006 for the new
  one until `update` runs.
- The analyzer trusts the committed baseline. A row added by hand is not detected by the build. A CI
  diff check is required and does not exist yet.
- Tracked-only members are not gated in either direction. As of today 240 of the 365 member uses of
  `IUserService` are tracked only.
- A hand-rolled static service locator is invisible to BW0007.
- A project can set `RestrictedDependencyAnalysis` to false, and no diagnostic reports it.

### Plan

- Implement `RestrictedDependency` in `dotnet-extensions` and publish the package.
- Wire `server`: props for `src/` and `bitwarden_license/src/`, the baseline tool, the
  `IUserService` attribute and baseline, `[Obsolete]` removed from `IUserService`, and `BW0011` in
  `WarningsNotAsErrors`.
- Add the missing guards: a CI job that fails when a baseline gains rows, built on
  `BudgetRatchet.FindGrowth`, and a scan for `RestrictedDependencyAnalysis=false` and global
  suppressions of these ids.
- Annotate each remaining type being dissolved, one PR each, with the owner on the attribute. A type
  with no owner waits until it has one.
- Migrate `BWA0001` and `BWA0002` to `[RestrictedDependency]` and delete their `WarningsNotAsErrors`
  carve-outs.
- A member is done when its rows reach zero and it is deleted, shrinking `declaredMembers`. A type
  is done when `declaredMembers` is empty and the type and its baseline are deleted.
