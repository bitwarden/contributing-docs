---
sidebar_position: 1
sidebar_custom_props:
  access: bitwarden
---

# Branching

## Naming convention

To keep branches organized we adhere to a naming convention for branches.

This naming convention allows us to easily identify the type of work being done on a branch and will
assist in identifying and tracking down stale branches.

### Branches for a specific Jira issue

In order to link the work on a branch to our Jira issues, the branch name should be made up of three
parts, separated by a slash:

- The team name or abbreviation (e.g. `vault`), and
- The Jira issue key (e.g. `pm-1234`)
- A short description of the work being done (e.g. `update-csp-hashes`)

In this example, the full branch name would be `vault/pm-1234/update-csp-hashes`.

- Use only lower case letters in branch names.
- Separate words with `-` and branch name sections with `/`. Only use these characters for word or
  section separation.
- Limit work description section to ~50 characters. Overall branch name should be a maximum of ~80
  characters.
- Team names must be consistent. Either always abbreviate or do not abbreviate.

:::tip Multiple branches for a single Story?

If you are breaking down your changes incrementally, you may find that you need multiple branches to
implement a single story. In that case, you can either reference the appropriate subtask key in your
branch name or include the story key for all branches, depending on whether you are using
subtask-level work breakdown.

:::

### Branches for multiple Jira issues

If the branch will contain work from multiple Jira issues (most likely due to it being a
[long-lived feature branch](#long-lived-feature-branch)), the name should be a descriptive name of
the feature, separated by dashes (e.g. `my-long-lived-feature`). Consider brevity when possible, as
our QA team may need to use this branch name when performing QA testing on the feature.

## Branching for development

### Which branching model to choose?

The main point of consideration in choosing a branching model is whether the changes can be
introduced directly into `main` with every pull request or whether they need to be merged into a
long-lived feature branch for QA. As such, it should be planned in advance when beginning work on a
new set of Jira stories or tasks, and it requires coordination across the entire team - Development,
QA, and Product.

Choose **branching and merging into `main`** if the feature will:

- Require a single pull request to produce a testable, releasable change, with QA taking place on
  the PR branch, or
- Allow multiple incremental pull requests **with the changes encapsulated behind a feature flag**,
  with QA taking place in `main`.

Choose **branching and merging into a long-lived feature branch** if the feature will:

- Require multiple pull requests to produce a testable, releasable change, **and**
- It is not possible to put the changes behind a feature flag

:::tip Still Unsure?

If in doubt, lean toward creating branches directly off of `main` for incremental body of work, as
there is overhead built in to the long-lived feature branch.

:::

### Structuring branches to support incremental work

Regardless of whether we are merging into `main` or a long-lived feature branch, it is important
that each engineer structure their branches to support small, reviewable pull requests. When taking
on a new story or task, and throughout the development process, the engineer should consider how the
work could be broken apart and incrementally introduced for review and merge.

It can be helpful to think of this exercise in terms of two dimensions:

#### "Horizontal" separation

- The scope of the delivered work remains the same, but we can separate the delivery of the work
  into smaller PRs.
- We can think of our branches as building blocks that are part of the final, fully constructed
  feature, with an eye toward making the resulting pull requests concise, well-defined and easily
  reviewable.
- **It is accepted and expected that incomplete code will be merged** -- either to `main` behind a
  feature flag or into the long-lived feature branch.
- Examples of this include:
  - Introducing supporting services prior to UI development.
  - Introducing changes that require feedback from other teams separately.

#### "Vertical" separation

- The scope of the delivered work can be refined and broken out into multiple different Stories or
  Tasks.
- Examples of this include:
  - Introducing changes to one component or page independently others.
  - Introducing changes on a client-by-client basis.

### Additional considerations for long-lived feature branches

:::note

This section ony applies if a long-lived feature branch is necessary, which we discourage.

:::

A long-lived feature branch is necessary when the body of work to produce the smallest independent
testable, releasable change is too large to be encapsulated in a single PR, or it requires the
contribution of multiple developers, **and it cannot be encapsulated behind a feature flag**.

The long-lived feature branch is merely a collection point for work that cannot be merged to `main`
independently. The developer should still use
[branches for small, incremental changes](#structuring-branches-to-support-incremental-work), but
they will target the long-lived feature branch instead of `main`.

As a result, the long-lived feature branch should **only** consist of:

- PRs for approved changes, and
- Merge commits from `main`.

Any other commits directly to the long-lived feature branch will complicate the eventual review of
the final PR into `main` and should be avoided.

The review of a long-lived feature branch should simply be a verification of each PR that has been
The final review can be performed using GitHub's UI, by opening the Pull Request and clicking on the
`Commits` tab. Each commit can then be checked individually.

- Verify the commit has an existing review by following the pull request link and verifying the
  commit SHA hash matches. Look for `Author merged commit {hash} into branch`.
- If not perform a regular code review of the commit.

Merge commits should be reviewed as well, the GitHub UI will automatically simplify the merge commit
and only show the changes made. If reviewing from the command line or through a different tool,
please use the command `git show <hash>`. For some background and more information please read
[How to review a merge commit](https://haacked.com/archive/2014/02/21/reviewing-merge-commits/).

## Branching for release

On the first business day after the Development Complete date for a given release, an `rc` branch is
created off of `main`. This is a snapshot of the ongoing work in `main` that will represent the code
released in the upcoming version.

The `rc` branch is used for regression testing. It is then used as the source for the production
release and deployment of each of our deployed entities. When each release is made, a tag of the
format `vYYYY.MM.#-{component}` is created. This can be used to hotfix this release at a later
point.

When the release is complete, the `rc` branch is deleted.

### Branch protection requirements

After the initial `rc`, `hotfix-rc`, or `hotfix-rc-*` branch is pushed to GitHub it becomes
protected. Any additional changes require:

- Going through pull requests (no direct pushes)
- At least one approval
- Code owner review required

### Hotfix releases

For a hotfix release, a hotfix branch is created off of the release tag for the release upon which
the hotfix should be applied. The branch naming depends upon the repository. For all repositories
_except_ `clients`, the branch name is `hotfix-rc`. However, as we can release individual clients
separately, each client in the `clients` repo has their own named hotfix branch:

- Web: `hofix-rc-web`
- Desktop: `hotfix-rc-desktop`
- Browser: `hotfix-rc-browser`
- CLI: `hotfix-rc-cli`

Once the hotfix branch has been created, the individual commits in `main` are cherry-picked into the
hotfix branches. The initial hotfix branch can be pushed directly with the first cherry-pick. Any
additional cherry-picks must be done via pull request due to branch protection. For a client fix,
this may require cherry-picking to multiple hotfix branches.

Once the hotfix has been deployed, the hotfix branches are deleted.

:::info Hotfix QA Testing

For hotfixes, we do not perform QA testing on the feature branch prior to merging into `main`. This
is an acknowledged risk that we have incurred in order to speed up the hotfix process and to avoid
having to switch all of our QA testing environments from referencing our hotfix branches.

Instead, hotfixed changes are merged into into `main` as soon as the PR is approved and then
cherry-picked to the appropriate hotfix branch(es). They are then tested on the hotfix branch.

:::
