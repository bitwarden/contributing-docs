---
adr: "0032"
status: Proposed
date: 2026-09-07
tags: [clients, mobile, sdk]
---

# 0032 - Consolidate clients, mobile, and the SDK into a monorepo

<AdrTable frontMatter={frontMatter}></AdrTable>

## Context and problem statement

The SDK (`sdk-internal`) is the shared core consumed by `clients`, `android`, and `ios`. Changes
flow along the chain `server` -> `sdk-internal` -> `clients` / `android` / `ios`. As the SDK has
grown into the place where crypto, auth, and vault logic live, its exported surface has become the
single path that changes take to reach every client, and keeping the four repositories in step
across that surface has become a recurring, worsening cost.

A twelve-month measurement (2025-09-01 to 2026-08-31, read from merged PRs and git history across
the four repositories) established the shape of the problem:

- **Breaking changes are frequent and concentrated upstream.** About 20% of merges to `sdk-internal`
  main are breaking (149 of 754). npm and Maven publish on every merge to main, and the
  breaking-change check runs on pull requests only, comments and labels, and never fails the job. So
  a breaking change is published to consumers with no gate that can block it.
- **Breaking changes arrive concurrently, not one at a time.** Every one of the 149 breaking merges
  had another breaking merge within 14 days; 143 of 149 within 3 days. Peak simultaneity was 16
  breaking changes in a 3-day window, 32 in 14 days. A consumer picking up a newer SDK version
  therefore inherits a bundle of unrelated breaks at once, rather than adapting to one change at a
  time.
- **The cost scales with contribution.** Distinct monthly SDK authors grew from about 14 to about 29
  over the year, and breaking merges per month rose alongside. More teams contributing to the shared
  surface means more concurrent breaks, so the problem grows with adoption rather than settling.
- **The downstream burden is real and rising.** Over the window there were 68 forced downstream
  breaking events (clients 18, android 28, iOS 22), with the recent six months at roughly 1.7 times
  the earlier six.
- **Review latency is not the bottleneck.** Approval-to-merge is 1 to 3 hours median on all three
  consumer repositories. The cost is the coordination of adopting a stream of concurrent, bundled
  breaks across repository and language boundaries, not the speed of any single review.

The boundaries in this chain do not all have the same nature, and this matters for what a
consolidation can and cannot fix:

| Boundary                   | Nature                         | Shared version            | Fixable by consolidating source |
| -------------------------- | ------------------------------ | ------------------------- | ------------------------------- |
| `server` -> `sdk-internal` | time-decoupled pull (bindings) | not applicable            | no                              |
| `sdk-internal` -> clients  | build-time, compiled together  | real, per build           | yes                             |
| `sdk-internal` -> mobile   | build-time, compiled together  | real, per build           | yes                             |
| deployed app -> `server`   | run-time wire (HTTP/JSON)      | open-world, many in field | no                              |

The SDK is compiled into each app build, so the `sdk-internal` -> clients/mobile boundaries are
purely build-time concerns where the shared version is real, not a fiction reconstructed from
version deltas. The wire between a deployed app and the server is where version drift is unavoidable
no matter how the source is organized, because the deployed fleet stays heterogeneous.

We want to remove the concurrent-bundle coordination cost at its root, in a way that does not decay
as the number of teams contributing to the SDK continues to grow.

## Considered options

- **Monorepo** - Put `clients`, `android`, `ios`, and `sdk-internal` in a single repository. A
  breaking SDK change and all of its downstream fixes land in one commit; main is never broken
  across the compiled-together boundaries; the concurrent-bundle problem disappears by construction
  because there is no longer a published-then-adopted gap. The guarantee is structural and does not
  depend on sustained process discipline.
- **Additive-only surface (ban breaking changes)** - Never change the exported surface in place; add
  alongside, deprecate, and reap once no consumer uses the old shape. Removes most breaks at the
  source and cleanup is cheap because the consumer set is small and easy to inspect. Relies on a
  sustained reaping habit, carries deprecated surface until reaped, and a residue (nullability
  relaxations, semantic restructures) still cannot go additive.
- **Coordinated merge gate** - Make the existing breaking-change check enforcing and merge a
  breaking SDK change with its client and mobile fixes as one gated set. Delivers the monorepo's
  "cannot merge unfixed" guarantee without merging repositories, and the detection already exists
  (it is advisory today), so it is largely configuration plus cross-repo merge tooling. Cross-repo
  merge coordination is fiddly, and it only removes cross-team waiting when paired with an ownership
  change.
- **Surface design** - Have the SDK own construction (builders, optional fields) and expose fewer
  fine-grained types that consumers must construct or match, lowering the break rate at the source.
  Composes with any of the above but does not help renames or removals, and fights the convenience
  of binding the raw Rust types directly.
- **Client adapter (anti-corruption layer)** - A thin per-client wrapper so a surface change lands
  in one place per consumer instead of at many call sites. Narrows the reach of a break but re-adds
  a client-side layer, which works against the direction of moving logic into the SDK.
- **Ownership change** - Whoever makes a breaking SDK change owns the downstream fix in the same
  merge set. Turns cross-team blocking into one team's sequenced work, but is an organizational
  change and requires the SDK author to work in TypeScript, Swift, and Kotlin, or to pair.

## Decision outcome

Chosen option: **Monorepo**.

Consolidate `clients`, `android`, `ios`, and `sdk-internal` into a single repository so that a
breaking change to the SDK surface and every downstream adaptation are made and merged as one atomic
change. This removes the concurrent-bundle problem by construction: there is no
published-then-adopted gap for breaks to accumulate in, main is never broken across the
compiled-together boundaries, and the shared version across the SDK and its consumers is a real
build artifact rather than a set of pinned versions reconciled after the fact.

The decisive property is that the guarantee is structural rather than procedural. The lighter-weight
options (an enforcing merge gate, additive-only discipline, surface design, ownership) each address
the same root, and the measured evidence made a combination of them the lower-cost path. But every
one of them depends on sustained discipline or process adherence across a contributor base that grew
from about 14 to about 29 monthly SDK authors in a single year and continues to grow. A process
guarantee degrades as headcount and team count rise, which is exactly the direction the data shows
the problem moving. A monorepo does not degrade: the atomic-commit guarantee holds regardless of how
many teams contribute, and it subsumes the merge-gate and ownership benefits without cross-repo
merge tooling. It also gives one place to reason about the entire SDK-to-consumer surface.

This decision accepts a higher migration and build-tooling cost in exchange for that structural
guarantee. The trade-off, and the two problems the monorepo deliberately does not solve, are
recorded below.

**Scope.** `server` is not part of this monorepo. The `server` -> `sdk-internal` boundary is a
time-decoupled pull, not a compiled-together boundary, so consolidating it would not gain the atomic
guarantee. The run-time wire between deployed apps and `server` is likewise out of scope for this
decision (see negative consequences).

### Positive consequences

- The concurrent-bundle coordination cost is removed at its root. A breaking SDK change cannot be
  merged without its downstream fixes, so consumers never inherit a bundle of unrelated breaks to
  adapt to at once.
- Main is never broken across the `sdk-internal` -> clients/mobile boundaries, and the shared
  version is a real build artifact rather than a reconciliation of pinned versions.
- The guarantee is structural and does not weaken as more teams contribute to the SDK, which is the
  direction the measured trend is moving.
- It subsumes the coordinated-merge-gate and ownership options without building and maintaining
  cross-repository merge tooling, and gives a single place to reason about the whole SDK-to-consumer
  surface.

### Negative consequences

- This is the highest-cost option. It requires a large, one-time migration of four repositories,
  their histories, CI, and release pipelines into one.
- The repository would carry a single build graph spanning Rust, TypeScript, Swift, and Kotlin, and
  mobile CI (Xcode and Gradle) would run in response to SDK changes. Keeping that build graph fast
  and selective is a standing cost.
- **A monorepo does not remove the adaptation work itself.** Adapting Swift and Kotlin call sites to
  a changed SDK surface still has to be done; the monorepo removes the coordination and the bundling
  around that work, not the work. The mobile effort measured over the window remains.
- **A monorepo does not solve the run-time boundary.** The deployed app fleet stays heterogeneous,
  so a newer server value can still reach an older deployed app. The forward-compatibility that
  would make additive server changes safe currently exists only in the generated `bitwarden-api-api`
  bindings (via an `__Unknown` catch-all) and not in the SDK-native enums that clients decrypt
  through, so an unknown value fails at the WASM boundary. That gap needs its own work regardless of
  how the source is organized; consolidating the source can make lockstep coexistence easier to
  reason about but cannot make old deployed apps understand new values.
- Consolidating source can weaken the boundaries it spans by making it easy to reach across what
  were previously repository lines. Preserving clear module ownership inside the monorepo becomes a
  discipline that the previous repository split enforced for free.

### Plan

This ADR is `Proposed`. Per the ADR process it is expected to be debated and to reach consensus
among the relevant leads before moving to `Accepted`, and this plan is provisional until it does.

1. Run a build-graph spike to confirm that Rust, TypeScript, Swift, and Kotlin can be orchestrated
   in one repository with acceptable, selective CI (SDK-only changes should not force full mobile
   builds unnecessarily), and choose the build orchestration approach.
2. Decide the repository topology and the migration order, preserving the git history of each source
   repository.
3. Migrate one consumer first (the `sdk-internal` -> clients boundary is the cleanest place to prove
   the atomic-commit workflow), validate the end-to-end change-and-fix-in-one-commit flow, then
   bring in the mobile repositories.
4. Retire the per-consumer version-bump bots and the advisory breaking-change check once the source
   is consolidated, since their purpose (reconciling separately published versions) no longer
   applies across the compiled-together boundaries.
5. Track the run-time forward-compatibility gap as separate, still-required work: carry unknown
   values through deserialization so an unknown item can be skipped per item rather than failing a
   batch, and relocate exhaustiveness to an intentional narrowing gate. This is not fixed by the
   monorepo and must not be assumed to be.
