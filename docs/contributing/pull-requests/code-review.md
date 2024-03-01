---
sidebar_position: 2
---

# Code Review Guidelines

At Bitwarden, we encourage everyone to participate in code reviews. A team will focus primarily on
their own code reviews, but if you see something interesting, feel free to jump in and discuss.

A few general guidelines:

- Pull requests should be manageable. If the PR is too large -- significantly above a few hundred
  lines -- ask the contributor if it can be split it up into multiple PRs before reviewing.
  - This can be tricky in our codebase since many things are tightly coupled.
- Take your time when reviewing - expect a rate of less than 500 lines of code per hour.
- Take breaks - don’t review for longer than 60 minutes.

Don’t feel bad for taking your time when doing code reviews! They often take longer than you think,
and we should be spending as much time as needed. When you find a bug or defect during PR review,
the cost of fixing it is much smaller than if it escapes further into the development lifecycle.

:::tip Want to read more?

You can find more tips for PR review here:
[Best Practices for Code Review | SmartBear](https://smartbear.com/learn/code-review/best-practices-for-peer-code-review/)

:::

## Reviewing

If you feel that someone else has good knowledge of the code you are reviewing, please feel free to
reach out to them or add them as a reviewer. <Bitwarden>Bitwarden developers can use the [SME
Yellowpages][sme-yellowpages] to look for knowledge area experts.</Bitwarden>

Please do **not** approve code you do not understand the implications of. Comments and concerns are
always welcome! For example, it’s okay to leave some general comments or feedback, while also saying
that you don’t have enough knowledge to approve the changes. The author can ask for another review
from someone else, and there’s nothing wrong in having two reviewers on a PR.

When undertaking a review, keep in mind that you are taking an ownership stake in the changes. You
should always strive to provide actionable feedback to the author and to make yourself available for
any clarifying questions or to pair on fixes suggested.

While we mostly use an asynchronous review process, please don't hesitate to schedule a meeting with
the author to discuss the changes. While asynchronous communication can be useful, it incurs a time
penalty which can drag out the review process. Sometimes setting up a short call to discuss the
changes can save a lot of time.

:::info Assumptions

<a id="assumptions-note"></a> When reviewing code, remember that all software is built to conform to
a set of assumptions. Features, bug fixes, and other requirement changes represent a change in those
assumptions. Code, after merge, should represent the best solution that fulfills the new set of
requirements, which may not necessarily be in line with the previous solution.

:::

### Review statuses

When completing a review, you can either add comments, request changes, or approve the PR. It is
important that both the reviewer and the author understand the expectations around each type of
review, so we use the guidelines below.

:::tip Tip for effective feedback

When providing comments or requesting changes, keep in mind the experience level of the author.

If the engineer is new to the company and the codebase or less experienced overall, they would
probably welcome more explicit background on your concerns and more concrete suggestions, whereas a
more experienced engineer would prefer general guidance so that they can solve the problem
themselves.

:::

#### Comment

Using comments is a great way to discuss things without explicitly approving or requesting changes.

#### Request changes

Request changes should be used when you believe something **needs** to change prior to the PR
getting merged, as it will prevent someone else from approving the PR before your concerns have been
tackled.

We shouldn’t hesitate to use this status. However, it does come with obligations for the reviewer.
By blocking the PR from progressing, you are taking on additional responsibility and should give
clear feedback on what needs to change for the PR to get approved. Likewise, a PR author should not
be discouraged by a request for changes, it's simply an indication that changes should be made prior
to the PR being merged. This is common.

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

Approving a PR means that you have confidence in that the code works and that it does what the PR
claims. This can be based on testing the change or on previous domain knowledge.

- The PR targets the [correct branch](branching#which-branching-model-to-choose).
- You have verified that the linked Jira issue description matches the changes made in the PR.
- You have read and understood the full impact of the changes suggested by the PR.
- You have verified that all possible changes have been
  [unit tested](./../testing/unit/naming-conventions.mdx).
- You attest that the changes
  - Solve the intended problem,
  - [solve the requirements in the best way](#assumptions-note),
  - the code is well structured,
  - follows our most recent, accepted patterns,
  - and is free of unintended side-effects.

If you are unsure about any of the above, consider using a different status or check in with the
author to discuss things first. Also don’t hesitate to request a second review from someone else.

If a PR affects multiple teams, approval will be required by all teams impacted. The approver for
the team that produced the PR[^1] is responsible for approving the change as a whole, while impacted
teams are responsible only for their portion of the codebase.

## Reviewing Techniques

There are no one-size-fits-all technique for reviewing code. However there are techniques, tools,
and other resources that can help you review code more efficiently.

### Multiple Focus Areas

It can be helpful to split the code review into multiple focus areas. And focus on a single view at
a time.

- Macro View - Focus on the PR as a whole.
  - Is the problem being solved?
  - Is it being solved efficiently by changing in the appropriate places using the appropriate
    abstractions?
  - Does the PR change the areas you expect to be changed?
    - Are any missing?
    - Are any present you didn't expect?
  - Are unit tests present?
- Micro View - Focus on individual files.
  - Is the code style adhered?
  - Is the code readable?
  - Are previous patterns followed?
  - Are previous patterns still the right choice?

### GitHub features

The GitHub interface has some handy tools to help you review code. For more information, see the
following articles.

- [Commenting on a pull request - GitHub Docs][gh-commenting] how to comment on a PR, including:
  - commenting on multiple lines
  - suggesting code changes that the author can immediately accept and merge via the GitHub
    interface
    - Be careful with this! You don't have the benefit of your IDE. It's easy to break syntax or
      formatting.
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

[^1]: Or the team shepherding the PR, if it originated from the community
