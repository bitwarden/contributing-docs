---
adr: "0032"
status: Proposed
date: 2026-09-08
tags: [clients, mobile, sdk]
---

# 0032 - Move the SDK and its consumers into one monorepo

<AdrTable frontMatter={frontMatter}></AdrTable>

## Context and problem statement

Our shared logic now flows along a chain of separate repositories: `server` defines API models,
`sdk-internal` turns them into exported types and vault, crypto, and auth logic, and `clients`,
`android`, and `ios` consume that logic. As more of the product moves into the SDK, more code
crosses these repository boundaries, and each crossing is a place where a change in one repository
forces a change in another.

We measured the cost over twelve months (2025-09-01 to 2026-08-31), reading merged PRs and git
history across the four repositories. The result: **68 forced downstream breaking events** (clients
18, android 28, iOS 22), where an SDK change made a consumer change its own source to keep compiling
or to adopt the update.

Two findings shape the decision.

**Review is never the bottleneck.** Median time from a fix being ready to it merging is 1 to 3 hours
on all three consumer repositories. The cost is not getting a fix approved. The cost is the
coordination of adopting a stream of unrelated breaks that arrive together across repository and
language boundaries.

**The pressure is upstream and rising.** About 20% of merges to `sdk-internal` are breaking (149 of
754). They do not arrive one at a time: every one of the 149 had another breaking merge within 14
days, and 143 of 149 within 3 days, with peaks of 16 breaking merges in a single 3-day window. npm
and Maven publish on every merge to `sdk-internal` main, and the breaking-change check that runs on
PRs only comments and applies a label; it never fails the job, so it cannot stop a breaking publish.
A consumer that picks up a new SDK version therefore inherits a group of unrelated breaks at once.
This scales with the number of teams contributing to the SDK, and that number is climbing: distinct
monthly SDK authors grew from about 14 to about 29 over the year, and the combined monthly event
count peaked at 16 in the final month.

The boundaries in this chain are not all the same, and that difference is the reason a monorepo is
worth considering at all:

| Boundary                  | Nature                             | Shared version            | A monorepo helps |
| ------------------------- | ---------------------------------- | ------------------------- | ---------------- |
| `server -> SDK`           | time-decoupled pull (bindings bot) | pull when ready           | no               |
| `SDK <-> clients/mobile`  | build-time, compiled together      | real, per build           | yes              |
| `deployed app <-> server` | run-time wire (HTTP/JSON)          | open-world, many versions | no               |

The SDK is compiled into each app build, so `SDK <-> app` is purely a build-time concern and the
shared version is real, not a fiction. That is precisely the boundary where breaking events happen,
and precisely the boundary a monorepo can make atomic. The run-time wire between a deployed app and
the server stays heterogeneous no matter how the source is organized, so this decision does not
touch it.

One more piece of context frames the options. There are two categories of break. Problem 1 is
server-owned types (enums like `CipherType`) crossing into clients. Problem 2 is the SDK's own
exported surface changing (repository interfaces, crypto request shapes, unions, the ongoing move of
logic into the SDK). Once everything goes through the SDK, Problem 1 collapses into Problem 2:
supporting a new server value is itself an SDK surface change. Problem 2 is about five times the
cost of Problem 1 and is where nearly all 68 events sit. It is a coordination problem on the
compiled-together boundary, which is the boundary this ADR addresses.

## Considered options

- **Monorepo** - Put `sdk-internal`, `clients`, and `mobile` in one repository. A breaking SDK
  change and the fixes to its consumers land in one commit. Main is never broken, and the
  concurrent-bundle problem disappears because there is no publish step between the change and its
  adoption. The cost is a build graph spanning Rust, TypeScript, Swift, and Kotlin, mobile CI (Xcode
  and Gradle) reacting to SDK changes, and a large migration. It removes the coordination around the
  adaptation, not the adaptation work itself.
- **Additive-only surface** - Never change the exported surface in place; add alongside, deprecate,
  and reap later. Removes most breaks at the source and is cheap to clean up because the consumer
  set is small and known. It carries deprecated surface until someone reaps it, depends on that
  reaping habit holding, and a residue (nullability relaxations, semantic restructures) still cannot
  go additive.
- **Coordinated merge gate** - Make the existing breaking-change check enforcing, and merge a
  breaking SDK change together with its consumer fixes as one gated set. This reaches for the
  monorepo's "cannot merge unfixed" guarantee without merging repositories, and the detection
  already exists. Cross-repository merge coordination is fiddly to build, and it only removes
  cross-team waiting if it is paired with ownership.
- **Surface design** - Have the SDK own construction (builders, optional fields) so there are fewer
  fine-grained types a consumer must build or match. Lowers the break rate at the source and
  composes with everything else. It is design discipline that works against the convenience of
  binding the raw Rust types, and it does nothing for renames and removals.
- **Client adapter** - A thin per-client wrapper so a surface change lands in one place instead of
  many call sites. Narrows the reach of a break, but re-adds a client-side layer, which pulls
  against the direction of moving logic into the SDK.
- **Ownership** - Whoever makes the breaking SDK change owns the downstream fix in the same set.
  Turns cross-team blocking into one team's sequenced work. It is an organizational change, and it
  needs the SDK author to work in TypeScript, Swift, and Kotlin, or to pair with someone who does.

The last five options are real and each helps. What they share is that they all depend on discipline
being held: a check kept enforcing, an additive habit maintained, an ownership rule honored, a
surface kept clean. The data shows that discipline getting harder to hold, not easier: contributors
roughly doubled over the year and the breaking fraction rose with them. A solution that leans on
every contributor keeping a habit tends to erode as the group grows. That is the case for preferring
a structural fix.

## Decision outcome

Chosen option: **Monorepo**. Move `sdk-internal`, `clients`, and `mobile` into a single repository,
so that a breaking change to the SDK surface and the fixes to every consumer of that surface land in
one commit.

The reason to prefer it over the cheaper options is that it removes the coordination cost by
construction rather than by discipline. In one repository there is no publish step between an SDK
change and its adoption, so there is no window in which a consumer sits on a broken published
version, and there is no bundle of unrelated breaks to inherit, because each break is fixed in the
commit that introduces it. Main is never broken. The guarantee holds no matter how many teams
contribute, which is the property the discipline-based options lack: they get harder to hold as
contributor count grows, and the measurements show that count growing.

We want to be exact about what this does and does not buy, because the argument only holds where the
guarantee actually applies:

- It applies where code is compiled together. That is the `SDK <-> clients` and `SDK <-> mobile`
  boundary, which is where all 68 events sit.
- It removes the concurrent-bundle adoption and the broken-main window. For mobile it also removes
  the rolling-branch lingering, where a break can sit for days on an open bump branch before the
  next batch takes it (iOS branch-window median 164.6 hours, android 79.9 hours over the recent six
  months).
- It does not remove the adaptation labor itself. When the SDK surface changes, the Swift and Kotlin
  code that uses it still has to be written. What changes is that the writing happens in the same
  commit as the break, by the change's author or their pair, instead of later by another team.
- It does not touch the run-time wire boundary. A deployed app fleet talking to the server stays
  heterogeneous, and forward-compatibility there (tolerating unknown server values) is a separate
  concern that this decision neither solves nor needs to.

Because the two consumer boundaries differ in migration cost, we adopt in two phases:

1. `sdk-internal` and `clients` first. They already share npm and the WASM integration, so the build
   graph and CI changes are the smallest. Clients pain today is small and spiky (blocked-time median
   2.4 hours, pipeline red about 2% of the time), so this phase is more about locking in the
   guarantee before adoption climbs than about relieving acute pain. Clients SDK imports went from
   91 to 300 files over the year, so the exposure is climbing.
2. `mobile` second. This is the harder engineering piece, because it puts Xcode and Gradle into the
   build graph and makes them react to SDK changes. It is also where the pain is largest today, so
   it is where the guarantee pays off most.

This ADR argues for the monorepo, but it is proposed for the group to decide, not settled. The
cheaper combination (make the breaking-change check enforcing, adopt per version instead of in
batches, shape the surface to break less, pair it with ownership) addresses the same root and covers
mobile at lower cost. It remains the reasonable choice for anyone who weighs the migration cost
above the value of a guarantee that does not depend on discipline. The clean 1:1 mobile bumps in the
data (for example android #7187, merged 2.8 hours after opening) show that per-version adoption is
cheap when it is not batched, which is the strongest point for the cheaper path.

### Positive consequences

- A breaking SDK surface change and its consumer fixes are one atomic commit, so main never carries
  a break that a downstream repository has not yet absorbed.
- The concurrent-bundle problem goes away: there is no published version accumulating unrelated
  breaks for a consumer to adopt all at once.
- The guarantee does not weaken as more teams contribute to the SDK, unlike the discipline-based
  options, which the twelve-month trend shows getting harder to hold.
- One place to reason about a change and its full effect, which shortens the loop of "change the
  SDK, find every consumer it touches."

### Negative consequences

- The build graph spans Rust, TypeScript, Swift, and Kotlin in one repository, and mobile CI (Xcode
  and Gradle) has to react to SDK changes. This is the hardest part to build and the main risk.
- The migration is large and touches every affected repository's history, tooling, and release
  process. Rust crates and the Swift package release manually and in batches today (Rust released
  twice in the year), and those release paths have to be reworked to fit one repository.
- The adaptation labor does not go away. Writing the Swift and Kotlin changes for a surface change
  is the same amount of work; the monorepo changes who does it and when, not whether it is done.
- Whoever makes a breaking SDK change now has to make it compile across all consumers in the same
  commit, which means either working across four languages or pairing with someone who can. Without
  an ownership answer, this can move the blocking rather than remove it.
- A larger repository has its own costs: slower full builds, more CI to keep fast, and more care
  needed to avoid a change in one language triggering unnecessary work in another.

### Plan

1. Prove the build graph on `sdk-internal` and `clients` first: a single repository where a Rust SDK
   change and its TypeScript consumers build and test together, with CI that only rebuilds what a
   change actually affects.
2. Replace the npm publish-and-bump loop between `sdk-internal` and `clients` with in-repository
   consumption, and make a breaking SDK change unable to merge unless the client fixes are in the
   same commit.
3. Settle ownership: whoever changes the SDK surface owns making every in-repository consumer
   compile in that commit, by pairing where they do not know the consumer language.
4. Bring `mobile` in second, once the clients phase is stable, including Xcode and Gradle in the
   build graph and moving the Swift and Maven release paths into the repository.
5. Keep the run-time forward-compatibility work (tolerating unknown server values on the wire)
   tracked separately, since the monorepo does not address that boundary.
