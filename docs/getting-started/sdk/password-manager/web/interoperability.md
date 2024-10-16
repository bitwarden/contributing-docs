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

## How to use `wasm-bindgen`

### Basic functions

To create functions that can be called from JavaScript using `wasm-bindgen` you need to add the
`wasm_bindgen` attribute to a function and return a type that can be converted to a JavaScript type.
Primitive types like `u32`, `f64`, `bool`, and `String` can be returned directly:

```rust
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn do_something() -> u32 {
    42
}

#[wasm_bindgen]
pub fn say_hello() -> String {
    "Hello, World!".to_owned()
}
```

This will generate the following TypeScript definitions:

```typescript
/**
 * @returns {number}
 */
export function do_something(): number;
/**
 * @returns {string}
 */
export function say_hello(): string;
```

### Structs

If you want to return a more complex type, you can add the `wasm_bindgen` attribute which will
automatically implement all the necessary conversion traits. Make sure to make the field public, or
it won't be accessible from JavaScript:

```rust
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct User {
    pub age: u32,
}
```

This will generate the following TypeScript definitions:

```typescript
export class User {
  free(): void;
  age: number;
}
```

If your struct contains `String` or other types that are not `Copy`, you can use
`getter_with_clone`:

```rust
use wasm_bindgen::prelude::*;

#[wasm_bindgen(getter_with_clone)]
pub struct User {
    pub name: String,
    pub age: u32,
}
```

This will generate the following TypeScript definitions:

```typescript
export class User {
  free(): void;
  age: number;
  name: string;
}
```

This is required because `wasm-bindgen` does not support JavaScript directly accessing types that
are not `Copy`. The `getter_with_clone` attribute will generate a getter-function that clones and
returns the value when it is accessed from JavaScript.

### Structs with functions

These two approaches can also be combined to return a type with functions:

```rust
use wasm_bindgen::prelude::*;

#[wasm_bindgen(getter_with_clone)]
pub struct User {
    pub name: String,
    pub age: u32,
}

#[wasm_bindgen]
impl User {
    pub fn say_hello(&self) -> String {
        format!("Hello, {}!", self.name)
    }
}
```

This will generate the following TypeScript definitions:

```typescript
export class User {
  free(): void;
  /**
   * @returns {string}
   */
  say_hello(): string;
  age: number;
  name: string;
}
```

## How to use `tsify`

While `wasm-bindgen` is great for exposing Rust functions and basic types to JavaScript, `tsify` is
better suited for exposing complex Rust data models to JavaScript. The following section also
includes examples of how to use a feature called `wasm` to toggle compilation of WebAssembly
support. This is useful because these types are usually shared between the web and mobile clients
which use different mechanisms for interacting with Rust.

### Basic types

To return a struct from Rust to JavaScript using `tsify` you need to derive `Serialize`,
`Deserialize` and `tsify`:

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

The struct will now generate TypeScript types and can be returned from Rust functions to JavaScript
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

This will generate the following TypeScript definitions:

```typescript
export interface User {
  name: string;
  age: number;
  address: Address;
}

export interface Address {
  street: string;
  city: string;
}

/**
 * @returns {User}
 */
export function get_user(): User;
```

Note the difference between `wasm-bindgen` and `tsify` in how they handle structs. `wasm-bindgen`
generates a class with a `free` method, while `tsify` generates an interface. The class generated by
`wasm-bindgen` is a reference to a Rust object stored in WebAssembly memory, while an interface
generated by `tsify` is just a plain JavaScript object owned by JavaScript. Note that the `free`
method does not need to be called manually, `wasm-bindgen` will automatically free the memory when
the object is no longer used.

### External types

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
only generate the following TypeScript definitions:

```typescript
export interface FolderView {
  id: Uuid | undefined;
  name: string;
  revisionDate: DateTime<Utc>;
}
```

This does not match the JavaScript object that is returned from Rust in which the `id` and
`revisionDate` fields will be converted into strings. To fix this, external types that do not derive
`tsify` need to be manually added to the TypeScript definitions. This is done in
`bitwarden-wasm-internal/src/custom_types.rs`, for example:

```rust
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
