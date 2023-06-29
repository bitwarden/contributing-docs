---
sidebar_position: 4
---

# Pull Requests

Pull Requests are the primary mechanism we use to write software. GitHub has some great
[documentation](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/about-pull-requests)
on using the Pull Request feature.

<community>

## Fork

In order to contribute to Bitwarden you will need to fork the relevant repository. For details on
how to do this see this
[help article from GitHub](https://docs.github.com/en/get-started/quickstart/fork-a-repo). After
forking the repository you will need to clone it locally.

```bash
# Example for the clients repository
git clone git@github.com:username/clients.git
```

It's also useful to add a `upstream` remote pointing to the official Bitwarden repository.

```bash
# Example for the clients repository, from the repository directory
git remote add upstream https://github.com/bitwarden/clients.git
```

This will allow you to pull in upstream changes easily by running.

```bash
# Example for the clients repository, from the repository directory
git fetch upstream
```

</community>

## Branch

Each new feature or bug fix should be developed on a separate branch. Branches allow you to work on
multiple features concurrently. In most cases you should branch from `master`. However, if you are
working with other contributors we typically branch off a long-lived feature branch. Long-lived
feature branches allow us to break up a single feature into multiple PRs, which can be reviewed
individually but tested and released together.

<community>

As a community contributor you can use the following command to branch directly from the _upstream_
master branch.

```bash
git checkout -b feature/example
```

</community>

<bitwarden>

As a Bitwarden contributor you should branch of `origin/master`, this ensures that the branch is
always based of the latest upstream `master` even if the local `master` is out of date.

```bash
git checkout -b <team>/<issue-number> -t origin/master
```

Our branching strategy is described in detail [here](branching.md).

</bitwarden>

## Commit

We recommend grouping related changes together into a single commit. This can make it easier for
reviewers to understand and assess the changes that are being proposed, while also giving the
contributor checkpoints to revert to if something should go wrong.

We do not have a standard for how to structure commit messages (e.g. semantic commit messages). We
encourage that commit messages should be within the 50-character limit so that `git log` can be used
easily. If a commit message would take more than 50 characters it is best to break it up into
smaller atomic changes for readability and malleability of the git history (reversion,
cherry-picking, etc.).

More advanced contributors might find it useful to
[Rewrite History](https://git-scm.com/book/en/v2/Git-Tools-Rewriting-History). This allows a
contributor to revise their local history before pushing to the remote repository. A common use case
is squashing multiple half-working commits. Please be sure to follow the
[force-pushing recommendations](#force-pushing).

:::warning

**Avoid force push** once a PR has been reviewed.

Git operations that affects the existing git commits prevent GitHub from correctly identifying “new
changes” to a PR forcing the reviewer to start over again.

:::

## Creating a Pull Request

The Bitwarden repositories have a _Pull Request template_ which should be followed. This will ensure
the PR review goes smoothly since it will provide context to the reviewer. <community> Once a
community PRs has been created, they will be automatically be linked to an internal Jira ticket. The
internal ticket is used for prioritization and tracking purposes.</community><bitwarden>Include a
Jira ticket reference so the reviewer can gain all context on the work.</bitwarden> Tag
`@dept-design` as a reviewer for any UI changes.

## Review process

<community>

Once a Community PR has been created a Bitwarden developer will perform a code review, while we try
to this in a reasonable time-frame, please understand that we have internal roadmaps and priorities
that may delay this process.

</community>

<bitwarden>

While we mostly use an async review process, please don't hesitate to schedule a meeting with the
reviewer/contributor to discuss the changes. While async communication can be useful it incurs a
time penalty which can drag out the review process. And sometimes setting up a short call to discuss
the changes can potentially save a lot of time.

</bitwarden>

We've written up some [guidelines](./code-review.md) for reviewing code, which we recommend reading
before performing your first code review.
