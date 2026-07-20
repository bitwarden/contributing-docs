---
adr: "0033"
status: Proposed
date: 2026-07-16
tags: [clients, mobile, server, sdk]
---

# 0033 - Adopt the diagram standard

<AdrTable frontMatter={frontMatter}></AdrTable>

## Context and problem statement

Architecture diagrams are scattered across tools and formats with no organizational standard:
Draw.io XML, Lucidchart embeds, ad hoc Mermaid, and images committed without source. The same system
is drawn differently in different spaces with no mechanism to keep representations consistent and
diagrams rot because nothing connects them to the systems they describe. Finally, AppSec's
Engagement Model requires system representations that today are rebuilt from scratch per review.

A prior initiative reached proof of concept on Structurizr, a dedicated C4 modeling platform, with
an on-prem instance and SSO integration underway. SecOps eventually raised concerns about its
maintenance posture and missing compliance documentation which caused a re-evaluation of the choice.
Also, hosting a separate platform added operational overhead. Finally, experience with the PoC
showed that structurizr and all modeling tools' central promise -- one model producing many
audience-specific views -- requires substantial rework per audience in practice.

## Considered options

- **Status quo:** every team picks its own tool.
- **Structurizr (self-hosted):** shared C4 model platform; deprioritized for the reasons above.
- **IcePanel:** visual C4 SaaS; no diagrams-as-code model for version control.
- **draw.io as the standard:** strongest native Confluence app, but stores XML in attachments and
  has no GitHub-native rendering.
- **Mermaid with defined conventions:** text in Markdown, GitHub-native rendering, macro support on
  Confluence, and zero infrastructure.

## Decision outcome

Chosen option: **Mermaid with defined conventions**, published as the
[diagram standard](../../contributing/diagrams.md). The standard is the living reference. Its rules
evolve by PR without superseding this decision and this ADR is superseded only if the chosen option
itself changes. A snapshot of the rules at adoption:

1. Diagrams are Mermaid source text, nothing else: as Mermaid code blocks, or, if in Confluence, via
   Macro Pack's Mermaid diagram in text-input mode.
2. Any Mermaid diagram type that fits.
3. A diagram lives in the doc it illustrates, not a separate file.
4. Every diagram carries a perspective caption: audience, intent, and scope.
5. A diagram answers one question at one altitude. Anything larger requires multiple diagrams.
6. C4 is shared vocabulary only. No C4 tooling is adopted.
7. A diagram is owned by whoever owns the doc it lives in.
8. A diagram updates with the change it depicts. AI instruction files carry the obligation of
   establishing a standing safeguard.

### Positive consequences

- Diagram sources are diffable, reviewable in PRs, readable by AI agents, and free of hosted
  platforms and new vendors.
- One notation and one vocabulary across repos, the contributing site, and Confluence, with a
  mechanical ingestibility test (`GET /wiki/api/v2/pages/{id}?body-format=storage` returns the raw
  Mermaid) guarding the Confluence path.
- Mermaid encourages small, single-purpose, and digestible diagrams, which rule 5 codifies.

### Negative consequences

- **rustdoc does not render Mermaid**; crate READMEs embedded via `include_str!` show the raw source
  as a plain code block. This is accepted. If rendering ever becomes necessary,
  [aquamarine](https://github.com/mersinvald/aquamarine) is the chosen path in inline mode only. It
  is not adopted now because it adds a proc-macro dependency to the security-critical SDK workspace
  for cosmetic gain.
- **Macro Pack authoring is slow.** Macro Pack is the standard for now. If authoring friction
  warrants a replacement, trial weweave's "Mermaid Charts & Diagrams" (runner-up: the official
  Mermaid Chart app) and gate any adoption on the storage-format ingestibility test above.
- **Mermaid's C4 diagram types are experimental** and auto-layout limits complex diagrams. Rule 5
  keeps each diagram inside what auto-layout handles well, and rule 2's open-ended diagram types
  provide the fallback.
- **A rendered diagram shared as an image loses its perspective**, since the caption attaches in the
  doc rather than inside the Mermaid source (embedding was tested and fails to render on Macro
  Pack). This is accepted.
- A migration backlog: the contributing site's PlantUML/Kroki diagrams, static diagram assets, and
  source-less images convert to Mermaid.
