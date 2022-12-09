---
sidebar_custom_props:
  access: bitwarden
---

# Long-lived Feature Branches

A long-lived feature branch differs from a regular Pull Requests in three significant ways. It
should:

- Have multiple authors
- Consists of multiple already reviewed Pull Requests
- Only consists of merge commits

Since each pull request has already been reviewed before being merged into the feature branch, the
feature branch review is more of a sanity check. The reviewer should ensure the following:

- The feature branch is ready to be merged into master.
  - Ensure the work has been QA tested, including writing QA notes should it be needed.
  - Or verify the feature is behind a feature flag, and the crossover boundaries goes through
    testing.
- Review any non-reviewed commits made directly on the branch, these can be either feature work or
  merge commits. For more details see [Reviewing](#reviewing).

:::warning

Since feature branches do not have the same protections as master, it's technically possible to
commit directly to the branch or merge a pull request without a up-to-date review. However this
should be discouraged, and should be avoided whenever possible. The only exception being merge
commits.

:::

## Syncing Feature Branch

We typically denote one person as being responsible for keeping the feature branch up to
date.<bitwarden> In most cases this will be the TPC of the pod but can be anyone.</bitwarden> This
person is responsible for keeping the feature branch reasonably up to date with master, preparing it
for merge and more.

Due to how GitHub handles reviews, this person cannot also approve the feature branch. The reviewer
of the feature branch can be anyone in the pod. However, since the work in a feature branch is
typically larger, some seniority with the codebase can be beneficial.

## Reviewing

We can perform the review using GitHub's UI. By opening the Pull Request and clicking on the
`Commits` tab. Afterwards check each commit individually.

- Verify the commit has an existing review by following the Pull Request link and verifying the
  commit SHA hash matches. `Author merged commit 8c948fd into branch`.
- If not perform a regular code review of the commit.

Merge commits should be reviewed as well, the GitHub UI will automatically simplify the merge commit
and only show the changes made. If reviewing from the command line or through a different tool,
please use the command `git show <hash>`. For some background and more information please read
[How to review a merge commit](https://haacked.com/archive/2014/02/21/reviewing-merge-commits/).
