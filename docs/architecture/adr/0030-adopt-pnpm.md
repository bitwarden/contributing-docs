---
adr: "0030"
status: Proposed
date: 2026-06-08
tags: [clients, server, sdk]
---

# 0030 - Adopt pnpm as the JavaScript package manager

<AdrTable frontMatter={frontMatter}></AdrTable>

## Context and problem statement

Our JavaScript and TypeScript repositories standardize on npm, tracked via `package-lock.json`. npm
remains the only major package manager that auto-executes lifecycle scripts (`preinstall`,
`postinstall`, etc.) from every package in the dependency tree on install, with the full privileges
of the installing user. The only native control is `--ignore-scripts`, which is all-or-nothing and
off by default.

Over 90% of malicious npm packages use lifecycle scripts as their attack vector. Recent incidents
make the point: the Shai-Hulud worm (November 2025), the axios backdoor (March 2026), and the Rspack
cryptominer (December 2024) all relied on the same assumption, that `npm install` runs arbitrary
code without asking. npm also hoists transitive dependencies into the top-level `node_modules`. This
creates _phantom dependencies_: packages that code can import without ever declaring them, which
couples our code to dependencies it never asked for.

Beyond security, npm is slow. Clean and warm installs are several times slower than the
alternatives, and its flat store duplicates package files across every project on disk. As our
repositories and CI footprint grow, install time and disk usage compound.

We want a package manager that blocks lifecycle scripts by default, keeps dependencies properly
isolated, and installs faster, and that we can adopt without a costly migration.

## Considered options

- **Keep npm as-is** - Continue with npm and `package-lock.json`. No migration cost, but retains
  auto-executing lifecycle scripts, phantom dependencies, and the slowest install times of the
  options here.
- **Harden npm in place** - Stay on npm but layer on `--ignore-scripts` with
  [`@lavamoat/allow-scripts`][lavamoat] for an allowlist and enable `min-release-age` gating. This
  improves the security posture without a manager change, but bolts third-party tooling onto a
  manager whose defaults remain unsafe, and addresses neither performance nor phantom dependencies.
- **Migrate to Yarn** - Adopt Yarn's [Plug'n'Play][pnp] resolution. Scripts are blocked by default
  (`enableScripts: false`) and PnP provides the strictest isolation with no `node_modules` directory
  at all and the fastest clean installs. However, the PnP model demands the highest migration
  investment and broad ecosystem/tooling adjustments, and lacks version-scoped build approval.
- **Migrate to pnpm** - Adopt [pnpm][pnpm], which blocks all dependency lifecycle scripts by
  default, requires explicit approval of native builds via `onlyBuiltDependencies` /
  `pnpm approve-builds`, supports version-scoped approval and `strictDepBuilds`, and isolates
  dependencies through a symlinked content-addressable store. Installs run 2 to 4 times faster than
  npm and use 75 to 87% less disk. pnpm is designed as a near drop-in npm replacement.

## Decision outcome

Chosen option: **Migrate to pnpm**.

pnpm gets us the most of what we want for the least migration cost. Its defaults close the
lifecycle-script attack vector that the recent supply-chain incidents exploited, while
`onlyBuiltDependencies` and `pnpm approve-builds` keep the few packages that genuinely need native
builds working under explicit, reviewable control. Version-scoped approval and `strictDepBuilds` let
us escalate unapproved scripts from a warning to a hard failure. Its `pnpm-lock.yaml` format also
omits tarball URLs, which makes lockfile injection harder than with `package-lock.json`.

Yarn has a comparable security stance and the fastest clean installs, but its Plug'n'Play model
costs much more to migrate to and to adjust tooling for, and the security gain over pnpm is small.
Hardening npm in place leaves the unsafe defaults in place and does nothing for performance. pnpm
delivers the same security and performance with a migration measured in hours per repository, not
weeks.

### Positive consequences

- Dependency lifecycle scripts are blocked by default, which removes the main npm supply-chain
  attack vector from our repositories.
- Strict, symlink-based isolation surfaces phantom dependencies; the fix is to declare the missing
  dependency.
- Installs run 2 to 4 times faster, with the biggest gains in CI and monorepos, and the
  content-addressable store cuts disk usage by 75 to 87%.
- The CLI is nearly identical to npm (`npm run build` becomes `pnpm run build`), so developers have
  little to relearn.

### Negative consequences

- pnpm's strict isolation will reveal undeclared (phantom) imports that previously worked, so each
  repository needs a round of one-time fixes during migration.
- Packages that need native builds must be approved explicitly, which adds a small review step
  whenever such a dependency is added or upgraded.
- A handful of tools that expect npm-style flat hoisting may need `public-hoist-pattern`
  configuration, and developers and CI must install and standardize on pnpm.

### Plan

Migration is tracked per active, non-archived repository that has a `package-lock.json`. Each
repository pins an exact pnpm version and integrity hash through the `packageManager` field in
`package.json`, and pnpm is installed via [Corepack][corepack], not `npm i -g pnpm` and not
`pnpm/action-setup`. Corepack enforces the pinned version and hash identically on developer machines
and CI runners; `pnpm/action-setup` can fetch unpinned versions and is therefore avoided. For each
repository the local steps are:

1. Delete `node_modules`.
2. Run `pnpm import` to convert the existing `package-lock.json` to `pnpm-lock.yaml`.
3. Keep dependency lifecycle scripts disabled. For each package that genuinely needs a build script,
   add it to an explicit allowlist (via `pnpm approve-builds`) after verifying the script is
   required.
4. Delete `package-lock.json` and run `pnpm install`.

CI (GitHub Actions) enables Corepack and runs `pnpm install --frozen-lockfile`, failing the build on
lockfile drift rather than recomputing the lockfile. Where a gradual transition is needed,
`public-hoist-pattern` provides selective hoisting for tooling; `shamefully-hoist` exists as a
last-resort escape hatch but is not where we want to land. Adoption in each repository follows the
conditions of the AppSec dependency review, and contribution and getting-started documentation will
be updated to reference pnpm commands as repositories complete their migration.

[pnpm]: https://pnpm.io/
[pnp]: https://yarnpkg.com/features/pnp
[lavamoat]: https://www.npmjs.com/package/@lavamoat/allow-scripts
[corepack]: https://nodejs.org/api/corepack.html
