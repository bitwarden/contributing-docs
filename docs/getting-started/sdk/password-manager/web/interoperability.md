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

WIP
