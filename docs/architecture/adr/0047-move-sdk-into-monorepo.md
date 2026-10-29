---
adr: "0047"
status: Proposed
date: 2026-09-22
tags: [clients, mobile, sdk, server]
---

# 0047 - Move the SDK into the clients monorepo

<AdrTable frontMatter={frontMatter}></AdrTable>

## Context and problem statement

The `sdk-internal` repository lives on its own and reaches the clients as a published npm package
(and a Maven package for android, a Swift package for iOS). Every breaking change in the SDK has to
travel through that publish step before any consumer can adopt the change that follows it. That
turns delivery into a single serialized pipeline: many teams write to the SDK, everything funnels
through one published version, and many teams consume it on the other side. One team's unfinished
downstream fix holds up everyone waiting for a later SDK change.

Put another way: every breaking change in the SDK adds to a queue of fixes that then have to merge
on the clients side in the same order they merged in the SDK. If Team A merges a breaking change
into the SDK, every other team waits for Team A's corresponding client fix before it can pull in any
SDK change that landed after the break.

We have tried to manage this without changing the structure. The breaking-change detection workflow
builds the latest `clients` `main` against SDK PRs so a breaking change can arrive with its fix PR
ready. It has not been enough: breaking changes have gone up, not down, even with the workflow in
place. Doing nothing is not a stable position, because the pressure grows as more features and more
teams move into the SDK.

A 12-month measurement (2025-09-01 to 2026-08-31, read from merged PRs and git history) shows the
shape of the problem:

- **68 forced downstream breaking events**: clients 18, android 28, iOS 22. The earlier six months
  had 25; the recent six months had 43, about 1.7x, with August the peak at 16.
- **About 20% of merges to `sdk-internal` main are breaking**: 149 of 754. Distinct authors per
  month grew from about 14 to about 29 over the year. More contributors means more breaking changes.
- **Concurrency is the norm.** Every one of the 149 breaking merges had another breaking merge
  within 14 days; 143 of 149 within 3 days. A consumer picking up a new version does not adopt one
  break, it adopts a bundle of unrelated breaks at once.
- **Nothing gates the publish.** npm and Maven publish on every merge to main. The breaking-change
  check runs on PRs, comments, and adds a `breaking-change` label, but never fails the job (a
  known-breaking PR, [sdk-internal#906](https://github.com/bitwarden/sdk-internal/pull/906), passed
  green). So a breaking change ships to consumers whether or not its downstream fix exists.
- **Code review is not the bottleneck.** On clients, review latency is negligible and total blocked
  time is small (median 2.4 hours). Mobile looks different: android and iOS adopt on a rolling
  branch, with median branch windows of about 80 and 165 hours, but that window is dominated by
  adaptation effort and the branch sitting open between re-bumps, not by waiting for a reviewer, and
  per-break approval time cannot be cleanly separated from it. The cost across all three repos is
  coordination and adaptation, not code review.
  - Keep in mind that this is absolute time and the real cost is person-hours across the blocked
    teams. On repositories like `clients` that can easily mean an order of magnitude more
    person-hours.
- **The churn is in the application layer.** Breaks across the dataset are dominated by SDK-owned
  surface changes (struct and field reshapes, renames, unions, new APIs), and the clients coupling
  points are mostly vault, tools, admin-console, and importer code.

The reason to act is not the size of the problem today, it is the trend. The main driver is upstream
in the SDK, and it grows with the number of contributing teams, so the problem gets worse as
adoption grows.

The server relationship is a separate matter. Server changes reach the SDK through generated API
bindings, but server-owned enum-variant breaks are rare in the data (clients 0, android 1, iOS 1).
And because the app and the server ship independently, they always have to stay compatible with each
other over the wire, which no source layout changes. That is separate work, not part of this
decision.

## Considered options

- **Do nothing, improve iteratively:** keep the repos separate and reduce breaks at the edges (SDK
  owns construction so added fields do not break callers, new fields optional by default, fewer
  fine-grained types for clients to construct or match, a client-side facade).
- **Ban breaking changes (additive-only):** never change the exported surface in place; add
  alongside, deprecate, reap.
- **Coordinated merge gate:** keep the repos separate, make the existing breaking-change check
  enforcing, and merge a breaking SDK change together with its client and mobile fixes as one gated
  set (a distributed atomic merge across repos).
- **Versioned SDK releases:** keep the repos separate, but release the SDK as its own deliverable
  every two weeks (semver, a changelog of breaking changes) instead of publishing on every merge to
  main, and let consumers upgrade when it suits them.
- **Product repository:** split the SDK crates. Move the application-logic crates into a product
  repository with the clients, and keep the shared, lower-level crates in a separate repository.
- **Monorepo:** move the whole SDK into the `clients` repository, the way `jslib` was folded in
  before, so the SDK and the clients build together.

### Do nothing, improve iteratively

Reducing breaks at the interface is worth doing regardless, and it composes with any other choice.
On its own it does not remove the bottleneck, and it does not stop breaking changes from happening.

### Ban breaking changes (additive-only)

If nothing ever breaks, the bottleneck disappears. The cost is the overhead of carrying and later
cleaning up backwards-compatible surface, and with Rust that overhead can grow sharply with each
change. Some changes (nullability relaxations, semantic restructures) cannot be made additive and
still have to be coordinated as a real break.

### Coordinated merge gate

This is the strongest alternative that keeps the repos separate. It reaches the same "a break cannot
merge without its fixes" guarantee as the monorepo, and it covers mobile without moving any
repository. The breaking-change detection it would rely on already exists (advisory today), so
making the check enforcing is a small change, but the cross-repo merge coordination is new work we
would have to build. It also does not remove the bottleneck. A cross-repo atomic merge still has to
wait for the SDK to build on main, publish to the package registry, the clients PR to update its SDK
version, and CI to re-run on that change. And it leaves the open question of what happens to other
merges in the window between an SDK merge and its downstream fix: block them, and for how long. The
coordination logic (ordering, timing, separate CIs) is fiddly to build and maintain.

### Versioned SDK releases

Treat the SDK as its own product with a release schedule, the way we already treat client versions.
Consumers get a known set of changes every two weeks and upgrade on their own schedule.

This is a valid option, but it does not fit how we work today. The bottleneck is between the SDK and
the clients. Many of the developers who work in the clients now also work in the SDK, because they
are moving features from TypeScript into Rust. A release cadence puts a version gap in the middle of
their own work, so a developer has to wait for a release before they can use their own SDK change in
the client. It also does not remove the bundling. Breaking merges land close together (143 of 149
within 3 days), so each release would carry a bundle of unrelated breaks, and adopting it would take
PRs with effort from several teams.

Mobile is in a different position. Mobile is also broken by SDK changes, but the cost there is
adaptation, not waiting. Mobile developers do not contribute to the SDK at the same scale, so they
rarely need to cross the gap to ship their own work, and they already adopt published versions when
it suits them, sometimes days or weeks later. In practice mobile already consumes the SDK this way.
Their problem is learning what changed, not the gap itself.

### Product repository

Split the crate graph instead of folding all of it in. The application-logic crates (for example
`bitwarden-vault`, `bitwarden-send`, `bitwarden-generators`, `bitwarden-exporters`) move into a
product repository and compile together with the clients that consume them, while the shared,
lower-level crates (for example `bitwarden-crypto`, `bitwarden-core`, `bitwarden-encoding`,
`bitwarden-state`) stay in a separate repository. This keeps the atomic-commit guarantee for the
application layer, where most of the breaks come from, but leaves the clients consuming the shared
crates across a version boundary. The trade-off is that it keeps that boundary, part of the overhead
this decision is trying to remove, to prepare for a split we may never need. It remains an option we
can revisit later if that need becomes real.

### Monorepo

Fold the whole SDK into the `clients` repository, the way `jslib` was folded in before. A change to
the SDK lands in the same commit as the consumer updates it requires, and main is never broken,
because a change that broke a consumer would break CI. The cross-repo breaking change stops being a
separate thing to coordinate, the same way changing a class and its callers in one commit is one
change, and the concurrent-bundle problem goes away by construction. The crates are still published
as versioned packages that other consumers, such as the server, depend on; only the in-repo clients
drop the version boundary. The cost is a large one-time migration and a bigger repository.

## Decision outcome

Chosen option: **Monorepo**. Fold the whole SDK into the `clients` repository.

Once the SDK and the clients build from the same source, there is no published package version
between them to keep in sync. A change to the SDK and the client code that uses it becomes one
change that only merges if it builds. The cross-repo breaking change stops being a separate thing to
coordinate, and the concurrent-bundle problem goes away by construction.

The SDK stays its own project inside `clients`, with its own crates, ownership, and published
packages for consumers outside the repository.

The monorepo covers the SDK and the clients. Android and iOS stay in their own repositories and keep
consuming the SDK as published packages. Code that the same people change together belongs in one
repository, and a versioned boundary fits where different teams own each side. The SDK and the
clients are changed together by the same product teams, often as part of the same feature. The
mobile apps are built by the mobile team, which consumes the SDK on its own schedule.

Moving mobile into the monorepo would also cause problems. CI would block an SDK change until the
mobile apps build, so every developer changing the SDK would have to learn the mobile toolchains,
Swift, and Kotlin before they can merge. That friction pushes people to rush fixes in code they do
not know, and the mobile team prefers to review changes to its apps in its own repositories. It
would also not catch runtime or behavior changes, which the mobile team names as a large part of its
problem.

Against the product repository, the difference is where the SDK source lives and how much of the
version boundary the clients still cross. Both layouts publish the SDK crates as versioned packages,
so external consumers like the server depend on them the same way. The product repository splits the
source across two repositories, which leaves the clients consuming the shared crates across a
version boundary, part of the same bottleneck, to prepare for a split we may never need. The
monorepo removes that boundary for the clients as well, and it does not make a later split any
harder: extracting a second repository stays a normal refactor if that need ever becomes real. The
product repository is recorded above as an option we can revisit then.

Against the coordinated merge gate, the difference is that this removes the serialized pipeline
rather than automating around it. The merge gate aims for the same "cannot merge unfixed" guarantee,
but it keeps the publish-and-bump round trip and leaves the unanswered "what do we do in the window"
question. Building from the same source solves both.

Against versioned SDK releases, the difference is who sits on each side of the boundary. A release
cadence fits a boundary between two teams, which is the situation for mobile. Between the SDK and
the clients it would put a two-week gap in the middle of a single team's work.

A public SDK does not change this. To be useful it has to expose product operations like vault and
send access, which is application logic, so like the client apps it is a consumer of the product,
not a shared crate. Its feasibility is unaffected by this decision.

The upfront migration is real work, but it is one-time work, and we have done a version of it before
when `jslib` moved into `clients`. What it buys is an environment where we can write changes as
often as we want without carrying a compatibility burden or waiting on a cross-repo pipeline,
weighed against a coordination cost that otherwise grows with every new team contributing to the
SDK.

### Positive consequences

- Breaking changes between the SDK and the clients stop being cross-repo events. A change to the SDK
  and the client code that uses it is one commit that only merges if it builds, so main stays green
  by construction and there is no published version to bundle.
- Components that are meant to work together share one build graph and one place to reason about
  them. AI review, for example, sees the SDK change and the client code that calls it in the same
  diff, instead of an opaque package-version bump with a new API.
- The SDK crates are still published as packages, so the server and any future product keep
  depending on them regardless of this layout.
- One-time migration cost, with a precedent (`jslib`), against a coordination cost that otherwise
  grows with the number of contributing teams.

### Negative consequences

- A large upfront migration.
- A bigger repository: git operations and CI get slower unless CI is scoped to build only the
  projects affected by a change. Folding a Rust build graph into the `clients` Nx/TypeScript
  monorepo is real build-system work.
- It does not remove the adaptation work. Changing a shared type still means updating every place
  that uses it; co-locating turns that into one commit instead of a cross-repo sequence, but the
  adaptation itself is no smaller.
- It does not touch compatibility between deployed apps and the server. They ship independently, so
  they always have to stay compatible with each other, and that is separate work regardless of how
  the source is organized.
- It does not solve mobile's problems. Android and iOS still take SDK breaks across a
  published-package boundary, and the runtime and behavior changes that hurt mobile the most cannot
  be detected with today's tools. With the SDK inside `clients`, it can also become easier to forget
  that mobile depends on it.

### Plan

- Fold `sdk-internal` into the `clients` repository, following the `jslib` precedent, so the SDK and
  the clients build together.
- Scope CI so a change builds and tests only the projects it affects, to keep the larger repository
  workable.
- Keep crates buildable as packages that out-of-repo consumers, such as the server, can depend on.
  Clients consume the crates in-repo with no version boundary; external consumers take them as
  published, versioned packages.
- Draw package boundaries where product scope matters, for example splitting policies into a
  suite-wide package the server and other products can depend on, and PM-specific pieces that stay
  with the application.
- Keep publishing the Maven and Swift packages that android and iOS consume.
- Improve the boundary to mobile: enforce breaking-change notes on SDK changes, keep the android
  breaking-change detection, and add iOS to it.
- Look into automatically generated mobile fixes together with the mobile team. These will not be a
  merge requirement: requiring a working or merged mobile PR before an SDK change can merge would
  bring back the cross-repo blocker this decision removes.
- Work closer with the mobile team, and address problems at the boundary as we run into them.

## Follow-ups

- **The server's dependency on the SDK.** `server` currently depends on `sdk-internal` for
  cryptographic and policy code. Folding the SDK into `clients` should not turn that into a
  dependency on the `clients` repository. Read as packages, the server depends on the crypto and
  policy packages wherever they live, published from the monorepo, not on the repository. Whether
  the server later joins the monorepo or keeps consuming those packages is open, as is compatibility
  with the backend MSA direction.
