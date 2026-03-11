# Rust

We have standardized on the [`tracing`](https://docs.rs/tracing/latest/tracing/) crate. It's worth
reading that crate's documentation page, as it explains its central philosophy and how to use the
macros.

The tracing crate provides the following advantages over alternatives:

- rich, structured logging

- module level indexing by default

- advanced filtering capabilities (filter not only on log level but span context)

- async-readiness (by virtue of span contexts).

## Showcase

In the below examples, tracing matches the level of contextual information, nay, extends it in
addition to being easier to read, less code, less margin for developer error from repeating raw
strings and more searchable.

Assume the code written is in a module with the following directory structure:
`desktop_native/foobar/src/server/mod.rs`

#### `println`

```rust
println!("[Foobar Module] Starting server with resource {db_path:?}");
```

outputs

```
[Foobar Module] Starting Foobar server with resource "/rabbits/path/.red-pilled.db"
```

#### `log`

```rust
log::info!("[Foobar Module] Starting server with resource {db_path:?}");
```

outputs

```
[INFO] [Foobar Module] Starting Foobar server with resource "/rabbits/path/.red-pilled.db"
```

#### `tracing`

In the below code, `db_path` is presumed to be a string type, which has an implementation of the
[Display trait](https://doc.rust-lang.org/std/fmt/trait.Display.html). The leverage of `Display` in
tracing is a very useful way to take advantage of delegating the responsibility of _how_ to display
a struct, to the struct itself. This solves the warning about sensitive data described in
[Log levels](./index.mdx#Log_levels) An example of this can be found below in the `Demo` section.

```rust
tracing::info!(resource= %db_path, "Starting.");
```

outputs

```
[INFO] desktop_native::foobar::server: Starting. {resource=/rabbits/path/.red-pilled.db}
```

## Setup

In general, the infrastructure for wiring up the tracing should already be set up, unless starting a
new project. Existing usage and the `tracing` crate docs can be consulted for details for any new
project.

Briefly, a subscriber is initialized and is where configuration for log levels and output streams
happens. Subscribers consume log events and should only be set up by application code. Library code
and Application code can both emit `tracing::Events` through the use of the convenience macros.

## Basic usage guidelines

- Since module levels are automatically output in log messages, don't manually add context that the
  modules already do. This helps motivate a properly and logically organized crate, and
  simplifies/shortens the code for emitting the tracing log events.

- Name variables descriptively. While it's possible to set the output name of a variable, the given
  name is defaulted, and using it saves space. If you renaming variables for the log output is
  frequent,consider improving the variable naming.

- Primitive types are logged as-is. The `?` sigil indicates serialization through `fmt::Debug` and
  `%` sigil through `fmt::Display`. In general, Display should be used when there is a meaningful,
  human readable implementation of the trait for a struct. Debug can be a fallback for `info` level,
  and should be the first choice for `debug` and `trace` levels. See the
  [recording-fields](https://docs.rs/tracing/latest/tracing/index.html#recording-fields) for more
  information.

### Demo

The below working (and highly contrived) example demonstrates the macros for the various log levels,
the structured nature and formatting capabilities.

```rust
use std::fmt::Display;

use tracing::{Level, debug, error, info, warn};
use tracing_subscriber;

#[derive(Debug)]
struct CrewMember {
    id: u64,
    name: String,
    red_pilled: bool,
}

impl Display for CrewMember {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "Name: {}", self.name)
    }
}

fn main() {
    tracing_subscriber::fmt()
        .with_max_level(Level::DEBUG)
        .init();

    let foo = CrewMember {
        id: 42,
        name: String::from("Morpheus"),
        red_pilled: true,
    };

    mod layer_one {
        use super::*;
        pub fn f(foo: &CrewMember) {
            // here we only care about the id
            info!(id = foo.id, "free your mind")
        }
    }

    mod layer_two {
        use super::*;
        pub fn f(input: &CrewMember) {
            // variable is named input, so we don't have to re-assign it a name.
            // we are using the Debug sigil because this is a debug log.
            debug!(?input, "there is no spoon")
        }

        pub(super) mod inner {
            use super::*;
            pub fn f(msg: &str, counter: u32) {
                // primitive types need no sigil.
                warn!(counter, msg);
            }
        }
    }

    mod layer_three {
        use super::*;
        pub fn f(foo: &CrewMember) {
            // making use of the Display sigil
            info!(%foo, "follow the white rabbit.")
        }
    }

    layer_one::f(&foo);
    layer_two::f(&foo);
    layer_two::inner::f("that is the sound of inevitability", 42);
    layer_three::f(&foo);
}
```

#### outputs

```
2026-02-27T21:33:38.451775Z  INFO the_nebuchadnezzar::layer_one: free your mind id=42
2026-02-27T21:33:38.451835Z DEBUG the_nebuchadnezzar::layer_two: there is no spoon input=CrewMember { id: 42, name: "Morpheus", red_pilled: true }
2026-02-27T21:33:38.451844Z  WARN the_nebuchadnezzar::layer_two::inner: counter=42 msg="that is the sound of inevitability"
2026-02-27T21:33:38.451849Z  INFO the_nebuchadnezzar::layer_three: follow the white rabbit. foo=Name: Morpheus
```

## Async

The [`#[instrument]`](https://docs.rs/tracing/latest/tracing/attr.instrument.html) macro is very
useful for quick definition of spans on functions. The function name is the span name and arguments
to the function become fields on the span.

This is particularly advantageous for async code, where async functions are prone to
non-deterministic logging due to their nature and the `#[instrument]` macro makes it possible to
follow what happened because each tracing event that occurs during the instrumented function,
contains the contextualizing span.

The `#[instrument]` macro should be used on async functions when:

- There are function parameters and the arguments can vary across threads

- There are log events emitted (i.e. don’t blanket add the macro to all async functions)

The `level` argument can be used to override the default (`INFO`) level of the generated span. This
can be useful to apply instrumentation only when the subscriber's filter is set to `debug`, for
example.

### Demo

```rust
use rand::RngExt;
use tokio::time::{Duration, sleep};
use tracing::{debug, info, instrument};

async fn rnd_sleep() {
    let ms = {
        let mut rng = rand::rng();
        rng.random_range(100..=500)
    };
    sleep(Duration::from_millis(ms)).await;
}

async fn do_thing(_id: u64) {
    rnd_sleep().await;
    info!("doing thing for user");
}

async fn do_other_thing(_id: u64) {
    rnd_sleep().await;
    info!("doing another thing for user");
}

#[instrument(skip(_password))]
async fn do_thing_instrumented(id: u64, _password: &str) {
    rnd_sleep().await;
    info!("doing thing for user");
}

#[instrument(skip(_password), level = "debug")]
async fn do_other_thing_instrumented(id: u64, _password: &str) {
    rnd_sleep().await;
    debug!("a really incredibly helpful message specific to the user.");
    info!("did something not user specific");
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt().with_target(false).init();

    println!("=== WITHOUT #[instrument] ===");
    let handles: Vec<_> = vec![
        tokio::spawn(do_thing(1)),
        tokio::spawn(do_thing(2)),
        tokio::spawn(do_thing(3)),
        tokio::spawn(do_other_thing(1)),
        tokio::spawn(do_other_thing(2)),
        tokio::spawn(do_other_thing(3)),
    ];
    for h in handles {
        h.await.unwrap();
    }

    sleep(Duration::from_millis(1000)).await;

    println!("\n=== WITH #[instrument] ===");
    let handles: Vec<_> = vec![
        tokio::spawn(do_thing_instrumented(1, "sensitive_data")),
        tokio::spawn(do_thing_instrumented(2, "sensitive_data")),
        tokio::spawn(do_thing_instrumented(3, "sensitive_data")),
        tokio::spawn(do_other_thing_instrumented(1, "sensitive_data")),
        tokio::spawn(do_other_thing_instrumented(2, "sensitive_data")),
        tokio::spawn(do_other_thing_instrumented(3, "sensitive_data")),
    ];
    for h in handles {
        h.await.unwrap();
    }
}
```

#### sample output

```
=== WITHOUT #[instrument] ===
2026-03-04T22:16:33.411720Z  INFO doing another thing for user
2026-03-04T22:16:33.544027Z  INFO doing another thing for user
2026-03-04T22:16:33.614329Z  INFO doing thing for user
2026-03-04T22:16:33.647056Z  INFO doing another thing for user
2026-03-04T22:16:33.674319Z  INFO doing thing for user
2026-03-04T22:16:33.685544Z  INFO doing thing for user

=== WITH #[instrument] ===
2026-03-04T22:16:35.006149Z  INFO did something not user specific
2026-03-04T22:16:35.007511Z  INFO do_thing_instrumented{id=2}: doing thing for user
2026-03-04T22:16:35.015020Z  INFO did something not user specific
2026-03-04T22:16:35.110271Z  INFO do_thing_instrumented{id=3}: doing thing for user
2026-03-04T22:16:35.178081Z  INFO do_thing_instrumented{id=1}: doing thing for user
2026-03-04T22:16:35.179495Z  INFO did something not user specific

```
