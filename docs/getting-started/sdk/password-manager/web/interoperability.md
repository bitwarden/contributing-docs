# Interoperability

One of the key challenges when working with the SDK is handling Rust/JavaScript bindings to enable
smooth interactions between the two languages. In our project, we use both `wasm-bindgen` and
`tsify` to bridge this gap and make it easier for JavaScript to work with Rust code. Both tools play
a crucial role in enabling communication between Rust and JavaScript, but it's important to
understand when to use each one, as they serve distinct purposes.

## `wasm-bindgen` vs. `tsify`

:::tip

**In short:** Use `tsify` unless the web-side needs to call functions or interact with Rust objects
directly, in which case, use `wasm-bindgen`.

:::

At first glance, `wasm-bindgen` and `tsify` might seem very similar. They both generate TypeScript
definitions, and they both allow JavaScript to interact with Rust data. For developers just getting
started, it might appear that either tool could handle all your needs. However, while both provide a
way to bridge the two ecosystems, they achieve this in different ways and for different use cases.

`wasm-bindgen` focuses on generating WebAssembly bindings, allowing JavaScript to directly call Rust
functions and manipulate Rust objects. It works well for exposing Rust APIs to JavaScript but
supports only basic primitive types, and doesn't handle more complex data types like enums with
values.

On the other hand, `tsify` leverages Rust's `serde` ecosystem to expose Rust data models to
JavaScript and provide TypeScript bindings. It works by serializing Rust data structures before
passing them to JavaScript, allowing JavaScript to work with them as typed objects. This differs
from `wasm-bindgen`, which instead allows JavaScript to interact directly with Rust-owned structures
in memory. Because `tsify` can handle more complex types, it's often the better choice for
structured data exchange, especially when working with Rust crates that already support `serde`.

## Examples

### How to use `tsify`

To create types that can be used in both Rust and JavaScript using `tsify` you first need to derive
`Serialize` and `Deserialize` from the `serde` crate since `tsify` relies on `serde` for
serialization. After that you can add the `TSify` derive from the `tsify` crate.

```rust
use serde::{Deserialize, Serialize};
#[cfg(feature = "wasm")]
use {tsify_next::Tsify, wasm_bindgen::prelude::*};

#[derive(Serialize, Deserialize)]
#[cfg_attr(feature = "wasm", derive(Tsify), tsify(into_wasm_abi, from_wasm_abi))]
pub struct User {
    pub name: String,
    pub age: u32,
    pub address: Address,
}

#[derive(Serialize, Deserialize)]
#[cfg_attr(feature = "wasm", derive(Tsify), tsify(into_wasm_abi, from_wasm_abi))]
pub struct Address {
    pub street: String,
    pub city: String,
}
```

This struct will now generate TypeScript types and can be returned from Rust functions to JavaScript
using `wasm-bindgen`:

```rust
#[wasm_bindgen]
pub fn get_user() -> User {
    User {
        name: "Alice".to_string(),
        age: 30,
        address: Address {
            street: "1234 Elm St".to_string(),
            city: "Springfield".to_string(),
        },
    }
}
```

The fields in a `tsify` struct can be any type that can be serialized and deserialized by `serde`.
This includes external types from other crates:

```rust
use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use uuid::Uuid;

#[derive(Serialize, Deserialize)]
#[cfg_attr(feature = "wasm", derive(Tsify), tsify(into_wasm_abi, from_wasm_abi))]
pub struct FolderView {
    pub id: Option<Uuid>,
    pub name: String,
    pub revision_date: DateTime<Utc>,
}
```

The downside to using a type that only derives `serde` and does not have derive `tsify` is that it
will not automatically generate TypeScript types. For example, the above `FolderView` struct will
generate the following TypeScript type:

```typescript
// bitwarden_wasm_internal_.d.ts

export interface FolderView {
  id: Uuid | undefined;
  name: string;
  revisionDate: DateTime<Utc>;
}
```

This does not match the JavaScript object that is returned from Rust in which the `id` and
`revisionDate` is converted into strings. To fix this, external types that are not derived from
`tsify` need to be manually added to the TypeScript definitions. This is done by updating
`bitwarden-wasm-internal/src/custom_types.rs`, for example:

```rust
// custom_types.rs
#[wasm_bindgen::prelude::wasm_bindgen(typescript_custom_section)]
const TS_CUSTOM_TYPES: &'static str = r#"
export type Uuid = string;

/**
 * RFC3339 compliant date-time string.
 * @typeParam T - Not used in JavaScript.
 */
export type DateTime<T = unknown> = string;

/**
 * UTC date-time string. Not used in JavaScript.
 */
export type Utc = unknown;
"#;

```

## How to use `wasm-bindgen`

WIP
