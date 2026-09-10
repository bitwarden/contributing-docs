---
adr: "0035"
status: Proposed
date: 2026-09-09
tags: [clients, mobile, sdk, server]
---

# 0035 - Move SDK application crates into a product repository

<AdrTable frontMatter={frontMatter}></AdrTable>

## Context and problem statement

The `sdk-internal` repository lives on its own and reaches the clients as a published npm package
(and a Maven package for android, a Swift package for iOS). Every breaking change in the SDK has to
travel through that publish step before any consumer can adopt the change that follows it. That
turns delivery into a single serialized pipeline: many teams write to the SDK, everything funnels
through one published version, and many teams consume it on the other side. One team's unfinished
downstream fix holds up everyone waiting for a later SDK change.

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 560" fontFamily="ui-sans-serif, system-ui, sans-serif">
  <text x="120" y="70" fill="#1a1a1a" fontSize="30">SDK</text>
  <text x="472" y="66" fill="#888" fontSize="26">NPM</text>
  <text x="800" y="70" fill="#1a1a1a" fontSize="30">Clients</text>

  <line x1="500" y1="110" x2="500" y2="490" fill="none" stroke="#888" strokeWidth="2" />

  <g fill="none" stroke="#1a1a1a" strokeWidth="3" strokeLinecap="round">
    <path d="M70,120 L290,120 C360,120 380,300 450,300" />
    <path d="M70,165 L240,165 C330,165 370,300 450,300" />
    <path d="M70,210 L190,210 C300,210 350,300 450,300" />
    <path d="M70,480 L290,480 C360,480 380,300 450,300" />
    <path d="M70,435 L240,435 C330,435 370,300 450,300" />
    <path d="M70,390 L190,390 C300,390 350,300 450,300" />
    <path d="M70,300 L450,300" />
    <path d="M550,300 C650,300 700,210 810,210 L930,210" />
    <path d="M550,300 C630,300 660,165 760,165 L930,165" />
    <path d="M550,300 C620,300 640,120 710,120 L930,120" />
    <path d="M550,300 C650,300 700,390 810,390 L930,390" />
    <path d="M550,300 C630,300 660,435 760,435 L930,435" />
    <path d="M550,300 C620,300 640,480 710,480 L930,480" />
    <path d="M550,300 L930,300" />
  </g>

  <path d="M450,300 L550,300" fill="none" stroke="#1a1a1a" strokeWidth="3" strokeLinecap="round" strokeDasharray="2 14" />
</svg>

Put another way: every breaking change in the SDK adds to a queue of fixes that then have to merge
on the clients side in the same order they merged in the SDK. If Team A merges a breaking change
into the SDK, every other team waits for Team A's corresponding client fix before it can pull in any
SDK change that landed after the break.

We have tried to manage this without changing the structure. The breaking-change detection workflow
builds the latest `clients` `main` against SDK PRs so a breaking change can arrive with its fix PR
ready. It has not held the line: breaking changes have gone up, not down, even with the workflow in
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
  known-breaking PR, #906, passed green). So a breaking change ships to consumers whether or not its
  downstream fix exists.
- **Code review is not the bottleneck.** On clients, review latency is negligible and total blocked
  time is small (median 2.4 hours). Mobile is a different shape: android and iOS adopt on a rolling
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
- **Monorepo:** move the whole SDK into the `clients` repository, the way `jslib` was folded in
  before.
- **Product repository:** split the SDK crates. Move the application-logic crates into the product
  repository so they compile together with the clients that consume them, and keep the core
  infrastructure crates as a separately published, versioned library that every product depends on.

### Do nothing, improve iteratively

Reducing breaks at the interface is worth doing regardless, and it composes with any other choice.
On its own it does not remove the bottleneck, and it does not stop breaking changes from happening.
It is a set of smaller wins, not an answer to the serialized pipeline.

### Ban breaking changes (additive-only)

If nothing ever breaks, the bottleneck disappears. The cost is the overhead of carrying and later
cleaning up backwards-compatible surface, and with Rust that overhead can grow sharply with each
change. Some of the residue (nullability relaxations, semantic restructures) does not go additive
cleanly and still has to be coordinated as a real break.

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

### Monorepo

Folding the whole SDK into `clients` gives the atomic-commit guarantee: a change to the SDK lands in
the same commit as the consumer updates it requires, and main is never broken because a change that
broke a consumer would break CI. It removes the concurrent-bundle problem by construction. The
drawback is that it binds the shared core into one product's repository. Bitwarden is moving toward
being a multi-product company, and a single repository that owns both the password-manager
application code and the crypto and infrastructure core makes it harder, not easier, for a second
product to depend on that core. It solves this problem while working against the direction the
product is heading.

### Product repository

Split the crate graph along the layering that already exists. The application-logic crates (for
example `bitwarden-vault`, `bitwarden-send`, `bitwarden-generators`, `bitwarden-exporters`) move
into the product repository and compile together with the clients that consume them, so their churn
no longer crosses a repository boundary. The core infrastructure crates (for example
`bitwarden-core`, `bitwarden-crypto`, `bitwarden-encoding`, `bitwarden-state`) stay a separately
published, versioned library that every product depends on. It keeps the monorepo's guarantee for
the layer that actually churns, and keeps the core shareable across products. The cost is the same
as the monorepo (a large one-time migration and a bigger repository) plus the work of drawing the
crate boundary.

## Decision outcome

Chosen option: **Product repository**, because it removes the bottleneck for the layer that causes
it while keeping the shared core available to future products.

The repository this creates is best understood not as "clients plus the SDK" but as **the Password
Manager product**: the client apps together with the application-logic crates they consume. Once
they build from the same source, there is no published package version between them to keep in sync.
A change to the application code and the client code that uses it becomes one change that only
merges if it builds, the same way changing a class and its callers in one commit is one change. For
the application surface, where most of the measured breaking events come from, the cross-repo
breaking change stops being a separate thing to coordinate, and the concurrent-bundle problem goes
away by construction.

Against the coordinated merge gate, the difference is that this removes the serialized pipeline
rather than automating around it. The merge gate reaches for the same "cannot merge unfixed"
guarantee, but it keeps the publish-and-bump round trip and leaves the unanswered "what do we do in
the window" question. Compiling together answers both by construction.

Against the plain monorepo, the difference is the core. Keeping the infrastructure crates as a
shared, versioned library lets Secrets Manager and future products depend on the same core, and it
sets up extracting products out of the `clients` repository later. The monorepo would fold the core
into one product and make that harder.

This rests on one assumption: **products do not need to share application logic at the SDK level,
only the core.** If that turns out false for some piece of application logic, there are two ways
out: promote that piece down into the shared core and accept that it evolves across the published
boundary like the rest of core, or model the relationship as product and sub-product, where a
sub-product depends on a product. Neither looks likely, and both keep the design intact if the
assumption breaks, so it is a manageable bet.

A public SDK does not change this. To be useful it has to expose product operations like vault and
send access, which is application logic, so like the client apps it is a consumer of the product,
not part of the shared core. Its feasibility is unaffected by this decision.

The upfront migration is real work, but it is one-time work, and we have done a version of it before
when `jslib` moved into `clients`. What it buys is an environment where we can write changes as
often as we want to the application layer without carrying a compatibility burden or waiting on a
cross-repo pipeline, weighed against a coordination cost that otherwise grows with every new team
contributing to the SDK.

### Positive consequences

- Most of the measured breaking events stop being cross-repo events at all. A change to the
  application surface and the client code that uses it is one commit that only merges if it builds,
  so main stays green by construction and there is no published version to bundle.
- The core stays a shared, versioned library, so Secrets Manager and future products can depend on
  it, and the change sets up extracting products out of the `clients` repository later.
- Tooling and people get the full product context in one place. AI review, for example, sees the SDK
  change and the client code that calls it in the same diff, instead of an opaque package-version
  bump with a new API.
- One-time migration cost, with a precedent (`jslib`), against a coordination cost that otherwise
  grows with the number of contributing teams.

### Negative consequences

- A large upfront migration, plus the work of drawing the crate boundary between core and
  application.
- A bigger repository: git operations and CI get slower unless CI is scoped to build only the
  projects affected by a change.
- It does not remove the adaptation work. Changing a shared type still means updating every place
  that uses it; co-locating turns that into one commit instead of a cross-repo sequence, but the
  adaptation itself is no smaller.
- Core-layer breaks still cross a published-package boundary between the core library and the
  product repository. This is smaller than today because the core churns less than the application
  layer, but it is real. The plan addresses it with explicit versioning of the core.
- It does not touch compatibility between deployed apps and the server. They ship independently, so
  they always have to stay compatible with each other, and that is separate work regardless of how
  the source is organized.

### Plan

- Draw the crate boundary in `sdk-internal`: classify each crate as core infrastructure (shared) or
  application logic (product-specific). The obvious cases are legible from the crate names; the
  in-between crates (`bitwarden-auth`, `bitwarden-sync`, and the crypto-management crates like
  `bitwarden-user-crypto-management`) need a deliberate call.
- Publish the core crates as their own versioned library, on **explicit versions** rather than
  auto-publishing on every merge, so products adopt a core change on their own schedule.
- Set up required infrastructure to build the SDK in `clients`. Try to scope CI so a change builds
  and tests only the components it affects, to keep the larger repository workable.
- Move the application-logic crates into the product repository so they compile together with the
  clients.
- Treat extracting a second product (for example Secrets Manager) out of the `clients` repository as
  a later step this structure enables, not part of this migration.

## Open questions

- **Mobile.** Do we bring android and iOS into the product repository as part of this decision, or
  leave them as standalone repositories for now and move only the SDK application crates and clients
  first? The mobile repos carry the larger share of the measured breaking events, but they also add
  Swift and Kotlin build graphs and Xcode/Gradle CI to the repository, which is the heaviest part of
  the migration.

## Follow-ups

- **The server circular dependency.** `sdk-internal` and `server` currently have a circular
  relationship. Moving the application crates into the product repository would make `server` depend
  on `clients`, which is the wrong direction. A true product repository, where the server and client
  components live in the same repository and both depend on a shared Rust core there, would resolve
  this. Whether that is compatible with the backend MSA direction has not been explored.
