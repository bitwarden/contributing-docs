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

It's also useful to add a `upstream` remote pointing to the official Bitwarden repository. This will
allow you to pull in upstream changes easily by running.

```bash
# Example for the clients repository
git clone git@github.com:username/clients.git
cd clients
git remote add upstream https://github.com/bitwarden/clients.git
git fetch upstream
```

</community>

## Branch

Each new feature or bug fix should be developed on a separate branch. Branches allows you to work on
multiple features concurrently. In most cases you should branch from `master`. However, if you are
working with other contributors we typically branch of a long-lived feature branch. Long-lived
feature branches allows us to break up a single feature into multiple PRs, which can be reviewed
individually.

<community>

As a community contributor you can use the following command to branch directly from the _upstream_
master branch.

```bash
git checkout -b feature/example
```

</community>

<bitwarden>

As a bitwarden contributor you should branch of `origin/master`, this ensures that the branch is
always based of the latest upstream master even if the local master is out of date.

```bash
git checkout -b <pod>/<feature>/<issue-number> -t origin/master
```

</bitwarden>

<bitwarden>

### Naming convention

To keep branches organized we adhere a naming convention for branches. The convention splits branch
names into 3 components, each separated by a `/`.

1. The developers pod abbreviation (e.g. `sm`)
2. Type of work (e.g. `feature`, `bug`, `chore`)
3. Descriptive name, or issue number (e.g. `1234`)

```bash
# Some examples
sm/feature/access-policy
sm/feature/SM-2345
```

This naming convention allows us to easily identify the type of work being done on a branch. And
will assist in identifying and tracking down stale branches.

</bitwarden>

## Commit

We recommend grouping related changes together into a single commit. This can make it easier for
reviewers to understand and assess the changes that are being proposed, while also giving the
contributor checkpoints to revert to if something should go wrong.

More advanced contributors might find it useful to
[Rewrite History](https://git-scm.com/book/en/v2/Git-Tools-Rewriting-History). This allows a
contributor to revise their local history before pushing to the remote repository. A common use case
is squashing multiple half-working commits.

## Creating a Pull Request

The Bitwarden repositories have a _Pull Request template_ which should be followed. This will ensure
the PR review goes smoothly since it will provide context to the reviewer. <community> Once a
community PRs has been created, they will be automatically be linked to an internal Jira ticket. The
internal ticket is used for prioritization and tracking purposes. </community>

<bitwarden>

Please follow the following checklist when creating a PR.

- The PR should always contain a Jira reference.
  - Ensures QA have visibility in what they need to test.
  - Jira will automatically add a reference to the PR in the ticket if you include the ticket number
    (e.g. EC-123) or a link to the ticket anywhere in the PR title or body.
- Add appropriate reviewer(s).
  - In most cases, this should be your pod. Each pod should have a GitHub team to simplify
    requesting reviews, for example the _Platform pod_ has `pod-ps-dev`. There is a wider group
    which includes QA and designers, `pod-ps`.
  - Please use the
    [SME Yellowpages](https://bitwarden.atlassian.net/wiki/spaces/DEV/pages/195919928) to check if
    there is someone with specific knowledge of the area that can assist with reviewing complex
    changes.

</bitwarden>

### Force Pushing

Once a PR has been reviewed, please avoid git operations that affects the existing git commits, i.e.
anything that requires a force push. Force pushing prevents GitHub from correctly identifying “new
changes” to a PR forcing the reviewer to start over again.

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
before performing your first code-review.
