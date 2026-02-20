---
toc_min_heading_level: 2
toc_max_heading_level: 5
---

# Rust

We use `rustfmt` to format our code. This tool is part of the Rust toolchain and will format your
code according to the Rust style guide. We also use `clippy` to catch common mistakes and improve
the quality of our code.

This document covers some additional guidelines that are not enforced by `rustfmt` or `clippy`. And
will generally allow you to write more idiomatic Rust code.

## Documentation

We strictly enforce documentation of all public items using the `missing_docs` linting rule. This
helps ensure that our code is well-documented and easy to understand. In rare cases where
documentation is unhelpful or simply duplicates enum variants, it may be omitted using
`#[allow(missing_docs)]` but you should have a valid reason.

Rust is generally quite unopinionated in how you document your code. This can result in many
different documentation styles which can negatively impact readability and maintainability. We
therefore have some guidelines and suggestions for documenting your code. These should not be seen
as strict rules but rather as best practices to follow in our codebases.

### General guidelines

- Avoid starting documentation with `This module`, `This function`, `This field` or similar phrases.
  The context will be inferred implicitly by the reader. Instead, focus on describing the purpose
  and behavior of the item directly.

- When possible document from the consumer's perspective. This helps ensure that the documentation
  is relevant and useful to those who will be using the code.

- If you find yourself having to deeply explain the code in doc comments or code comments, it could
  be a hint to re-evaluate the design.

- Library code (code consumed in multiple places) should be properly documented with `///` comments.
  For example `pub trait` definitions.

### Documenting Examples

Rust has built in support for including
[code blocks in documentation](https://doc.rust-lang.org/rustdoc/write-documentation/what-to-include.html#examples).
This can be useful when you want to include suggested usage examples or other relevant code
snippets. As a bonus rust generally executes the code blocks in the documentation to ensure they are
correct.

### Modules

We encourage you to document modules, including their purpose and any important details about their
contents. This helps other developers understand the context and functionality of the module. When
documenting modules use the `//!` syntax to write documentation comments at the top of the file.

```rust
// crates/bitwarden-crypto/src/aes.rs

//! # AES operations
//!
//! Contains low level AES operations used by the rest of the library.
//!
//! In most cases you should use the [EncString][crate::EncString] with
//! [KeyEncryptable][crate::KeyEncryptable] & [KeyDecryptable][crate::KeyDecryptable] instead.
```

### Functions

Please ensure functions and their arguments have descriptive names. It's often better to use longer
names that convey more meaning if it improves clarity.

Helper functions (not pub) are often self documenting, and generally do not warrant a doc comment.

```rust
fn sum_positive_integers(uint_a: u32, uint_b: u32) -> u32 {
    uint_a + uint_b
}
```

#### Arguments

Avoid documenting function arguments when descriptive names and strict types are sufficient. For
example rather than using `i32` for a positive integer, use `u32`. If the value should never be 0
use `NonZeroU32`. The [NewType](#newtype) pattern can be useful here in case there is no built in
representation of the type.

If you still sense that explicit argument documentation would be helpful, this could be a hint to
extract the arguments into a separate struct to improve clarity and enforce type safety.

Let's say `sum_positive_integers()` is now a library function in our utils module.

```rust
// Good

/// Returns the sum of two positive integers.
pub fn sum_positive_integers(uint_a: u32, uint_b: u32) -> u32 {
    uint_a + uint_b
}

// Bad

/// Sums two arguments.
///
/// # Arguments
///
/// * `a` - The first positive integer
/// * `b` - The second positive argument.
///
/// # Returns
///
/// Returns the sum of the arguments.
pub fn sum(a: u32, b: u32) -> u32 {
    a + b
}
```

#### Returns

Similar to arguments, do not document returns. If you find the return value can be mistaken or
misused consider using the [NewType](#newtype) pattern.

## Avoid panics

Panics are highly discouraged in the Bitwarden codebase outside of tests. Errors should be handled
gracefully and returned to the caller. `clippy` will forbid you from using `unwrap()`. While
`expect()` is allowed, it should be used sparingly and should always provide a helpful message
indicating why it should never occur. Ideally this message is worded to reflect _what_ expectation
was violated. This provides highly readable code and crash logs. For example:

```rust
let some_object = self.shared_object.lock().expect("Mutex not to be poisoned.");
```

Scenarios where `expect()` is allowed are:

- Calling libraries that guarantee that the allowed inputs never results in `Err` or `None`.
- Operating on slices or arrays where the index is guaranteed to be within bounds.
- Acquiring a Mutex. The `Err` case occurs when another thread panicked while holding the lock
  (which is a poisoned mutex). Generally this means we don't want to proceed with the runtime.
  `unwrap_or_else()` can alternatively be used if protections from mutex poisoning is necessary.

## Pattern matching

Rust provides a powerful pattern matching system that can be used for a variety of tasks. However,
care should be taken to not rely overly on `match` statements. In many cases there are more concise
and readable alternatives especially when working with `Option` and `Result`.

### if let

Use [`if let`](https://doc.rust-lang.org/rust-by-example/flow_control/if_let.html) when you only
care about one arm of a match.

```rust
// Bad
match result {
  Ok(value) => outer.append(value),
  _ => (),
}

// Good
if let Ok(value) = result {
  outer.append(value);
}
```

### Options

We use `clippy` to enforce general guidelines for working with
[`Option`](https://doc.rust-lang.org/std/option/enum.Option.html). Generally reach for methods like:

#### map

Use [`map`](https://doc.rust-lang.org/std/option/enum.Option.html#method.map) when you want to
transform the value inside the `Option`.

```rust
// Bad
match Some(0) {
  Some(x) => Some(x + 1),
  None => None,
};

// Good
Some(0).map(|x| x + 1);
```

#### and_then

Use [`and_then`](https://doc.rust-lang.org/std/option/enum.Option.html#method.and_then) when you
want to chain multiple operations that return an `Option`.

```rust
func(x: i32) -> Option<i32>;

// Bad
match Some(0) {
  Some(x) => func(x + 1),
  None => None,
};

// Good
Some(0).and_then(|x| func(x + 1));
```

#### unwrap_or

Use [`unwrap_or`](https://doc.rust-lang.org/std/option/enum.Option.html#method.unwrap_or) when you
want to provide a default value.

```rust
// Bad
match Some(0) {
  Some(x) => x,
  None => 1,
};

// Good
Some(0).unwrap_or(1);
```

#### ok_or

Use [`ok_or`](https://doc.rust-lang.org/std/option/enum.Option.html#method.ok_or) when you want to
convert an `Option` to a `Result`.

```rust
// Bad
match Some(0) {
  Some(x) => x,
  None => Err("error"),
};

// Good
foo.ok_or("error");
```

### Results

When working with [`Result`](https://doc.rust-lang.org/std/result/enum.Result.html) it might be
tempting to use match to get the value out of the result. Instead, use the `?` operator to propagate
the error.

#### map_err

Use [`map_err`](https://doc.rust-lang.org/std/result/enum.Result.html#method.map_err) when you want
to transform the error inside the `Result`.

```rust
// Bad
match result {
  Ok(value) => value,
  Err(_) => return Err("Another error"),
}

// Good
do_something().map_err(|e| "Another error")?
```

## NewType

The _NewType_ pattern is a way to create a distinct type that wraps a value of another type. This is
useful for providing additional type safety and clarity in your code. For an in-depth introduction
to the NewType pattern please read the
[Rust Book](https://doc.rust-lang.org/book/ch20-03-advanced-types.html#using-the-newtype-pattern-for-type-safety-and-abstraction).

We use _NewType_ extensively throughout the Bitwarden codebase. Some good examples are IDs, which
uses the `uuid!` macro to NewType `UUID` which ensure you can't mix up different types of IDs.

```rust
use bitwarden_uuid::uuid;

uuid!(pub CipherId);
uuid!(pub FolderId);

fn test(folder_id: FolderId) {
  // Use the folder_id here
}

// This is fine
test(FolderId::new())

// Compile error.
test(CipherId::new())
```

The `bitwarden-crypto` crate contains a bunch of other examples, such as `UserKey` which is a
NewType wrapper around `SymmetricCryptoKey`. Which also exposes some additional functionality.
