---
sidebar_position: 3
---

# Client patterns

Clients group the SDK API surface into domain-specific bundles. For a step-by-step walkthrough of
creating a client from scratch and wiring it into the application interface, see
[Adding new functionality](adding-functionality.md).

## `FromClient` and dependency injection

Every client struct declares its dependencies as fields and derives `FromClient` to have them
automatically populated from the SDK `Client`. The macro generates a `from_client` method that
extracts each field using the `FromClientPart` trait — client structs never call `Client` methods
directly to obtain their dependencies.

```rust
#[derive(FromClient)]
pub struct FoldersClient {
    pub(crate) key_store: KeyStore<KeyIds>,
    pub(crate) api_configurations: Arc<ApiConfigurations>,
    pub(crate) repository: Option<Arc<dyn Repository<Folder>>>,
}
```

Some of the available dependency types that can be extracted are:

- `KeyStore<KeyIds>` — access to the cryptographic key store
- `Arc<ApiConfigurations>` — HTTP API client configuration
- `Option<Arc<dyn Repository<T>>>` — state repository for a given domain type

This design also makes clients straightforward to test: because dependencies are plain struct
fields, tests can construct clients directly with test doubles instead of spinning up a full SDK
`Client`. See [Testing](#testing) below.

### WASM support

If the client will be exposed over WASM, annotate both the struct and its `impl` blocks with:

```rust
#[cfg_attr(feature = "wasm", wasm_bindgen)]
```

## Extension traits

Feature crates connect to the SDK `Client` through extension traits. This keeps feature code
decoupled from `Client` — the trait is defined in the feature crate, not in `bitwarden-core`.

```rust
pub trait VaultClientExt {
    fn vault(&self) -> VaultClient;
}

impl VaultClientExt for Client {
    fn vault(&self) -> VaultClient {
        VaultClient::new(self.clone())
    }
}
```

The application interface (e.g. `PasswordManagerClient`) imports the extension trait and calls it to
expose the feature to consumers.

## File organization

Start with everything in a single file. Split when the file grows past ~500 lines (including tests).

### Single file

Define the client struct, its initialization, and all method `impl` blocks including tests in one
file. This minimizes indirection and keeps related code easy to discover. Prefer this for smaller
domains.

```
domain_client.rs
├── DomainClient struct definition
└── impl DomainClient { methods and tests }
```

### Per-method files or subdirectories

When the single file becomes unwieldy, keep the client struct in its own file and give each method
its own file. Each file contains the `impl DomainClient` block for that method, its DTOs, error
types, and its tests.

```
domain/
├── domain_client.rs     # DomainClient struct definition and initialization
├── mod.rs
├── method_name.rs       # impl DomainClient { fn method_name() } + tests
└── other_method.rs      # impl DomainClient { fn other_method() } + tests
```

If a method needs many or large supporting types (request/response structs, error enums), promote it
to a subdirectory:

```
domain/
├── domain_client.rs     # DomainClient struct definition and initialization
├── mod.rs
└── method_name/
    ├── mod.rs           # impl DomainClient { fn method_name() } + tests
    └── request.rs       # supporting types
```

:::warning Anti-pattern: thin passthroughs

Do not delegate method bodies to free functions. This splits the implementation away from the API
surface, makes the client harder to navigate, and obscures what the method actually does in
generated documentation.

```rust
impl LoginClient {
    // Bad — the real logic lives somewhere else.
    pub async fn login_with_password(&self, data: LoginData) -> Result<()> {
        login_with_password(self.client, data).await
    }
}
```

Instead, implement the logic directly in the method body.

:::

## Testing

Because client structs declare their dependencies as fields, they can be constructed directly in
tests without spinning up a full SDK `Client`. Inject test doubles for each dependency to isolate
the code under test.

```rust
fn create_test_client() -> FoldersClient {
    let key_store =
        create_test_crypto_with_user_key(SymmetricCryptoKey::make_aes256_cbc_hmac_key());
    let repository = Arc::new(MemoryRepository::<Folder>::default());

    FoldersClient {
        key_store,
        api_configurations: Arc::new(ApiConfigurations::from_api_client(
            ApiClient::new_mocked(|_| {}),
        )),
        repository: Some(repository),
    }
}
```

Key points:

- **Key store** — use `create_test_crypto_with_user_key` to set up a key store with a test key.
- **API configurations** — use `ApiClient::new_mocked` to create a mock HTTP client. The closure
  receives requests and can return custom responses.
- **Repositories** — use `MemoryRepository` as an in-memory test double for state repositories.
  Populate it with test data before exercising the client method.

### Writing test cases

Each public client method should have tests that cover the expected behavior and important error
paths. Construct the client, set up any required state, call the method, and assert the result.

```rust
#[tokio::test]
async fn test_get_folder() {
    let client = create_test_client();
    let folder_id = FolderId::new(uuid!("25afb11c-9c95-4db5-8bac-c21cb204a3f1"));

    // Populate the repository with test data
    let folder = client.key_store.encrypt(FolderView {
        id: Some(folder_id),
        name: "Test Folder".to_string(),
        revision_date: "2025-01-01T00:00:00Z".parse().unwrap(),
    }).unwrap();

    client.repository.as_ref().unwrap()
        .set(folder_id, folder).await.unwrap();

    // Exercise the method and verify
    let result = client.get(folder_id).await.unwrap();
    assert_eq!(result.name, "Test Folder");
}

#[tokio::test]
async fn test_get_folder_not_found() {
    let client = create_test_client();
    let folder_id = FolderId::new(uuid!("25afb11c-9c95-4db5-8bac-c21cb204a3f1"));

    let result = client.get(folder_id).await;
    assert!(matches!(result.unwrap_err(), GetFolderError::ItemNotFound(_)));
}
```
