# Long-lived Feature Branches

A long lived feature branch typically differs from regular Pull Requests in two significant ways.

1. It has multiple authors.
2. It consists of multiple Pull Requests.

Since each pull request has already been reviewed before being merged into the feature branch, the
feature branch review is more of a sanity check. The reviewer should ensure the following:

- The feature branch is ready to be merged into master.
  - Ensure the work has been QA tested, including writing QA notes should it be needed.
  - Or verify the feature is behind a feature flag, and the crossover boundaries goes through
    testing.
- Review any non-reviewed commits made directly on the branch, these can be either feature work or
  merge commits.

## Syncing Feature Branch

We typically denote one person as being responsible for keeping the feature branch up to date. In
most cases this will be the TPC of the pod but can be anyone. This person is responsible for keeping
reasonable up to date with master, preparing the feature branch for merge and more.

Due to how GitHub handle reviews, this person cannot also approve the feature branch. The reviewer
of the feature branch can be anyone in the pod. However since the work in a feature branch is
typically slightly larger some seniority with the codebase can be beneficial.

## Reviewing

We can perform the review using GitHubs UI. By opening the Pull Request and clicking on the
`Commits` tab. Afterwards check each individually commit.

- Verify the commit either has an existing review by following the Pull Request link, and verifying
  the commit SHA hash matches. `Author merged commit 8c948fd into branch`.
- If not perform a regular code review of the commit.

Merge commits should be reviewed as well, the GitHub UI will automatically simplify the merge commit
and only show the changes made. If reviewing from the command line or through a different tool,
please use the command `git show <hash>`. For some background and more information please read
[How to review a merge commit](https://haacked.com/archive/2014/02/21/reviewing-merge-commits/).
