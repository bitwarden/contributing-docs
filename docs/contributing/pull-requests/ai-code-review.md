---
sidebar_position: 2.5
sidebar_custom_props:
  access: bitwarden
---

# AI Code Review

Claude reviews your change in layers before a human does: on your machine before you push, on the
pull request when it opens, and on every push after that while the `ai-review` label is on. The pull
request reviews run on their own and post inline comments and a summary comment. The local reviews
and the security review run when you ask for them.

**Audience:** Bitwarden engineers who open or review pull requests.

:::info Before you start

These plugins must be installed and loaded from `bitwarden-marketplace`:

- `bitwarden-code-review`
- `bitwarden-delivery-tools`
- `bitwarden-software-engineer`
- `bitwarden-security-engineer`

:::

## Choose an entry point

### Local review

When you ask Claude to open a pull request, the
[bitwarden-delivery-tools plugin](https://github.com/bitwarden/ai-plugins/tree/main/plugins/bitwarden-delivery-tools)
runs this review for you through its `creating-pull-request` skill before it pushes. Both reviews
below write their findings to files on your machine, and nothing is posted to GitHub. They come from
the `bitwarden-code-review` plugin, and the
[plugin README](https://github.com/bitwarden/ai-plugins/blob/main/plugins/bitwarden-code-review/README.md)
lists its commands and how to install it.

The `creating-pull-request` skill asks how deep your change is before it runs the review. `Standard`
runs the single-agent review and `Substantial` runs the multi-agent review.

Use these reviews on other people's pull requests too, by passing the pull request number to either
command. Then ask Claude follow-up questions in the same session to understand the change before you
take your questions to its author.

:::tip Use a different model and a clean context window

Review your code with a different model from the one that wrote it, so the two models do not share
the same blind spots.

Run the review in another terminal window with a clean context window. A clean context window keeps
confirmation bias, reasoning that degrades over a long session, and earlier failed attempts from
distracting the model or biasing its judgment during the review.

:::

#### Single-agent review

Use the single-agent review for a typical feature, bug fix, documentation, or configuration change.

```text
/bitwarden-code-review:code-review-local
```

#### Multi-agent review

A change that touches any of the
[security principles](../../architecture/security/principles/index.mdx) must get the multi-agent
review locally. Use it for architectural and cross-cutting changes too.

```text
/bitwarden-code-review:performing-multi-agent-code-review
```

The
[multi-agent review](https://github.com/bitwarden/ai-plugins/tree/main/plugins/bitwarden-code-review/skills/performing-multi-agent-code-review)
puts several specialized reviewers on the same diff, and its flags let you run analysis, security,
validation, and the severity audit on different models.

### Automatic review

The review runs once on its own when a pull request is opened, marked ready for review, or reopened.
Drafts, closed pull requests, and pull requests Claude has already reviewed are skipped. Claude
posts inline comments and a summary comment. You do not need to do anything. The
[review workflow README](https://github.com/bitwarden/gh-actions/blob/main/review-code/README.md#how-it-works)
diagrams the rules that decide whether a review runs.

### `ai-review` label

Leave the `ai-review` label on your pull request unless you have a reason to remove it. While it is
on, the review reruns on every push. Without it, Claude skips every commit pushed after its first
review, even one last, small one. With the label on, Claude also reviews a draft. The
[review workflow README](https://github.com/bitwarden/gh-actions/blob/main/review-code/README.md)
describes the label rules.

The `ai-review-vnext` label runs a version of the review that is still being tested. Use it only
when you are asked to beta test changes to the review workflow.

### `@claude` mention

Mention `@claude` in a pull request or issue comment, a review, or an issue description to ask a
question or make a request about it. Claude answers in a comment. Do not ask it to write or commit
code. The
[respond workflow README](https://github.com/bitwarden/gh-actions/blob/main/respond/README.md)
describes how it runs.

## Security review

Run the
[security review](https://github.com/bitwarden/ai-plugins/tree/main/plugins/bitwarden-security-engineer/skills/perform-security-review)
from the `bitwarden-security-engineer` plugin on a security-critical or cryptographic change, in
addition to the multi-agent review and a human reviewer. Specialized agents review the diff for code
security, secrets and dependencies, security architecture, and threats, and a verification agent
then checks each finding. It reviews local changes, a pull request, a commit, or a time range.

```text
/bitwarden-security-engineer:perform-security-review
```

## Act on a review

Triage every finding. When a finding misreads the intent of the change, reply with why it does not
apply. A reply is a valid resolution because Claude can miss domain context, and it can flag too
much or too little. For the legitimate findings, ask Claude to fix the defects, then review each fix
before you commit it and resolve the finding. Our work on a pull request is complete when all Claude
findings are resolved and we have human approval. The
[plugin README](https://github.com/bitwarden/ai-plugins/blob/main/plugins/bitwarden-code-review/README.md#finding-classification)
links the severity levels Claude uses.

## Troubleshooting

The
[troubleshooting table](https://github.com/bitwarden/gh-actions/blob/main/review-code/README.md#troubleshooting)
in the review workflow README lists the likely causes.
