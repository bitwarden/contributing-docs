# Nx

Nx is a powerful open-source build system designed specifically for monorepo development. It
provides tools and techniques for enhancing developer productivity, optimizing CI performance, and
maintaining code quality in complex JavaScript/TypeScript codebases that contain multiple
applications and libraries within a single repository.

## Why We're Using Nx

We use Nx in the Bitwarden clients monorepo to improve our development workflow and build
efficiency. Key advantages include:

### 1. Unified Commands

Instead of navigating to specific directories and running individual build commands, you can now
execute commands for any project from the repository root:

```bash
# Old way
cd apps/web
npm run build
```

```bash
# New way with Nx
nx build web
nx serve desktop
nx test common
```

### 2. Build Caching

Nx automatically caches build results. If code and dependencies haven't changed, subsequent builds
are significantly faster, often restoring results from cache instantly. This saves considerable
build time and memory.

### 3. Intelligent Dependency Management

Nx understands the dependencies between projects. Running a build for one project automatically
builds its dependencies first if needed:

You can visualize these dependencies with:

```bash
nx graph
```

### 4. Configuration-Based Projects

Each app and library can be defined as a project with a `project.json` file that specifies its build
configurations, targets, and other settings. This replaces many scripts previously defined in
individual `package.json` files.

### 5. Code Generation

Nx ships with powerful tools for automating the creation of things like libraries. Bitwarden has a
custom nx plugin containing some generators. More information about these can be read in the
[`@bitwarden/nx-plugin` library docs](https://github.com/bitwarden/clients/blob/main/libs/nx-plugin/README.md).

## Key Nx Terminology

- _nx.json_: The primary configuration file for the Nx workspace, located at the root. Defines
  global settings, plugins, workspace layout, and target defaults.

- _project.json_: A configuration file in each project's directory that defines the targets (tasks)
  for that specific project and the executors used to run them.

- _Target_: A specific task that can be performed on a project, like `build`, `serve`, `lint`, or
  `test`. Run with `nx <target> <project-name>`.

- _Executor_: The code responsible for performing a target's action, typically provided by Nx
  plugins (e.g., `@nx/webpack:webpack` for running Webpack builds).

- _Configuration_: A named set of options for running a target in different modes, accessed via the
  `--configuration` flag (e.g., `nx build browser --configuration=chrome-mv3`).

## Using Nx

To use the Nx cli you have two options:

1. Install nx globally
2. Use npx

## Common Commands

### Building Projects

```bash
# Build a project with default configuration
nx build <project-name>

# Build with specific configuration
nx build browser --configuration=chrome-mv3
nx build web --configuration=bit

# Build all projects (rarely needed)
nx run-many --target=build --all
```

### Serving Projects for Development

```bash
# Start development server
nx serve <project-name>

# Serve with specific configuration
nx serve browser --configuration=firefox-mv2-dev
```

### Testing

```bash
# Run tests for a project
nx test <project-name>

# Run tests only for projects affected by your changes
nx affected --target=test
```

### Other Useful Commands

```bash
# Analyze dependencies between projects
nx graph

# Run a task for all projects affected by your changes
nx affected --target=<target>

# Show what commands would be run, but don't execute them
nx affected --target=build --dry-run
```

## Understanding the Cache

Nx stores its cache in the `.nx/cache` directory at the root of the repository. This includes:

- Terminal outputs
- Build artifacts
- Metadata about the task execution

The cache is created based on the inputs defined for each target. If none of the inputs have
changed, Nx will restore the previous output.

## Contributing Guidelines

When contributing to Bitwarden with Nx:

1. _Use Nx commands_ from the repository root instead of navigating to individual project
   directories.
2. _Respect project boundaries_ - imports between projects should follow the established dependency
   graph.
3. _When adding new dependencies_ between projects, ensure they're reflected in imports in the code.
4. _For new scripts or build steps_, add them to the appropriate project's `project.json` file
   rather than to individual `package.json` files.
5. _Test affected projects_ before submitting a PR:
   ```bash
   nx affected --target=test
   nx affected --target=lint
   ```

## Getting Help

If you're having issues with Nx:

1. Check the [Nx documentation](https://nx.dev/getting-started/intro)
2. Run `nx --help` or `nx <command> --help` for command-specific help
3. Reach out to the Platform team for assistance with Nx-specific problems

## References

- [Nx Documentation](https://nx.dev/getting-started/intro)
- [Nx Project Configuration Reference](https://nx.dev/reference/project-configuration)
- [Nx Cache Documentation](https://nx.dev/concepts/how-caching-works)
