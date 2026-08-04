---
adr: "0034"
status: Accepted
date: 2026-08-05
tags: [clients, mobile, server, sdk]
---

# 0034 - Adopt engineering documentation standard

<AdrTable frontMatter={frontMatter}></AdrTable>

## Context and problem statement

Documentation practice has fragmented as the organization has grown:

- Major repos use divergent layouts (`docs/`, `Docs/`, per-crate READMEs, none), inconsistent README
  casing and quality, and no shared definition of what must be documented where.
- The de facto standards page lives in Confluence and is not enforced; practice diverges from it.
- Content sits in the wrong home: single-repo architecture on this site, shipped-code architecture
  deep dives in Confluence, production runbooks in personal spaces, and duplicated guidance across
  homes.
- Stale content accumulates with no supersession discipline, leaving superseded pages beside current
  ones with no deprecation.
- AI agents have become first-class documentation consumers and maintainers, and their instruction
  files (`CLAUDE.md`, rules, and skills across all repos) accumulate documentation-like content with
  nothing defining whether they are documentation at all.

A 2026-07 audit classified every documentation artifact across the major repos, this site, and
Confluence against a proposed routing model, confirming these gaps.

## Considered options

- **Status quo:** per-team conventions, advisory Confluence page.
- **Confluence-first:** centralize engineering docs in the wiki.
- **Per-repo standards:** each repo defines its own documentation rules and keeps its own ADRs.
- **One org-wide, docs-as-code documentation standard:** close-to-code default, single routing
  model, enforced through PR review and AI-agent guardrails.

## Decision outcome

Chosen option: **one org-wide, docs-as-code documentation standard**, published as the
[Documentation section](../../contributing/documentation/index.md). The standard is the living
reference. Its rules evolve by PR without superseding this decision and this ADR is superseded only
if the model itself changes. A snapshot of the rules at adoption:

1. **Public by default**. Private content is limited to documentation about working at Bitwarden and
   sensitive information.
2. **Located at the lowest common ancestor** of what is described.
3. **Every doc has an audience**. AI agents and humans are both first-class audiences and
   maintainers.
4. **Always up to date**. Doc maintenance is a top priority and happens alongside changes to what it
   describes.
5. **Discoverable and unified**, enforced by the style guide the standard publishes.

Diagrams follow the separate diagram standard adopted in
[ADR-0033](./0033-adopt-mermaid-diagram-standard.md), which keeps its own living reference at
Contributing › Documentation › Diagrams.

AI instruction files are explicitly not documentation and are out of the standard's scope. Their
guidance lives with the AI tooling.

### Positive consequences

- One place to answer "where does this doc live" and "which docs do I update", for engineers and AI
  agents alike.
- Documentation rides the code PR, so freshness is enforced by review and agent guardrails.
- Public-by-default locations serve external contributors and AI agents without special access.

### Negative consequences

- A migration backlog: existing content sits in homes the routing model forbids and must move.
- Strict-move deletions can break unknown inbound links. Known links are updated at move time and
  link checkers in CI are the mitigation for the rest.
- Every repo carries adoption work before the standard applies in practice.

### Plan

Follow-up PRs complete the standard:

- The standard, with its format guidance and templates, publishes as the Documentation section under
  Contributing and becomes the living reference this ADR mandates.
- The doc-currency plugin, which enforces rule 4, publishes in
  [bitwarden/ai-plugins](https://github.com/bitwarden/ai-plugins) and distributes the root
  `CLAUDE.md` documentation obligations.
- Each repo adopts the standard: base documentation obligations in the root `CLAUDE.md`, a
  `CONTRIBUTING` pointer, and markdown tooling parity.
- Remediation work items are filed for every rule that current reality violates, and the superseded
  Confluence standards page is deleted.

The migration backlog proceeds opportunistically under named owners. Small one-shot fixes are
tracked as work items; the long-running efforts:

- **Single-repo content migrates off this site**: `architecture/{clients,server,sdk,mobile-clients}`
  and 12 of 28 deep-dive pages (including the whole `autofill/` subtree) move into their repos per
  the routing table. Contributing docs' Deep Dives section holds only cross-repo or conceptual
  material.
- **Shipped-code architecture migrates out of Confluence**: pages describing shipped code (the SSH
  agent suite, event collection, key management cryptography) move in-repo or to this site per the
  decision rule.
- **README coverage in Bitwarden repositories**: generated stubs and missing module READMEs brought
  to the module README standard, and filename casing normalized.
- **Confluence hygiene**: stale and superseded pages deleted or stale-marked, and team runbook
  indexes adopt the runbook standard and its Last verified discipline.
- **Incident documentation consolidation**: RCAs converge on the incident.io export as the single
  home.
- **Style long tail**: style violations fixed across the site as pages are touched.
