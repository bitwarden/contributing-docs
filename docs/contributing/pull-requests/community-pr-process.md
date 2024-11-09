---
sidebar_position: 4
sidebar_custom_props:
  access: community
---

# Contribution Review Process

Congratulations! You've submitted a pull request for changes to the Bitwarden codebase.

Bitwarden recognizes the time and effort that community members take to recognize bugs or potential
new features and offer up pull requests to resolve them.

Transparency is one of our core values, and we feel that it is important that contributors
understand the process that our teams take in evaluating, prioritizing, and reviewing these pull
requests, and why some changes may move more quickly to completion than others.

## Product assessment

When your community contribution is received, the first step is for our Product team to evaluate
whether the change aligns with the vision for the Bitwarden product. This is more relevant for
feature enhancements than bugs, but it is important for us to assess whether the change conflicts
with larger upcoming changes on the roadmap or would potentially replace work already on the backlog
for a team.

If the Product team has clarifying questions or would like the change to be modified to more closely
align with their vision, they will reach out on the PR and request changes.

Once Product has signed off on the change, it moves to our Engineering teams.

## Engineering assessment

The Engineering team(s) responsible for the change depend largely on what code was changed. We use
Github code owners to manage the areas in our repositories owned by each team, and the responsible
team(s) will be automatically tagged as reviewers on the PR that you raise to merge your changes.

:::tip Assigned reviewers

When a Bitwarden developer is assigned to your PR, that does not necessarily mean that the PR is
under active review at that moment. This assignment may take place while the work is still on the
team's backlog.

:::

The responsible Engineering teams will review the change and ensure that there are no concerns
around how the change was implemented. This is generally more applicable for larger sets of changes,
where the team needs to ensure that the change aligns with the architectural vision for how the code
should be structured. Community contributors following practices exhibited in the current codebase
may not be aware of existing tech debt or patterns that are no longer encouraged for new
development. Intervening at this point allows us to communicate to you preemptively and request the
desired changes before a formal review starts.

## Pull request review and testing

Once the team has assessed the high-level implementation, your contribution is ready for active code
review. If not done already, the PR will be assigned to a Bitwarden engineer from each responsible
team.

The reviewer and the team's QA engineers will test the change in all applicable clients or server
environments and ensure that proper test coverage is present. If there are changes required, or
testing is not successful, they will reach out on the PR to request changes.

Once that is complete, they will approve the changes and contact you on the PR to let you know. They
will merge your PR into the `main` branch, and it will be included in the next release!
