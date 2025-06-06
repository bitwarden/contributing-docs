# Creating a New Library

This guide explains how to create a new library in the Bitwarden monorepo using Nx.

## Prerequisites

- Node.js and npm installed
- Bitwarden monorepo cloned and dependencies installed
- The Nx cli installed, or accessible over npx

## Creating a Library with Nx

We use the `@nx/js` plugin to generate new libraries. Follow these steps to create a new library:

1. From the root of the monorepo, run the generator command:

   ```bash
   nx g @nx/js:lib my-new-lib --directory=libs/my-new-lib
   ```

   Replace `my-new-lib` with the name of your library.

2. The generator will ask you questions about the library configuration. Here are recommended
   settings:

   - **Which bundler would you like to use?** Select `none` (we use our own bundling setup)
   - **Which linter would you like to use?**
   - **Which unit test runner would you like to use?**

3. Once generated, the library will have this structure:

```
libs/
  my-new-lib/
    src/
      index.ts
      my-new-lib.ts
    tsconfig.json
    project.json
    package.json
    jest.config.js
```

4. Update the `package.json` with the appropriate Bitwarden naming convention:

```json
{
  "name": "@bitwarden/my-new-lib",
  "version": "0.0.0"
}
```

5. Update the library's path in the root `tsconfig.base.json` file to make it available to other
   projects:

```json
{
  "compilerOptions": {
    "paths": {
      "@bitwarden/my-new-lib": ["libs/my-new-lib/src"]
    }
  }
}
```

## Building and Testing the Library

- Build the library: `nx build my-new-lib`
- Test the library: `nx test my-new-lib`
- Lint the library: `nx lint my-new-lib`

## Importing Your Library in Other Projects

Once your library is created and built, you can import it in other projects within the monorepo:

```ts
import { someFunction } from "@bitwarden/my-new-lib";
```

## Best Practices

- Follow the Bitwarden code style guidelines
- Document your library's public API
- Write unit tests for your library's functionality
- If your library has dependencies on other libraries, make sure to add them to the `project.json`
  file

## Designing a Library

There are a few ways you and your team may want to design a library, there are a lot of factors to
take into account like clean organization, ease of onboarding new members, simplicity of moving
ownership to a new team, and optimizing for module size. Below are a few ways you might want to
design a library.

### Option 1: Feature-based libraries

One strategy to employ is a feature-scoped library.

The import for such a library would be `@bitwarden/[feature]`. For example the `global-state`
feature would be imported with `@bitwarden/global-state`.

If the feature has both a UI component and needs to be used in the CLI it would probably result in a
`@bitwarden/[feature]-ui` or `@bitwarden/[feature]-angular` library as well.

:::note

With more things being added to the SDK and the CLI eventually being written directly in Rust there
will become less and less need to have a package with an Angular dependency and without it.

:::

Pros

- You'll have smaller libraries that have minimal dependencies, making them easier for another team
  to depend on without a circular reference.
- If your team is ever split or a feature you own is moved to another team this can likely be done
  with just an update to the GitHub `CODEOWNERS` file.
- You'll have a clearer dependency graph.
- Your modules will be smaller.

Cons

- YOu have to spend the time to think about and define what a feature is.
- You have to create libraries somewhat often.
- You MAY need "glue" libraries still.
- It is not as clear who owns what feature from looking at library names.

:::info Glue libraries

A "Glue" library is a library that might not exist other than the need for two teams to collaborate
on a cross cutting feature. The glue library might exist to hold an interface that team B is
expected to implement but team A will be responsible for consuming. This helps glue 2 features
together while still allowing for team A to consume other things that exist in team B's library but
still avoid a circular dependency.

:::

### Option 2: Team-based libraries

Another strategy would be to have a library for the vast majority of your teams code in a single
package.

There are many ways you may choose to design the library, but if it's one library you will need to
be dependent on everything that makes all your features tick.

**If all teams go this route it will be impossible to only have these team libraries**. Why? Because
the team grouping is very likely to result in circular dependencies. For example, if team A depends
on team B's library then team B cannot depend on anything in team A's library. If team B did need
something they would need to request that team A move it "downstream". Team A would need to move
their code and come up with a name for it. If they don't want to also re-export those pieces of code
they will need to update the import for every other place that code of used. You may also have to
deal with the code now being separated from similar code or you may decide to move that code too.

Pros

- You have fewer libraries to maintain.
- All your team’s code is in one place.

Cons

- You'll need to move code ad-hoc more often to make glue libraries, and each time try to think
  about how to design the package abstraction.
- If your team splits you will need to move a lot more code.
- You’ll have larger modules.

### Option 3: Type-based libraries

You can also split libraries based on the primary kind of file that it holds. For example, you could
have a library holding all `type`’s, one for `abstractions`, and on more `services`. Since one
library for all type’s would be mean having a library that has multiple owners it would be highly
discouraged and therefore this would likely be split by team as well, resulting in packages like
`@bitwarden/platform-types`; this library strategy is really a subset of the team-based one.

Pros

- You’ll be less likely to have circular dependencies within your team’s code, since generally Types
  < Abstractions < Services where < means lower level.
- It’s most similar to the organization strategy we’ve had for a while.

Cons

- There is no guarantee that all the types for a given team are lower level than all the types of
  another team that they need to depend on. Circular dependencies can still happen amongst teams.
- It’s also possible for a type to need to depend on an abstraction,
- We are generally discouraging teams from making abstractions unless needed (link).

### Option 4: Feature/type hybrid

Another strategy could be to split libraries by the kind of item in feature-scoped libraries.

Pros

- Lowest chance of circular dependencies showing up later.
- Pretty easy to move ownership.

Cons

- The most libraries to maintain.
- Consumers will likely have to import multiple modules in order to use your feature.

### Platform Recommendation

Given the options available with Nx and the pros and cons of each, Platform is planning on using
[feature-based libraries](#option-1-feature-based-libraries) and we recommend other teams do as
well.

We understand that we might have a domain that is a little easier to split into features, but we
believe that the work is worthwhile for teams to do.

There will be some instances that our libraries may only contain abstractions and very simple types
which would then resemble the type-based approach. We will be forced to do this because we have some
things like storage where it’s only really useful which the implementations made in the individual
apps.

Example Platform feature libraries (all of these would be imported like `@bitwarden/[feature]`:

- `storage-core`
- `user-state`
- `global-state`
- `state` (will have its own code but also a meta package re-exporting `user-state` and
  `global-state`)
- `clipboard`
- `messaging`
- `ipc`
- `config`
- `http`
- `i18n`
- `environments`
- `server-notifications`
- `sync`

Hopefully these will give you some ideas for how to split up your own features.
