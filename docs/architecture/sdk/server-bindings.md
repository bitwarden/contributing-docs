# Server Bindings

The SDK currently uses auto-generated bindings for the server. The bindings are generated using the
[`openapi-generator`][openapi] to generate the Rust bindings from the server OpenAPI specifications.
These bindings are regularly updated to ensure they stay in sync with the server.

The bindings are exposed as multiple crates, one for each backend service:

- `bitwarden-api-api`: For the `Api` service that contains most of the server side functionality.
- `bitwarden-api-identity`: For the `Identity` service that is used for authentication.

When performing any API calls the goal is to use the generated bindings as much as possible. This
ensures any changes to the server are accurately reflected in the SDK. The generated bindings are
stateless, and always expects to be provided a `Configuration` instance. The SDK exposes these under
the `get_api_configurations` function on the `Client` struct. `get_api_configurations` also
refreshes the authentication token if required.

```rust
// Example API call
let config: &ApiConfigurations = client.get_api_configurations().await;
let response: SyncResponseModel =
    bitwarden_api_api::apis::sync_api::sync_get(&config.api, exclude_subdomains).await?;
```

You _should not_ expose the request and response models of the auto generated bindings and _should_
instead define and use your own models. This ensures the server request / response models are
decoupled from the SDK models, which allows for easier changes in the future without breaking
backwards compatibility.

We recommend using either the [`From`][from] or [`TryFrom`][tryfrom] [conversion traits][conversion]
depending on if the conversion requires error handling or not. Below are two examples of how this
can be done:

```rust
impl TryFrom<bitwarden_api_api::models::CipherLoginUriModel> for LoginUri {
    type Error = Error;

    fn try_from(uri: bitwarden_api_api::models::CipherLoginUriModel) -> Result<Self> {
        Ok(Self {
            uri: EncString::try_from_optional(uri.uri)?,
            r#match: uri.r#match.map(|m| m.into()),
            uri_checksum: EncString::try_from_optional(uri.uri_checksum)?,
        })
    }
}

impl From<bitwarden_api_api::models::UriMatchType> for UriMatchType {
    fn from(value: bitwarden_api_api::models::UriMatchType) -> Self {
        match value {
            bitwarden_api_api::models::UriMatchType::Domain => Self::Domain,
            bitwarden_api_api::models::UriMatchType::Host => Self::Host,
            bitwarden_api_api::models::UriMatchType::StartsWith => Self::StartsWith,
            bitwarden_api_api::models::UriMatchType::Exact => Self::Exact,
            bitwarden_api_api::models::UriMatchType::RegularExpression => Self::RegularExpression,
            bitwarden_api_api::models::UriMatchType::Never => Self::Never,
        }
    }
}
```

[openapi]: https://github.com/OpenAPITools/openapi-generator
[from]: https://doc.rust-lang.org/std/convert/trait.From.html
[tryfrom]: https://doc.rust-lang.org/std/convert/trait.TryFrom.html
[conversion]: https://doc.rust-lang.org/std/convert/index.html
