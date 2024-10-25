# Interoperability

When working with the SDK, one of the key challenges is managing Rust/JavaScript bindings to enable
smooth interactions. In our project, we use both `wasm-bindgen` and `tsify` to bridge this gap and
make it easier for JavaScript to work with Rust code. While both tools facilitate communication
between Rust and JavaScript, they serve distinct purposes, and it's important to understand when to
use each.

## `wasm-bindgen` vs. `tsify`

:::tip

**In short:** Use `tsify` unless the web-side needs to call functions or interact with Rust objects
directly, in which case, use `wasm-bindgen`.

:::

At first glance, `wasm-bindgen` and `tsify` may appear to do similar things. Both generate
TypeScript definitions, and both allow JavaScript to work with Rust data. However, while they share
a common goal, they handle Rust/JavaScript interop in different ways and are suitable for different
use cases.

`wasm-bindgen` focuses on creating WebAssembly bindings that allow JavaScript to directly call Rust
functions and manipulate Rust objects. This works well for exposing APIs and interacting with simple
Rust types like `u32`, `f64`, and `String`. However, `wasm-bindgen` has limitations when it comes to
handling more complex Rust types such as enums with values or deeply nested structures, as these
need additional work to be represented correctly in JavaScript.

On the other hand, `tsify` leverages Rust's `serde` ecosystem to expose Rust data models to
JavaScript and automatically provide TypeScript bindings. It accomplishes this by serializing Rust
data structures into JavaScript objects, allowing them to be treated as native, typed TypesScript
objects. This differs from `wasm-bindgen`, which allows JavaScript to interact directly with
Rust-owned structures in memory. `tsify` is generally better for handling complex data types,
especially when working with Rust crates that already support `serde`.

## Choosing Between `wasm-bindgen` and `tsify`

Here's a quick overview of when to use each tool:

| Tool           | Purpose                                 | Strengths                      | Typical Use Case                                                        |
| -------------- | --------------------------------------- | ------------------------------ | ----------------------------------------------------------------------- |
| `wasm-bindgen` | Expose Rust functions and objects to JS | Direct Rust function calls     | When JavaScript needs to call Rust functions or manipulate Rust objects |
| `tsify`        | Provide TypeScript bindings via `serde` | Handle complex data structures | For exchanging structured data between Rust and JavaScript              |

Use `wasm-bindgen` when you need JavaScript to call into Rust directly or work with live Rust
objects (like a struct or a function in Rust). Otherwise, default to `tsify` for easier handling of
complex types and data exchange.

## How to use `wasm-bindgen`

### Basic functions

To create functions that can be called from JavaScript using `wasm-bindgen`, you need to apply the
`wasm_bindgen` attribute to the function and ensure the return type is something that can be
converted into a JavaScript type. For instance, simple types like `u32`, `f64`, `bool`, and `String`
can be returned directly:

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

If you want to return more complex types, you can annotate a Rust struct with the `wasm_bindgen`
attribute. Make sure that any fields you want to access from JavaScript are public:

```rust
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct User {
    pub age: u32,
}
```

Which generates the following TypeScript definitions:

```typescript
export class User {
  free(): void;
  age: number;
}
```

For structs containing `String` or other types that are not `Copy`, use the `getter_with_clone`
attribute to ensure JavaScript can access the value without directly referencing it in WebAssembly
memory:

```rust
#[wasm_bindgen(getter_with_clone)]
pub struct User {
    pub name: String,
    pub age: u32,
}
```

Which generates the following TypeScript definitions:

```typescript
export class User {
  free(): void;
  age: number;
  name: string;
}
```

This ensures that values like `String` are properly cloned before being passed to JavaScript.

### Structs with Functions

You can also return types with methods:

```rust
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

Which generates the following TypeScript definitions:

```typescript
export class User {
  free(): void;
  say_hello(): string;
  age: number;
  name: string;
}
```

### About the `free` Method

When working with `wasm-bindgen`, you may notice that all generated classes have a `free` method.
This method is used to forcibly free the memory allocated for the Rust object when it is no longer
needed in JavaScript. In most cases you can safely ignore this method, as the memory will be cleaned
up automatically. For more information see
[Support for Weak References](https://rustwasm.github.io/docs/wasm-bindgen/reference/weak-references.html).

## How to use `tsify`

### Basic Types

To return a struct from Rust to JavaScript using `tsify`, derive `Serialize`, `Deserialize`, and
`Tsify`:

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

Which generates TypeScript interfaces for both `User` and `Address`:

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
```

Note how `tsify` creates TypeScript interfaces, whereas `wasm-bindgen` creates classes that
reference Rust objects stored in WebAssembly memory.

### External Types

With `tsify`, fields can be any type that `serde` can serialize or deserialize, including external
types from other crates. For example:

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

Which generates the following TypeScript definitions:

```typescript
export interface FolderView {
  id: Uuid | undefined;
  name: string;
  revisionDate: DateTime<Utc>;
}
```

Note that, while `tsify` does generate TypeScript definitions, external types that don't derive
`tsify` (like `Uuid` or `DateTime<Utc>`) are missing from the definitions. To fix this, external
types need to be manually added to the TypeScript definitions found in
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

This ensures the TypesScript definitions match the serialized Rust structure.
