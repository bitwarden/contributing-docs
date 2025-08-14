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

Avoid starting documentation with `This module`, `This function`, `This field` or similar phrases.
The context will be inferred implicitly by the reader. Instead, focus on describing the purpose and
behavior of the item directly.

When possible document from the consumer's perspective. This helps ensure that the documentation is
relevant and useful to those who will be using the code.

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

#### Arguments

We avoid documenting function arguments since rust does not have a good convention for doing so.
Instead focus on using well descriptive names of the arguments. In case you feel that a comment
would be helpful because the variables can be confused with each other, another technique is to
extract the arguments into a separate struct to improve clarity and enforce type safety.

```rust
// Good

/// Sums two arguments.
fn sum_arguments(arg1: i32, arg2: i32) -> i32 {
    arg1 + arg2
}

// Bad

/// Sums two arguments
///
/// # Arguments
///
/// * `x` - The first argument.
/// * `y` - The second argument.
///
/// # Returns
///
/// Returns the sum of the arguments.
fn do_something(arg1: i32, arg2: i32) -> i32 {
    arg1 + arg2
}
```

#### Returns

Similar to arguments, do not document returns, if you find the return value can be mistaken or
misused consider using the _NewType_ pattern.

## Avoid panics

Panics are highly discouraged in the Bitwarden codebase outside of tests. Errors should be handled
gracefully and returned to the caller. `clippy` will forbid you from using `unwrap`. While `expect`
is allowed, it should be used sparingly and should always provide a helpful message indicating why
it can never occur.

Some scenarios where `expect` are allowed are:

- Calling libraries that guarantee that the allowed inputs never results in `Err` or `None`.
- Operating on slices or arrays where the index is guaranteed to be within bounds.

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
