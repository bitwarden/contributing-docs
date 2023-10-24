---
sidebar_custom_props:
  access: bitwarden
---

# Dependency Management

Bitwarden uses [Renovate](https://www.mend.io/renovate/) for automating dependency updates. Renovate
will automatically create pull requests for dependencies on a weekly cadence. Security updates will
generate pull requests immediately.

## Ownership

Bitwarden's repositories falls under two categories, Team-owned and shared repositories.

### Team-Owned repositories

Team owned repositories are "owned" by a single team from a at least a dependency standpoint. The
assigned team is responsible for reviewing, approving and merging dependency updates.

Some reason a repository might be team-owned is because it's primarily developed by that team, or to
balance out the number of dependencies teams have to manage.

### Shared repositories

Shared repositories don't have any direct owner, instead each dependency is allocated to a team. The
team assigned to a dependency is responsible for reviewing, approving and merging that dependency.
For major upgrades the team is responsible for coordinating the upgrade with the other teams.

## Workflow

Renovate will automatically create pull requests during the weekend, this naturally aligns with each
team allocating some time during the monday to work through their queue of pull requests. The team
should work together to resolve outstanding pull requests in a timely manner (typically within the
week).

A Renovate PR may contain a single or a group of dependencies. At Bitwarden we typically group
dependencies we know are related and should be upgraded at the same time. We try to keep groups as
small as possible to minimize the impact and increase confidence in approving and merging.

### Example PR

<figure>

![Screenshot of a  Renovate PR](./renovate-pr.png)

<figcaption>Example Renovate PR</figcaption>

</figure>

Renovate PRs contains several areas of interest. In the example PR we can see that it contains two
dependencies, which are grouped together. The PR proposes to upgrade the dependencies from `6.0.21`
to `7.0.12`. The age of the version is **13 days**, and **13%** of repositories have adopted this
version. Renovate has seen a **74%** test success rate across Renovate managed repositories and have
a low confidence in the change. For more details read
[Renovate documentation about Merge Confidence](https://docs.renovatebot.com/merge-confidence/).

### Review

A typical dependency workflow involves the following steps:

1. Read the proposed changes.
2. Review the package(s) release notes to identify if there are any deprecations or breaking changes
   affecting Bitwarden.
   1. For breaking changes, either resolve them yourself or for major changes coordinate with the
      other teams.
   2. For deprecations, create high priority jira tickets on the affected teams backlogs with a due
      date of the next major release (please include a reasonable buffer).
3. Verify CI status
4. If test coverage is lacking, checkout locally and manually confirm a few key areas.
5. Review the proposed code changes, approve the PR.
6. Write a Jira Ticket containing testing notes for QA.
7. Merge the PR. Assign the jira ticket to QA.

If you need to change the code to resolve any issues, please tag a team member for the final review.

### Jira Ticket

The handover between developers and QA will be a Jira ticket. The ticket should contain the affected
dependency, any relevant release notes for sections to test, and some testing notes on affected
areas.

### QA Testing

While developers are responsible for writing a jira ticket with testing notes, the QA engineer
should practice due diligence by also considering the impact of the dependency change and if needed
discuss with the engineer about potentially increasing or decreasing the scope of testing.

### Reverting

In the event QA finds a regression, the developer is responsible for assessing the impact and either
immediately revert the update, or resolve the regression in a new PR.
