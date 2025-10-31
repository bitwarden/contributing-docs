---
sidebar_position: 3
---

# SDK Architecture

Bitwarden provides a public Software Development Kit (SDK) for [Secrets Manager][sm] and an internal
SDK for the Bitwarden [Password Manager][pm]. The SDK is written in Rust and provides bindings for
multiple languages. The general end goal of the SDK is to own everything up to the presentational
layers. This includes but is not limited to: API calls, data models, encryption, and business logic.

<Bitwarden>We have compiled a list of resources for learning Rust in a
[Confluence page](https://bitwarden.atlassian.net/wiki/spaces/DEV/pages/517898288/Rust+Learning+Resources).</Bitwarden>
For API documentation view the latest
[API documentation](https://sdk-api-docs.bitwarden.com/bitwarden/index.html) that also includes
internal private items.

[sm]: https://bitwarden.com/products/secrets-manager/
[pm]: https://bitwarden.com/
