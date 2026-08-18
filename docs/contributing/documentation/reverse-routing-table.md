---
sidebar_position: 3
sidebar_label: Reverse Routing Table
---

# Reverse routing table

**Audience:** Bitwarden engineers and AI agents deciding where a document belongs.

Notation follows the [documentation standard's Notation](./index.md#notation).

Where each kind of documentation lives, grouped by home. Owners follow the
[ownership rule](./index.md#owners). The Format column links the page that owns the type's format,
where one exists. When more than one row fits, the most specific row wins. This applies within a
group or between multiple.

Per rule 4, every type updates alongside what it describes. Four types carry their own cadence
besides: runbooks re-verify on every execution, changelogs update every release, RCAs follow the
incident process, and team process pages are at the owning team's discretion.

A type not listed here is routed with the [decision rule](./index.md#decision-rule) and then added,
by PR, to the group matching its home. If the rule does not route it cleanly, that is a bug in this
standard: propose the fix and the new row in the same PR.

## In the repo

| Documentation type                                                                                           | Home                                                                                      | Format                                             |
| ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Component docs: what one library, crate, or feature does and how to use it                                   | `README.md` (or the component's `docs/`) next to the code                                 | [Component documentation][component-docs]          |
| Guides spanning multiple components in one repo                                                              | `docs/` or README at the components' lowest common ancestor                               | [Component documentation][component-docs]          |
| Architecture of one repo                                                                                     | The owning scope's `docs/` or README                                                      | [Component documentation][component-docs]          |
| Repo overview, build entry point                                                                             | Root `README.md`                                                                          | The [bitwarden/template][template] README skeleton |
| New-repo doc scaffolding (README skeleton, CONTRIBUTING pointer, `.claude/`)                                 | [bitwarden/template][template]                                                            | —                                                  |
| Repo-specific code style overrides (coupled to lint/formatter config)                                        | Repo `docs/`, linking the org baseline                                                    | —                                                  |
| API / SDK reference                                                                                          | Doc comments in source                                                                    | [Component documentation][component-docs]          |
| UI component library usage docs (audience: developers **and** designers)                                     | `.mdx` colocated with the UI component, rendered at [components.bitwarden.com][storybook] | Storybook `autodocs`                               |
| Changelog for a published artifact                                                                           | `CHANGELOG.md` next to the artifact                                                       | Ecosystem convention                               |
| Platform-mandated files (`SECURITY.md`, `.github` templates, `CODEOWNERS`, registry READMEs, store metadata) | Path fixed by the platform                                                                | Platform-defined                                   |
| Legal, licensing, and trademark notices                                                                      | Repo root                                                                                 | —                                                  |

## On contributing.bitwarden.com

| Documentation type                                                   | Home                                                             | Format                                 |
| -------------------------------------------------------------------- | ---------------------------------------------------------------- | -------------------------------------- |
| Contribution how-to, environment setup, org-wide code style          | contributing.bitwarden.com › Contributing                        | —                                      |
| Org-wide engineering standards (this standard, AI review guidelines) | contributing.bitwarden.com › Contributing                        | —                                      |
| Architecture decision records                                        | [contributing.bitwarden.com › Architecture › ADRs][adr-index]    | Template on the [ADR index][adr-index] |
| Architecture spanning repos                                          | contributing.bitwarden.com › Architecture                        | —                                      |
| Deep dives (cross-repo or conceptual)                                | contributing.bitwarden.com › Architecture › Deep Dives           | —                                      |
| Security principles & requirements                                   | [contributing.bitwarden.com › Architecture › Security][security] | —                                      |

## In private locations

| Documentation type                                                                                            | Home                                                                                                                               | Format                                                                                                        |
| ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Runbooks, on-call, operational docs                                                                           | Confluence, owning **team** space                                                                                                  | <Bitwarden>[Runbook template][runbook-template]</Bitwarden><Community>Runbook template (internal)</Community> |
| Incident post-mortems / RCAs                                                                                  | incident.io → Confluence export (IP space only)                                                                                    | incident.io process                                                                                           |
| Infrastructure and deployment architecture                                                                    | Confluence, owning team space                                                                                                      | —                                                                                                             |
| Production change records                                                                                     | Confluence, owning team space                                                                                                      | —                                                                                                             |
| Team & org process: planning, assessments, investigations, onboarding and hiring, directories, working groups | Confluence team space                                                                                                              | —                                                                                                             |
| Tech breakdowns / work specifications                                                                         | <Bitwarden>[bitwarden/tech-breakdowns][tech-breakdowns]</Bitwarden><Community>bitwarden/tech-breakdowns</Community> (private repo) | —                                                                                                             |

[component-docs]: ./component-documentation.md
[runbook-template]: ./runbook-template.md
[template]: https://github.com/bitwarden/template
[storybook]: https://components.bitwarden.com
[adr-index]: ../../architecture/adr/index.mdx
[security]: ../../architecture/security/index.mdx
[tech-breakdowns]: https://github.com/bitwarden/tech-breakdowns
