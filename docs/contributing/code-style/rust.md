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

## Avoid panics

Panics are forbidden in the Bitwarden codebase outside of tests. Errors should be handled gracefully
and returned to the caller. `clippy` will forbid you from using `unwrap`. While `expect` is allowed,
it should be used sparingly and should always provide a helpful message indicating why it can never
occur.

Some scenarios where `expect` are allowed are:

- Calling libraries that guarantee that the allowed inputs never results in Err or None.
- Operating on slices or arrays where the index is guaranteed to be within bounds.

## Discourage match

Rust often provide good alternatives to doing match on `Option`s and `Result`s.

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
[`Option`](https://doc.rust-lang.org/std/option/enum.Option.html)s. Generally reach for methods
like:

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

When working on [`Result`](https://doc.rust-lang.org/std/result/enum.Result.html)s it might be
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
