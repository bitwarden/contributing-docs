---
sidebar_position: 4
sidebar_custom_props:
  access: bitwarden
---

# Runbook template

<Bitwarden>

**Audience:** Bitwarden engineers authoring or executing runbooks.

Notation follows the [documentation standard's Notation](./index.md#notation).

This template produces Confluence pages in the owning team's space, under that space's runbook
index, never in a personal space. The structure below maps 1:1 to Confluence headings, and the
metadata block is a table at the top of the page.

````markdown
# Runbook: <action> <system> (e.g., "Rotate data protection certificate")

|                      |                                                         |
| -------------------- | ------------------------------------------------------- |
| **Owner**            | <team> (Slack: #<channel>)                              |
| **Audience**         | <who executes this, typically the owning team>          |
| **Service / system** | <what this operates on, with links to dashboards/infra> |
| **Last verified**    | YYYY-MM-DD by <name>                                    |
| **Supersedes**       | <name of the deleted prior runbook + date, or "—">      |
| **Risk**             | <what goes wrong if a step fails; customer impact>      |

## Notation

<Define any symbols or keywords this runbook relies on. Delete this section if unused.>

## When to use this

One or two sentences: the alert, symptom, or scheduled task that triggers this runbook. If there is
a related incident type or Datadog monitor, link it.

## Prerequisites

- Access needed (roles, groups, VPN, break-glass); link the request path.
- Tools needed and where to get them.
- Preconditions to confirm before starting (and how to confirm them).

## Steps

1. Verb-first instruction.

   ```
   one command per code block
   ```

   Expected output: <what success looks like for this step>.

2. **⚠️ point of no return** Next step. Call out irreversible steps before the step, not after as
   done for this step.

## Verification

How to confirm the overall operation succeeded before closing the page.

## Rollback

How to undo, or the explicit statement "not reversible past step N; escalate instead."

## Escalation

Who to page/ask when a step fails, in order (person/rotation, Slack channel, incident.io severity to
raise).
````

Rules:

- **Last verified** is updated by whoever executes the runbook, every time; fixing drift found
  during execution is part of executing. If not verified in 12 months, add a
  `⚠️ Unverified since <date>` banner.
- One command per code block; no prose-embedded commands, since responders copy-paste under
  pressure.
- When this runbook replaces another, delete the old page after updating known inbound links.
- Diagrams, if any, follow the [diagram standard](./diagrams.md).

</Bitwarden>
