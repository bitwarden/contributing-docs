---
sidebar_position: 1
---

# Component documentation

**Audience:** Bitwarden engineers and AI agents writing or consuming in-repo documentation.

Notation follows the [documentation standard's Notation](./index.md#notation). These requirements
hold for every repo for as long as it lives, enforced by review and the doc-currency plugin. New
repositories satisfy them at initialization by starting from
[bitwarden/template](https://github.com/bitwarden/template). Existing repos converge per
[Changes to this standard](./index.md#changes-to-this-standard). Additional local guidance MAY be
layered on top, as each situation dictates.

Any component that other engineers or agents consume (that is, it exposes a public interface) MUST
have an **entry point for its scope's documentation**, at every scope from a single component to the
repo root. The entry point lives where the component's ecosystem surfaces documentation:

- At **component scope**, the entry point is the `README.md`, which registries render for packaged
  components (a crate, an npm package, a NuGet project). Rust crates keep the README and the rustdoc
  landing page one artifact with `#![doc = include_str!("../README.md")]`.
- **Below component scope**, the entry point is the language's module-level documentation where it
  exists (`//!` in Rust), since a README there duplicates what the toolchain already owns and no
  tooling surfaces it. It SHOULD be lint-enforced where the language supports it (Rust's
  `missing_docs`).
- At **container and system scopes** (a container grouping several components, the repo root), the
  entry point is a `README.md`, since no language ecosystem claims them.

Whatever its carrier, the entry point MUST contain:

1. **Purpose:** what problem this component solves, in 1–3 sentences.
2. **Key concepts:** the domain model or invariants a consumer must know (e.g., `libs/state`'s
   data-loss warning on key renames; `bitwarden-crypto`'s `derive_`/`make_` naming rules).
3. **Usage:** the primary entry points, with a short code sample where the API is not self-evident.
4. **Gotchas / constraints:** the things that bite people (e.g., `libs/auth`'s "do not add new code
   here" notice). This section MUST exist when such constraints do and MUST NOT exist when they do
   not.

Documentation grows outward from the entry point of the
[lowest common ancestor](./index.md#where-documentation-lives-rules-1-2) of the code it describes. A
guide spanning several components therefore belongs to their parent scope:

1. Everything starts at the scope's entry point.
2. A single topic that deserves its own document becomes a named `.md` next to the code it
   describes, linked from the entry point (`apps/browser/src/autofill/lifecycle.design.md` is the
   exemplar).
3. When the scope's documentation outgrows this, it splits into a `docs/` folder (exactly that name,
   lowercase) at the scope root. `docs/` exists only beside the entry point it extends: at the repo
   root (`clients/docs/cipher-types.md` is the exemplar) or a component with its own entry point
   (`util/Seeder/Seeds/docs/`), never an arbitrary subdirectory.

Scopes layer and multiple perspectives exist. A parent scope's documentation MAY describe the same
code at a higher altitude, sanding off detail the deeper docs own and linking down to them, and the
same subject MAY be documented separately per audience. Both are approved. Duplication is two
artifacts sharing one perspective.

Below component scope, reference documentation is code: doc comments on public symbols, reviewed and
merged with functionality, lint-enforced where the platform supports it. Doc comments MUST follow
the language's documentation norms for structure and detail. Where not enforced by the type system,
doc comments MUST say what a caller needs (behavior, invariants, error cases). Repos with doc CI
SHOULD fail the build on broken docs (the `sdk-internal` `cargo doc -D warnings` pattern).
