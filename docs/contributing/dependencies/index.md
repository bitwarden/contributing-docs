---
sidebar_custom_props:
  access: bitwarden
---

# Dependency Management

Bitwarden uses [Renovate](https://www.mend.io/renovate/) for automating dependency updates. Renovate
will automatically create pull requests for dependencies on a weekly cadence. Security updates will
generate pull requests immediately.

## Renovate configuration

Renovate is configured by a `.github/renovate.json` (or `.github/renovate.json5`) file in each
repository. We follow an internal template for consistency. The template is available in the
[template repository](https://github.com/bitwarden/template/blob/main/.github/renovate.json).

It is recommended that all repositories extend the
[default](https://github.com/bitwarden/renovate-config/blob/main/default.json) configuration from
our [shared configuration repository](https://github.com/bitwarden/renovate-config) that is included
when a new repository is created from the template.

The default configuration:

- Combines minor and patch changes into one rollup pull request, per package manager.
- Uses a dependency dashboard so we can see what pull requests are not yet created but still manage
  the workload.
- Manages updates with semantic versioning and lock file updates. Rebases are disabled.
- Allows an unlimited number of pull requests to be created.
- Delays creation of pull requests until at least seven days after the dependency version release,
  to ensure stability of said release from bugs and / or security issues.
- Includes major updates (the latest) as individual pull requests. Monorepo updates are also
  grouped.
- Schedules runs to happen on the weekend when more Actions workers are likely available for the
  organization, but also on a two-week basis to better align with the release schedule.
- Certain build pipeline dependencies are pinned to specific versions.

See [Management Strategies](#management-strategies) below for more detail on why we have chosen
these configuration options.

All package managers are recommended to be left enabled should a repository expand over time to
include new ones, within reason for what might be in the scope of the repository. Update schedules
and how many pull requests are up to the individual repository. Exceptions, other package managers,
and dependency-specific configuration may be needed.

Consider [best practices](https://docs.renovatebot.com/dependency-pinning/#so-whats-best) with
pinning dependencies, especially at the root. Development dependencies such as formatters and
linters deserve communication and coordinated rollout across all teams so that code style is
consistent per our standards and the editor configurations seen in the template repository itself.

## Ownership

Bitwarden's repositories fall under two categories: team-owned and shared.

### Team-owned repositories

Team-owned repositories are "owned" by a single team from a dependency standpoint. The assigned team
is responsible for reviewing, approving, and merging dependency updates. Some reasons a repository
might be team-owned are that it's primarily developed by that team, or to balance out the number of
dependencies teams have to manage.

Some examples of team-owned repositories are [`directory-connector`][dc] and [`key-connector`][kc].

### Shared repositories

Shared repositories don't have any direct owner. Instead each dependency is allocated to a team. The
team assigned to a dependency is responsible for reviewing, approving, and merging that dependency.
For major upgrades the team is responsible for coordinating the upgrade with the other teams.

Examples of shared repositories are [`server`][server] and [`clients`][clients].

#### Adding a dependency to a shared repository

When adding a new dependency to a shared repository it **must** be owned by a team. It's up to the
engineer adding the dependency to determine the appropriate team and get their approval for the
addition before merging the PR. Please check
[Renovate configuration](#assigning-reviewers-through-renovate) for more information on how to
assign ownership.

## Example pull request

<figure>

![Screenshot of a  Renovate PR](./renovate-pr.png)

<figcaption>Example Renovate PR</figcaption>

</figure>

Renovate PRs contain several areas of interest. The above example PR contains two grouped
dependencies. The PR proposes to upgrade the dependencies from `6.0.21` to `7.0.12`. The age of the
version is **13 days**, and **13%** of repositories have adopted this version. Renovate has seen a
**74%** test success rate across Renovate-managed repositories and has a low confidence in the
change. For more details read
[Renovate documentation about Merge Confidence](https://docs.renovatebot.com/merge-confidence/).

## Management strategies

:::success Our Goal: A sustainable review cadence

The overarching purpose behind our use of these strategies is ensuring that our dependencies are as
up-to-date as possible, while opening PRs for review at a frequency and level of complexity that is
sustainable for all responsible teams.

Renovate is currently scheduled to automatically create pull requests every 2 weeks. The goal of our
dependency management process is for the teams to review and merge the opened pull requests in the
same 2-week cadence -- to avoid a large backlog of PRs and out-of-date packages accumulating.

:::

### Dependency pinning strategies

#### Pinned dependencies

:::info Why do we pin dependencies?

For background on why we pin, see [Renovate's](https://docs.renovatebot.com/dependency-pinning/)
documentation.

:::

For our client projects that are not intended to be consumed as libraries our strategy is to pin all
dependencies. In addition, we use `package-lock.json` and `Cargo.lock` lock files, as recommended by
Renovate.

#### Unpinned dependencies

For projects that are intended to be consumed as libraries (e.g. our SDKs) our strategy is not to
pin dependencies so that consumers are not locked in to a particular version. As Renovate
[recommends](https://docs.renovatebot.com/dependency-pinning/):

> It is usually a bad idea to pin all your dependencies because it will introduce an unnecessarily
> narrow range (one release!) and cause most users of your package to bloat their `node_modules`
> with duplicates.

Instead, the [recommended configuration](https://docs.renovatebot.com/presets-config/#configjs-lib)
for libraries is to pin only `devDependencies` and leave the others as ranges.

### Dependency grouping strategies

We use grouping in Renovate to group related dependencies into a single PR.

There are two different levels at which our grouped dependencies are configured:

1. Our Renovate configuration uses the “monorepo presets” that Renovate
   [defines](https://docs.renovatebot.com/noise-reduction/#package-grouping). These are groups of
   dependencies that Renovate has grouped together through the `group:monorepos` configuration,
   which we have enabled. If we use any of these pre-grouped dependencies, Renovate will
   automatically group them together into a single PR.
2. Grouping that we have put in place in our Renovate configuration. We have several different ways
   that we configure to do this, which we’ll detail below.

#### Why we group dependencies in our configuration

If a group of dependencies are closely related, we may decide that they should move as a unit
through the review and QA process. We’ll do this if we want to:

- Group by **domain** to avoid errors resulting in inter-dependency version requirements
  - If a dependency relies on other related dependencies to have been updated along with it, we need
    to group these together to avoid errors when building. Sometimes we do this for all update
    types, and sometimes we only do this for major updates, depending on when we feel like
    inter-version dependencies exist.
- Group by **domain** or by **package manager** to reduce the noise of too many PRs
  - This is a [trade-off](https://docs.renovatebot.com/noise-reduction/#noise-reduction), and we
    acknowledge that doing so will make identification of any issues stemming from the update
    harder.
  - Sometimes we only do this for minor or patch updates, as we acknowledge the trade-off with
    identifying breaking changes and want to have separate PRs for major updates.

:::info Grouping and team ownership

Grouping does not equal team ownership. In other words, a PR that has dependencies owned by multiple
teams would have multiple reviewers on it. As a matter of practice, we try to assign all grouped
dependencies to a single team, so that only a single team is responsible for the review.

:::

### Dependency update type strategies

:::info What are update types?

“Update type” refers to the classification of a version as major, minor, or patch.

:::

### Combining update types

For all of our dependencies, we default to:

- Combining minor and patch updates into a single PR for a given dependency, and
- _Not_ combining major updates with any minor or patch updates for a given dependency

We do this because we want to reduce the noise of separate minor and patch updates, but we also
don’t want to miss out on incremental minor/patch updates while we do the larger body of work for a
major update. For example, if we’re updating Angular to version 20, we would want to receive minor
and patch updates for version 19 while the PR for the version 20 update is open and being evaluated.

This combination of updates is for an individual dependency. This is distinct from grouping multiple
dependencies into a single PR, which is covered in
[Dependency grouping strategies](#dependency-grouping-strategies).

### Managing patch updates

In order to maintain a sustainable number of update PRs for our teams to review, we have elected to
send most patch updates through Renovate's
[Dependency Dashboard Approval](https://docs.renovatebot.com/configuration-options/#dependencydashboardapproval)
flow. This means that Renovate will _not_ automatically generate a PR for these updates; rather, it
will list them in a "Pending Approval" section of the Dependency Dashboard. If a team desires to
update the dependency to pull in a bug fix that affects our code, they can trigger the pull request
to be created from the dashboard.

### Dependency reviewer assignment strategies

In order for a dependency update PR to successfully move through the review process, it must be
assigned a reviewer. We do this one of two ways:

- Through GitHub `CODEOWNERS`
- Through reviewer assignment in Renovate

#### Assigning reviewers through `CODEOWNERS`

When a team owns the file updated by a dependency update (e.g. `package.json` and
`package-lock.json`), they will be added as reviewers on the pull request without any configuration
in Renovate.

This will be the case for:

- Repositories owned by a single team, and
- GitHub Action workflows on shared repositories
  - In this case, the workflow files themselves are updated by Renovate, meaning that the team who
    owns the workflow will be added to the PR.

#### Assigning reviewers through Renovate

When the package and lock files are not owned by `CODEOWNERS` (as is the case for any of our shared
repositories), we explicitly assign ownership of each dependency by specifying the responsible team
in Renovate configuration in the repository.

Renovate uses a concept called
[`PackageRules`](https://docs.renovatebot.com/configuration-options/#packagerules) that allows us to
specify ownership of dependencies and ensure the appropriate team is added as reviewers. Below is an
example assigning `@angular/core` to the Platform team.

```json
{
  "matchPackageNames": ["@angular/core"],
  "description": "Platform owned dependencies",
  "commitMessagePrefix": "[deps] Platform:",
  "reviewers": ["team:team-platform-dev"]
}
```

## Dependency review workflow

:::info Major upgrades

Major upgrades are an exception to this time frame, as these can take longer to coordinate. The team
should make an effort to coordinate scheduled major updates and resolve deprecations in advance.

:::

A Renovate PR may contain a single dependency or a group of related dependencies. At Bitwarden, we
typically group dependencies we know are related and should be upgraded at the same time. We try to
keep groups as small as possible to minimize the impact and increase confidence in approving and
merging.

### Jira ticket

A Jira ticket will automatically be created for each Renovate PR that is opened. It will be assigned
to the appropriate team based on the dependency ownership.

The Jira ticket should be used to track the work through sprint planning, prioritization, review,
and testing.

### Review

A typical dependency workflow involves the following steps:

1. Move the Jira ticket to In Progress.
2. Read the proposed changes.
3. Review the release notes of each dependency, for each released version between the current and
   the proposed upgrade. Identify if there are any deprecations or breaking changes affecting our
   code.
   1. For **breaking changes**, either resolve them yourself, or for major changes, coordinate with
      the other teams.
   2. For **deprecations**, create high priority Jira tickets on the affected teams' backlogs with a
      due date at least one sprint before the next scheduled major release of the dependency.
4. Verify CI status.

- This may also include re-running any failed workflows due to insufficient permissions when
  Renovate created the pull request.

5. If test coverage is lacking, check out locally and manually confirm a few key areas.
6. Review the proposed code changes and approve the PR.
7. Update the ticket to include testing notes for QA.
   - Testing notes should include:
     - What areas of the codebase are affected by the dependency to help isolate future problems.
     - Recommendation for manual QA testing **only** if the developer identifies this as a high-risk
       update.
8. Merge the PR.
9. Assign the Jira ticket to QA.

#### Changing a generated PR

When reviewing the PR, you may rarely have to make changes to the branch yourself.

However, caution should be taken when doing so. If a non-Renovate user pushes changes to the
Renovate-generated PR, Renovate assumes that it is no longer responsible for maintaining the PR.
**This means that further updates to the package(s) included in the PR will be blocked until the
modified PR has been merged.**

What this means is that if you do need to make changes during review, you should maintain ownership
of the PR through the rest of the workflow and not leave the PR open for an extended period.

If you do want Renovate to take over managing the dependencies in the PR again, you can request that
by selecting the "rebase/retry" checkbox on the PR description.

![Updating a PR](image.png)

:::tip Type Definitions

Many of our client dependency packages have corresponding type definition dependencies (e.g.
`@types/jest` for our Jest dependencies). These packages do not contain any business logic.

In order to streamline the process and avoid unnecessary QA time, it is sufficient to handle these
by ensuring that all CI jobs pass successfully, merging the PR, and marking the ticket as Done.

:::

### QA testing

By default, dependency updates do **not** undergo individual testing by QA. However, we do want our
QA teams to be aware of the changes so that they can react appropriately if problems occur during
regression testing. For this reason, we assign each dependency ticket to our QA team for review,
along with a recommendation for manual testing when necessary.

If the QA engineer agrees that manual testing is not required, they will mark the ticket as `Done`.

If the QA engineer or the developer recommends manual testing, QA will perform the testing with the
scope defined in the testing notes, marking the ticket `Done` only when testing is successful.

### Reverting

In the event QA finds a regression, the developer is responsible for assessing the impact and either
immediately revert the update or resolve the regression in a new PR.

### Closing irrelevant PRs

Sometimes Renovate will create PRs for dependencies that we are currently unable to upgrade for
various reasons. For example, `contributing-docs` depends on `docusaurus`, which supports specific
versions of `react`. We cannot upgrade `react` until `docusaurus` supports it.

In those cases the team can comment on the PR with a reason for not yet upgrading and either close
or defer it until a later date. If a team closes a PR it is expected that its members monitor the
dependency and revisiting the upgrade in the future.

[dc]: https://github.com/bitwarden/directory-connector
[kc]: https://github.com/bitwarden/key-connector/
[server]: https://github.com/bitwarden/server/
[clients]: https://github.com/bitwarden/clients/
