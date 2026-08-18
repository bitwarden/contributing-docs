---
sidebar_position: 2
sidebar_label: Documentation
---

# Documentation standard

**Audience:** Bitwarden engineers who write and maintain technical documentation, and AI agents that
read documentation to work in our codebases. External contributors are a secondary audience.

## Notation

The keywords MUST, MUST NOT, SHOULD, SHOULD NOT, and MAY are to be interpreted as described in
[RFC 2119](https://www.rfc-editor.org/rfc/rfc2119).

`repo` is short for repository, referring to a git repository.

`doc` or `docs` is short for documentation.

`PR` is short for pull request.

`RCA` is short for root cause analysis, the post-incident review document.

`CI` is short for continuous integration.

`system`, `container`, and `component` describe software scope as the
[diagram standard](./diagrams.md) defines them: C4 vocabulary, where a component is a major part
inside one container (a library, a crate, a feature root).

`›` marks a location in a site or page hierarchy ("contributing.bitwarden.com › Architecture").

`→` marks a routing outcome ("cross-repo architecture → contributing.bitwarden.com"). Read as
"then".

## The standard

1. **Public by default**. Private content is limited to documentation about working at Bitwarden and
   sensitive information.
2. **Located at the lowest common ancestor** of what is described.
3. **Every doc has an audience**. AI agents and humans are both first-class audiences and
   maintainers.
4. **Always up to date**. Doc maintenance is a top priority and happens alongside changes to what it
   describes.
5. **Discoverable and unified**, enforced by the style guide published here.

## Where documentation lives (rules 1, 2)

The **lowest common ancestor** of a doc's subject is the deepest scope that contains everything it
describes: a component for component docs, a repo root for repo-spanning guides,
contributing.bitwarden.com for subjects above any one repo, and a private location when
[rule 1](#private-content) removes the public homes from consideration. Every doc lives there and
nowhere else. Close to code is the common case: in-repo docs ride the same PR and review as the
change and are visible to AI agents working in the tree.

Within a scope, documentation is one growing artifact: it starts at the scope's entry point,
typically its `README.md`, and splits into a `docs/` folder beside it when it outgrows one file, per
[Component documentation](./component-documentation.md). Wherever this standard says `README.md` or
`docs/`, it means that artifact at either stage.

AI instruction files (`CLAUDE.md`, rules, skills) are not documentation: they are instructions on
how to behave and how to consume documentation. This standard does not govern them, and content that
belongs in documentation MUST NOT live in an instruction file, since that would give it a second
home.

One home holds one **perspective**: the audience a doc serves and the question it answers. A
different audience or altitude is a different [perspective](./diagrams.md), not a duplicate. Link
related perspectives to each other, and link instead of copying, since duplicated guidance always
diverges.

### Decision rule

Apply in order. First match wins:

1. Is it [Private content](#private-content)? → a **private location:**
   <Bitwarden>[bitwarden/tech-breakdowns](https://github.com/bitwarden/tech-breakdowns)</Bitwarden><Community>bitwarden/tech-breakdowns</Community>
   for tech breakdowns and work specifications, **Confluence** in the owning team's space for
   everything else.
2. Does it describe **code in one repo**? → **that repo**, in the owning scope's
   [`README.md` or `docs/`](./component-documentation.md).
3. Is it **how to contribute or build**, **architecture spanning repos**, or an **architectural
   decision**? → **contributing.bitwarden.com**
   ([bitwarden/contributing-docs](https://github.com/bitwarden/contributing-docs)), behind the
   `<Bitwarden>` audience gate when the concern is internal-only.

:::note

1. This rule fires first because `<Bitwarden>` gating is not secrecy: it is convenience and
   effective communication.
2. Repo-specific practice guides (testing, troubleshooting, tooling tips coupled to the repo's
   scripts or lint config) follow this rule.
3. Environment setup and onboarding follow this rule even when repo-specific. Internal content does
   not move to Confluence merely for being internal. It MUST be sensitive or organizational.

:::

The inverse of these rules can be round in the [reverse routing tables](./reverse_routing_tables.md)

### Private content

Exactly two categories of content are private:

- **Content Bitwarden cannot expose**: sensitive infrastructure, security-operational detail.
  Feature and work planning also belong here, since direction is private until work begins.
- **Content about working at Bitwarden** rather than working on its code: people processes, on-call,
  incident response, and team/org process.

Everything else defaults to public. Bitwarden builds in the open and public docs serve external
contributors without special access. The litmus test is

> Anything about **how to write or build Bitwarden code** goes somewhere public.

Confluence holds what we cannot expose and the business of working at Bitwarden, not engineering
knowledge.

## Audience (rule 3)

Documents without a targeted audience lack focus. Even if the original author had a specific
audience in mind, the living and collaborative nature of our documentation makes an explicit
audience callout necessary. Apart from ADRs, every isolated (not directly attached to code) document
MUST include an audience the document is written for.

## Documentation updates (rule 4)

The only thing that is worse than missing documentation is inaccurate documentation. It misinforms,
wastes time, and frustrates. This standard is designed to maximize the amount of documentation that
can be kept in lock-step with the code it describes, and the **doc-parity plugin**, which every repo
MUST adopt from [bitwarden/ai-plugins](https://github.com/bitwarden/ai-plugins), enforces it: at
agent execution time for in-repo docs, and at review time for external docs. When a change
invalidates an external doc, a work item MUST be created before merge and the doc MUST receive a
[stale marker](#stale-markers) at the same time. The work item is done when the marker comes off,
and prioritization belongs to the owning team. Finally, the PR checklist item "Updated any necessary
documentation" reminds the PR author to update docs, and the reviewer validates it like code.

### Deleting is maintenance

When code is removed, remove its docs. Moving or replacing a doc is a **strict move**: the old
location MUST be deleted and known inbound links MUST be updated. ADRs are the exception: they are
historical records, so their supersession is a status change with a link to the successor, never a
deletion.

Similarly, when decisions or trends change, docs MUST be updated to reflect the new reality.
Documents MUST NOT maintain a historic record of prior thinking, breadcrumb artifacts of the path to
the current state, or tedious enumerations of prior misunderstandings.

### Stale markers

Documentation known to be outdated but not yet fixable gets a top-of-file banner:
`⚠️ Outdated (YYYY-MM-DD): <what changed>, per <link to the change>. Fix tracked by <work item>.`
Stale documentation is worse than none because it confidently misleads. Make inaccuracies known,
even when correction is not prioritized.

### Owners

Ownership follows `CODEOWNERS` for in-repo docs. Confluence pages name an owning team in the header
and SHOULD follow the owners of the Confluence space.

Owners are responsible for the maintenance and general health of the documentation they own.

### Changes to this standard

A change to this standard that current reality violates ships with a remediation path in the same
change. This means tracked work items where the violations are enumerable, or a transition plan
(owned migrations, convert-on-touch policies, tracked deviations) where they are not. Existing
violations are named, never silently grandfathered.

## Style guide (rule 5)

Match form to content: walkthroughs and deep dives are prose, while reference material leans on
tables, lists, and rules. Both are legitimate. Code comments follow language norms
([Component documentation](./component-documentation.md)).

- **Docs have a default entry point**: the index for Confluence and contributing.bitwarden.com, the
  README for code repos.
- **Diagrams follow the [diagram standard](./diagrams.md)**.
- **Concise, single-purpose.** Sprawling documentation is hard to maintain and a chore to consume.
  Write the minimum that serves the audience, and delete what does not.
- **Highly linked.** Link to supporting and related docs, since linking is what enables concise,
  single-purpose documents.
  - Say what is behind the link ("the ADR index explains statuses", not "see here").
  - Relative links within a repo, full URLs across repos and sites.
  - Public pages MUST NOT link to internal-only destinations outside a `<Bitwarden>` gate, since
    external contributors cannot access them.
- **Lead with the point.** Open with what the reader came for: what the component does, how the flow
  works, the takeaway. Background, rationale, and edge cases follow.
- **Sentence case** for all headings ("Considered options", not "Considered Options").
- **Headings mark lookup targets.** Add one where a reader would search or deep-link, never to break
  up text.
- **Procedures** are numbered steps starting with a verb ("Run…", "Open…", "Set…"). One command per
  fenced code block, never inline, always with a language tag. State expected output when it is not
  obvious.
- **Code samples are real**: taken from or verified against the actual codebase, with file paths
  (`libs/state/README.md` style).
- **No invented shorthand.** Spell out space, section, and product names. A reader should not need
  to decode abbreviations the document never defines.
- **Formatting is tooling's job**: Prettier and cspell where the repo has them. Repos SHOULD adopt
  both plus a link checker in CI.

### Standards documents

Normative documents like this one (org-wide standards, the diagram standard) carry additional
formality, since readers and tooling act on their exact wording:

- **RFC 2119 keywords** in all caps mark requirement levels. Define them, and any other notation the
  document relies on, in a [Notation](#notation) section up front.
- **Lead with the rules**: a numbered rule list up top, elaboration sections tagged by the rules
  they explain.
- **Rationale rides in a trailing `:::note`** whose numbering matches the rules, as the
  [decision rule](#decision-rule) does, or attaches with "since" or "because". No em-dash,
  parenthetical, or semicolon asides, and no asides that only dramatize a rule.
- **No contractions.** Write "do not", "cannot", and "it is" in full.

## Definition of done

A documentation change (or the doc portion of a code change) is done when it satisfies
[the standard](#the-standard) and the [style guide](#style-guide-rule-5).

For a **code** change, every README, `docs/` page, diagram, doc comment, and `CLAUDE.md` that
describes the changed behavior MUST be updated in the same PR. If none described it but it warrants
documentation per the [component README standard](./component-documentation.md), add it.
