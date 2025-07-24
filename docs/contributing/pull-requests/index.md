---
sidebar_position: 4
---

# Pull Requests

:::success Reviewing Pull Requests

This page focuses on authoring and addressing feedback on Pull Requests. For details and
expectations for PR reviewers, see [Code Review](./code-review.md).

:::

Pull Requests are the primary mechanism we use to write software. GitHub has some great
[documentation](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/about-pull-requests)
on using the Pull Request feature.

<Community>

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

</Community>

## Branch

Each new feature or bug fix should be developed on a separate branch. Branches allow you to work on
multiple features concurrently. In most cases you should branch from `main`. However, if you are
working with other contributors we typically branch off a long-lived feature branch. Long-lived
feature branches allow us to break up a single feature into multiple PRs, which can be reviewed
individually but tested and released together.

<Community>

As a community contributor you can use the following command to branch directly from the _upstream_
`main` branch.

```bash
git checkout -b feature/example
```

</Community>

<Bitwarden>

As a Bitwarden contributor you should branch of `origin/main`, this ensures that the branch is
always based of the latest upstream `main` even if the local `main` is out of date.

```bash
git checkout -b <team>/<issue-number>/<brief-description> -t origin/main
```

Our branching strategy is described in detail [here](branching.md).

</Bitwarden>

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
is squashing multiple half-working commits.

:::warning

**Avoid force push** once a PR has been reviewed.

Git operations that affect the existing git commits prevent GitHub from correctly identifying “new
changes” to a PR forcing the reviewer to start over again.

:::

## Creating a pull request

The Bitwarden repositories have a _Pull Request template_ which should be followed. This will ensure
the PR review goes smoothly since it will provide context to the reviewer.<Community> Once a
community PR has been created, it will be automatically be linked to an internal Jira ticket. The
internal ticket is used for prioritization and tracking purposes.</Community><Bitwarden> When
creating the PR include a Jira ticket reference so the reviewer can gain all context on the work as
well as links to any associated PRs in other repositories.</Bitwarden>

<Bitwarden>

### Tagging reviewers

We use `CODEOWNERS` in each repository to assign the reviewing teams based on the files in the PR.
These reviews are required for the changes to be merged to `master`.

You can tag additional teams or individuals for review as you see fit, including `@dept-design` for
any design changes.

### Opening the PR for review

As its name implies, marking a PR as "Ready for Review" indicates that you are ready for all
assigned teams to review it. If the changes are still in progress, leave the PR in `Draft` status.
Doing this ensures that reviewers can act on the "Ready for Review" as their signal to begin the
review process without further notification.

You should receive a review or at least first contact from a reviewer from each assigned team within
**two business days** of marking the PR as Ready for Review.

### Follow-up notification

If there is no response to a request for review for two business days, the author should reach out
to the team(s) -- or to individual engineers if assigned -- via Slack to follow up.

This should wait for two business days to allow the default process to take place and not overwhelm
the team with notifications on multiple platforms.

:::warning Urgent reviews

If deployment deadlines or other concerns mean there is a need to shorten the review period for a
pull request, the author should reach out to the reviewing team via their Slack channel. This should
**only** be necessary for urgent requests and for follow-up after two business days.

:::

</Bitwarden>

<Community>

When your pull request is received, it will follow our
[community contribution review process](community-pr-process.md).

</Community>

### Addressing feedback

It is likely that you will receive some feedback on your PR. You should see this as a positive thing
-- it signifies a healthy and thorough review process and an organizational commitment to code
quality. You may receive [comments](./code-review.md#comment) or a
[request for changes](./code-review.md#request-changes). You are encouraged to engage in
conversation on the PR to discuss a solution, but if any strong conflicting opinions arise it is
often best to move the conversation to a synchronous format to avoid any misunderstanding.

When any necessary changes have been made, you should address the comments or request for changes by
responding in the PR conversation thread. You are not responsible for resolving the conversation --
that is the prerogative of the reviewer, to ensure that they agree that the question or concern has
been addressed.

**When you are ready for a reviewer to revisit your changes, you should request a re-review.** This
will notify the reviewer and ensure a prompt response.
