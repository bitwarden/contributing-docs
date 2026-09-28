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
not drain it. Draining requires a software ratchet: a check that allows the codebase to move toward
a goal but blocks any step backward. This ADR sets the requirements for the whole stack and decides
the first instance, in the C# `server`. The other four need the same ratchet, each in its own
toolchain.

[ADR-0008](./0008-server-CQRS-pattern.md) replaced `<<Entity>>Service` classes with
[commands and queries](../server/command-query-separation.md). The transition was opportunistic.
[ADR-0032](./0032-break-up-core.md) warns that the `Core` breakup may stall without an aggressive
timeline. Four years after ADR-0008, the CQS migration is not done.

Deprecation by the out-of-the-box `[Obsolete]` attribute has not drained:

- The root `.editorconfig` sets `CS0618` and `CS0612` to suggestion. The build reports 382 `CS0618`
  and 6 `CS0612` locations in 154 files.
- `src/` carries 177 `[Obsolete]` attributes. 37 promise removal. 24 name a ticket.
- `BWA0001` is `[Obsolete]` with a `DiagnosticId`, kept out of `TreatWarningsAsErrors` "so existing
  consumers build while we migrate them." It sits at 283 locations in 141 files. `BWA0002` sits at
  91 in 58.
- `IUserService` has five `[Obsolete]` members. All five still have callers.

`[Obsolete]` cannot tell an existing use from a new one. Raising it to error fails every caller at
once, so it stays below error. It has no count, no owner, and no expiry. It reports one shape: a
reference to the annotated symbol. It cannot stop the type gaining members.

A ratchet should do five things. Record every existing use. Reject a new one. Let gated counts only
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
uses, rejects new ones, and allows a CI pipeline to block any rise in a gated count.

### Positive consequences

- A new gated use fails the build unless an exception names its owner, reason, and expiry.
- Each type's baseline is committed, and its diff is reviewable.
- The build error names the replacement.
- Annotating a type and committing its baseline in one change fails nothing.
- Sealing stops the type growing while it is dissolved.
- An expired exception warns instead of failing. Normal work is uninterrupted.

### Negative consequences

- Renaming a method that holds existing uses fails the build until the baseline is regenerated.
- Regenerating the baseline records every current use, new ones included. Only the CI pipeline
  catches a gated count that rose. That pipeline does not exist yet.
- Tracked-only members are not gated in either direction.
- The analyzer does not detect a hand-rolled static service locator.
- A project can turn the analysis off, and nothing reports it.

### Plan

The analyzer ships as `Bitwarden.Server.Sdk.RestrictedDependencies` from `dotnet-extensions`.

- `[RestrictedDependency]` on the type's declaration replaces `[Obsolete]`. It names an owner, a
  tracking ticket, and the replacement.
- The attribute sets the rule: tracked only, gated, or forbidden. Gated is the default. A member can
  override its type.
- The attribute can seal a type so it cannot gain members.
- A committed baseline per type records every existing use. A removed use fails the build until the
  baseline shrinks.
- An exception needs an owner, a reason, and an expiry. Suppressing the analyzer's diagnostics is an
  error.
- A replacement must not depend on the type being dissolved. A type that injects it and forwards to
  it is a wrapper, not a replacement.
- A CI pipeline manages the baseline counts. A gated count only falls.

Follow-up work:

- Publish the package from `dotnet-extensions`.
- Wire `server` and annotate `IUserService` first.
- Add the CI pipeline that manages the baseline counts.
- Annotate each remaining type being dissolved, one PR each. A type with no owner waits until it has
  one.
- Migrate `BWA0001` and `BWA0002` to `[RestrictedDependency]`.
- A type is done when its uses reach zero and the type and its baseline are deleted.
