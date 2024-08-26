# Versioning & Breaking Changes

The SDK strives towards maintaining backward compatibility for a reasonable time. This ensures that
client applications can safely upgrade to newer versions of the SDK without resolving a large number
of breaking changes. For a more in-depth explanation of what constitutes a breaking change in rust,
see the [SemVer Compatibility section](https://doc.rust-lang.org/cargo/reference/semver.html) in
[the Cargo book](https://doc.rust-lang.org/cargo/index.html).

There may be certain functionality that is actively being developed and is not yet stable. In these
cases, they should be marked as such and gated behind a `unstable` feature flag. Consuming client
applications should actively avoid merging these changes into `main`.

To track breaking changes, we use a [changelog file in the `bitwarden` crate][changelog]. This file
should be updated with noteworthy changes for each PR.

[changelog]: https://github.com/bitwarden/sdk/blob/main/crates/bitwarden/CHANGELOG.md
