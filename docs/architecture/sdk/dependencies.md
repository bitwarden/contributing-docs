# Dependencies

The SDK is structured as several standalone crates. Each crate can have their own dependencies and
versions of dependencies. It's worth reading the [Dependency Resolution][dep-res] article in the
Cargo Book to better understand how dependencies are resolved in Rust.

## Avoid adding dependencies

The SDK takes a conservative approach to adding dependencies. The number of direct and indirect
dependencies you have are directly related to the time it takes for a clean build. Dependencies also
permanently increase the base maintenance cost of the project as they require frequent updates to
keep up with security patches and new features.

To that effort we **must** be conservative with adding dependencies. And we ask that you consider
the following when evaluating a new dependency:

- Do we already have a dependency or transient dependency that does the same thing? If so we
  _should_ use that instead.
- How complex is the desired functionality?
  - How much time would it take to implement the functionality yourself?
  - Is it likely to change?
- How much of the dependency will we be using?
  - Are you only using a small part of the dependency?
  - Are you using the dependency in a way that is not intended?
- How well maintained is the dependency?
  - How often are new versions released?
  - How many open issues does the dependency have?
- Audit the dependency tree.
  - How many dependencies does the dependency have?
  - How many of those dependencies are we already using?

If we only ever need a small fraction of the functionality we should consider implementing it
ourselves.

## Dependency ranges

For any library we always use ranges for dependencies. This allows other crates to depend on the the
SDK without requiring the exact same versions. The Cargo lockfile ensures dependencies are
consistent between builds.

### Explicit ranges

We use explicit ranges for dependencies, i.e. we specify the minimum and maximum version of a
dependency. This helps avoiding confusion around how Cargo expands implicit versions.

```toml
# Bad
serde = "1.0.0"
serde = "1"
serde = ">1"

# Good
serde = ">1.0, <2.0"
```

## Workspace dependencies

To provide a more developer-friendly experience for managing dependencies we define commonly used
dependencies in our workspace `Cargo.toml`. This allow us to update dependencies across the
workspace by modifying a single file.

Internal dependencies i.e. dependencies that are part of the same workspace **must** be defined
using workspace definitions.

```toml
# Bad
bitwarden-core = { version = "1.0", path = "../bitwarden-core" }

# Good
bitwarden-core = { workspace = true }
```

dep-res: https://doc.rust-lang.org/cargo/reference/resolver.html
