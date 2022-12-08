# Code Review Guidelines

At Bitwarden, we encourage everyone to participate in code reviews. A pod will focus primarily on
their own code reviews, but if you see something interesting, feel free to jump in and discuss.

To have efficient code reviews there are a few things to keep in mind (from
[Best Practices for Code Review | SmartBear](https://smartbear.com/learn/code-review/best-practices-for-peer-code-review/)):

- As an author, keep your PRs small - ideally less than 400 lines.
  - This can be tricky in our code base since many things are tightly coupled.
  - Consider splitting up a PR into multiple smaller PRs to encourage easier and better quality
    reviews.
  - Target `master` if the code is functionally complete, otherwise target a feature branch.
- Take your time when reviewing - expect a rate of less than 500 lines of code per hour.
- Take breaks - don’t review for longer than 60 minutes.

Don’t feel bad for taking your time when doing code reviews! They often take longer than you think,
and we should be spending as much time as needed.

:::tip

Bugs or defects found early in the development cycle have a much smaller cost associated with fixing
them.

:::

## Reviewing

If you feel that someone else has good knowledge of the code you are reviewing, please feel free to
reach out to them or add them as a reviewer. <bitwarden>Bitwarden developers can use the [SME
Yellowpages][sme-yellowpages] to look for knowledge area experts.</bitwarden>

Please do **not** approve code you do not understand the implications of. Comments and concerns are
always welcome! For example, it’s okay to leave some general comments or feedback, while also saying
that you don’t have enough knowledge to approve the changes. The author can ask for another review
from someone else, and there’s nothing wrong in having two reviewers on a PR.

### Review statuses

Please use the review statuses appropriately.

#### Comment

Comment is a great way to discuss things without explicitly approving or requesting changes.

#### Request changes

Request changes should be used when you believe something **needs** to change prior to the PR
getting merged, as it will prevent someone else from approving the PR before your concerns have been
tackled.

We shouldn’t hesitate to use this status, however we should give clear feedback on what needs to
change for the PR to get approved. Likewise a PR author should not be discouraged by a _request for
changes_, it's simply an indication that changes should be made prior to the PR being merged.

:::warning Discarding reviews

While it’s possible to discard reviews, this should be used sparingly. Whenever possible please
reach out to the reviewer first to ensure their concerns have been resolved. Below are a couple of
scenarios where discarding the reviews are generally seen as accepted.

- The reviewer is out of office for a longer duration and their original feedback has been resolved.
  It’s the responsibility of the new reviewer to ensure the original feedback has been addressed.
- The PR is a hotfix that needs to be deployed quickly, and the reviewer is in a different timezone.
  The feedback can be addressed in a follow up PR, if it hasn't already have been resolved.

:::

#### Approve

Approving a PR means that you have confidence in that the code works, and does what the PR claims.
Either by testing it or from previous domain knowledge.

- You have read and understood the all code changes in the PR.
- You have verified that the linked Jira issue description matches the changes made in the PR.
- The code is well structured, follows our code patterns, doesn’t have a better or more appropriate
  solution, and is free of unintended side-effects.

If you are unsure about any of the above, consider using a different status or check in with the
author to discuss things first. Also don’t hesitate to request a second review from someone else.

## Reviewing Techniques

There are no one-size-fits-all techniques for reviewing code. However there are techniques, tools,
and other resources that can help you review code more efficiently.

### Multiple Focus Areas

It can be helpful to split the code review into multiple focus areas. And focus on a single view at
a time.

- Macro View - Focus on the PR as a whole.
  - Is the problem being solved?
  - Is it being solved efficiently by changing in the appropriate places using the appropriate
    abstractions?
- Micro View - Focus on individual files.
  - Is the code style adhered?
  - Is the code readable?

### GitHub features

The GitHub interface has some handy tools to help you review code. For more information, see the
following articles.

- [Commenting on a pull request - GitHub Docs][gh-commenting] how to comment on a PR, including:
  - commenting on multiple lines
  - suggesting code changes that the author can immediately accept and merge via the GitHub
    interface
- [About comparing branches in pull requests - GitHub Docs][gh-branches] different ways to view the
  diff, including:
  - hiding whitespace (very useful if there have been lots of indentation changes)
  - displaying the old code and the new code separately (so you can read the new code without all
    the noise) - or combining them (so you can see exactly what’s changed)

### Running Locally

Many changes can be reviewed online on GitHub. However, sometimes it’s useful to run the code
locally to improve your understanding - for example:

- To use IDE features (like jumping to definitions or finding references)
- To reproduce a bug you think you’ve spotted in the code
- To run the solution to understand how it all fits together (macro view).

To run the code locally, we recommend using the GitHub CLI. This lets you checkout a PR directly
without managing remote branches - for example:

```bash
// From within the repo:
gh pr checkout <GitHub PR number>
```

[sme-yellowpages]: https://bitwarden.atlassian.net/wiki/spaces/DEV/pages/195919928
[gh-commenting]:
  https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/reviewing-changes-in-pull-requests/commenting-on-a-pull-request
[gh-branches]:
  https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/about-comparing-branches-in-pull-requests
