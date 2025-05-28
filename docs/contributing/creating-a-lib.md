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
   - **What should be the project name?** The same name as your library (e.g., `my-new-lib`)
   - **Would you like to add a package.json?** Select `Yes`
   - **Which unit test runner would you like to use?** Select `jest` (our standard test runner)

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
