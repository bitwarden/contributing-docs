---
sidebar_position: 3
---

# Client patterns

Clients group the SDK API surface into domain-specific bundles. Each client struct uses
`#[derive(FromClient)]` to pull its dependencies from the SDK `Client` and is wired into an
application interface via an extension trait. For a walkthrough of defining a client, implementing
methods, and connecting it to the application interface, see
[Adding new functionality](adding-functionality.md).

This page covers how to **organize the files** within a client, depending on the size of the domain.

## Single file

Define the client struct, its initialization, and all method `impl` blocks in one file. This
minimizes indirection and keeps related code easy to discover. Prefer this structure when the file
is manageable in size (~500 lines, including tests).

```
domain_client.rs
├── DomainClient struct definition and initialization
└── impl DomainClient with full method implementations and tests
```

## Per-method files or subdirectories

When the single file would otherwise become unwieldy (~500 lines, including tests), the client
definition should be split from individual method implementations.

Define the client struct in one file and each method in either its own file or its own subdirectory,
depending on the implementation complexity.

When each method is self-contained and does not require supporting types alongside it, individual
methods can be split into separate files.

```
domain/
├── domain_client.rs     # DomainClient struct definition and initialization
├── mod.rs
├── method_name.rs       # impl DomainClient { fn method_name() } and tests
└── other_method.rs      # impl DomainClient { fn other_method() } and tests
```

For more complex clients, subdirectories can be used to contain the `impl DomainClient` block for
that method, its tests, and any supporting types.

```
domain/
├── domain_client.rs         # DomainClient struct definition and initialization
├── mod.rs
└── method_name/
    ├── mod.rs
    ├── method_name.rs  # impl DomainClient { fn method_name() } and tests
    └── request.rs           # supporting types (errors, etc.)
```

:::warning

Avoid the thin passthrough pattern, where the client delegates to free functions defined elsewhere.
This creates unnecessary indirection and splits documentation away from the API surface.

```rust
  impl LoginClient {
      // Avoid delegating the entire implementation to another function like this.
      pub async fn login_with_password(&self, data: LoginData) -> Result<()> {
          login_with_password(self.client, data).await
      }
  }
```

:::
