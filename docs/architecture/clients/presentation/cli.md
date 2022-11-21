# CLI

The CLI has a slightly different architecture than the other clients, which matches it's nature. CLI
sessions are short lived and only execute a single task and then exit. This means that the CLI
doesn't need to keep track of the memory state in the same way as the other clients.

## Commands

Since the CLI is a command line interface, everything is structured around commands. Each command
execute a specific task. Similar to _Angular Components_, _Commands_ aims to be as lightweight as
possible with most business logic being handled by services. This allows for code sharing between
different commands, but also with the Angular presentation layer.

A basic command essentially only implements a single method, `run`. The Command classes are
instantiated by the `Program` class.

```ts
export class ConfigCommand {
  // Dependencies are manually wired up in the Program class.
  constructor(private environmentService: EnvironmentService) {}

  async run(setting: string, value: string, options: program.OptionValues): Promise<Response> {
    // Set configuration
  }
}
```
