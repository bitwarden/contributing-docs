---
adr: "0042"
status: Proposed
date: 2026-11-24
tags: [clients, tests]
---

# 0042 - Adopt Playwright for clients end-to-end testing

<AdrTable frontMatter={frontMatter}></AdrTable>

## Notation

This ADR uses [RFC 2119](https://www.rfc-editor.org/info/rfc2119/) keywords (`MUST`, `MUST NOT`,
`SHOULD`, `SHOULD NOT`, `MAY`) deliberately. Anything marked `MUST` or `MUST NOT` is not negotiable
at team level; a team that needs an exception brings the case to the architecture group.

## Context and problem statement

End-to-end tests for the web vault, the browser extension and desktop live in a separate test
repository. It is C# on .NET 10 with NUnit, Selenium WebDriver and Appium. Selenium drives the web
vault, the extension and desktop, where ChromeDriver attaches to the Electron app's debugging port.
Appium drives the native iOS and Android apps. The part that overlaps with this ADR is over 1,400
test methods. The repository also holds mobile, CLI and API test methods, which this ADR does not
impact.

Keeping the tests in a separate repository has the following costs:

- A client change and its end-to-end test live in different repositories and different languages.
- No test in the test repository runs automatically on a `bitwarden/clients` pull request. The web,
  extension and desktop suites run on a weekday schedule. The pull-request workflows in the test
  repository build, lint and review the test code itself.
- The nightly extension and desktop runs test the build from `main`, so they find a regression after
  it merges. Web tests run against a deployed environment.
- A run needs a Secrets Manager access token and a target, either a named environment or a base URL,
  and the setup guide is internal.
- Waiting is the author's job. The web, extension and desktop page objects call Selenium's `.Until(`
  976 times and keep a wait-condition class in each project, and the README tells authors to avoid
  `Thread.Sleep()`.
- Nightly failures have their own tooling. A triage tool derives a failure-rate threshold for each
  suite from 30 days of nightly runs, and opens a manual review run for the failing cases when a run
  stays under it.

A proof of concept (POC) in `bitwarden/clients` tried Playwright instead. The POC has around 40
tests in web, browser extension and desktop suites, and a shared suite where one test drives two
clients at once. The POC shows:

- 9 of the 21 commits changed client code in the same commit as the tests, and 5 of them added 32
  `data-testid` attributes.
- All four suites run nightly, when the `ci:km-e2e-tests` label is added to a pull request, and on
  pull requests from `bitwarden/clients` branches that change files under `e2e/`.
- The extension, shared and desktop suites build the client from the pull request's checkout.
- A failing test keeps a trace, a screenshot and a video
  ([`playwright.base.ts`](https://github.com/bitwarden/clients/blob/main/e2e/playwright.base.ts)).
  CI uploads them and posts one comment on the pull request with each suite's result.
- Around 10 tests create their own users, organizations and items through the Seeder API and delete
  them when the test ends, using the scenes, plays and cleanup that
  [ADR-0040](./0040-seed-test-data-as-the-client.md) requires the Seeder API to keep. The nightly
  extension run and most nightly web runs in the test repository seed through the same API.
- One desktop test file drives the SSH agent with OpenSSH's own `ssh`, `ssh-keygen` and `ssh-add`
  against a local `sshd`.

Playwright predates the POC at Bitwarden:
[`bitwarden/browser-interactions-testing`](https://github.com/bitwarden/browser-interactions-testing)
runs the extension's autofill tests on it.

End-to-end tests now have three homes and no rule for where a new one goes. This ADR supplies that
rule.

## Considered options

- **Keep Selenium and Appium in the test repository:** the status quo.
- **Adopt WebdriverIO:** write new client tests in TypeScript on WebdriverIO.
- **Adopt Playwright in `bitwarden/clients`:** write new client tests in TypeScript on Playwright,
  as the POC does.

Cypress was ruled out before the comparison. Its
[trade-offs](https://docs.cypress.io/app/references/trade-offs) page lists these as permanent:
"Cypress commands run inside of a browser" and "You cannot use Cypress to drive two browsers at the
same time." A test that drives the web vault, the browser extension and desktop together needs a
runner outside the clients, which Cypress is not. The
[browser launch API](https://docs.cypress.io/api/node-events/browser-launch-api) loads unpacked
extensions, but "Headless Chrome does not support loading extensions", and Chrome-branded builds
from version 137 no longer load extensions through it. Its
[FAQ](https://docs.cypress.io/app/faq#Can-I-test-my-Electron-app) says testing an Electron app "does
not 'just work'" and describes only stubbing Electron's events.

### Keep Selenium and Appium in the test repository

**Pros**

- Mature repository that covers the web vault, the extension, desktop, CLI, API and native iOS and
  Android.
- Can run the extension in Firefox and Edge as well as Chrome. The nightly run uses Chrome.
- Its nightly extension run and most of its nightly web runs already seed through the Seeder API and
  delete their plays when the run ends.

**Cons**

- Every cost listed in the context: a second repository and language, no run on a client pull
  request, regressions found after merge, hand-written waits, and triage tooling for nightly
  failures.

### Adopt WebdriverIO

**Pros**

- TypeScript, so the tests could live in `bitwarden/clients`.
- Tests extensions in Chrome, Edge and Firefox
  ([Web Extension Testing](https://webdriver.io/docs/extension-testing/web-extensions)).
- One API over "the real Chrome, Firefox, Edge and Safari", "Android and iOS through Appium 3", and
  Electron
  ([WebdriverIO v10 release](https://webdriver.io/blog/2026/10/05/webdriverio-v10-release)).

**Cons**

- Nothing in `bitwarden/clients` is built on it, while Playwright suites already run there and in
  `bitwarden/browser-interactions-testing`.
- Its documentation leaves Safari web extensions out, so that gap stays open under every option.
- Its mobile reach goes through Appium, which the test repository already uses, and the mobile apps
  live in other repositories.

### Adopt Playwright in `bitwarden/clients`

**Pros**

- Same repository and language as the clients, and the suites can run on the pull request.
- Already in-use at Bitwarden.
- "It auto-waits for all the relevant checks to pass and only then performs the requested action"
  ([Auto-waiting](https://playwright.dev/docs/actionability)).
- A failing test keeps a trace, a screenshot and a video.
- One test can drive several clients.

**Cons**

- "Extensions only work in Chromium when launched with a persistent context", and Google Chrome and
  Microsoft Edge "removed the command-line flags needed to side-load extensions"
  ([Chrome extensions](https://playwright.dev/docs/chrome-extensions)).
  `bitwarden/browser-interactions-testing` records in its README that extension builds can only be
  tested with Chromium clients.
- No branded Firefox or Safari. Playwright "doesn't work with the branded version" of either "since
  it relies on patches" ([Browsers](https://playwright.dev/docs/browsers)).
- Electron support is labeled experimental, and Playwright "does not intercept the native Electron
  dialog API" ([Electron](https://playwright.dev/docs/api/class-electron)).
- Its documentation describes no iOS automation. Android support is labeled experimental and covers
  "Chrome for Android and Android WebView"
  ([Android](https://playwright.dev/docs/api/class-android)).

## Decision outcome

Chosen option: **Adopt Playwright in `bitwarden/clients`**, because Playwright puts a client's
end-to-end tests in the same repository, language and pull request as the change they cover. The POC
runs its web vault, browser extension and desktop suites nightly against the development
environment.

### Positive consequences

- A client change and its end-to-end test are written, reviewed and merged in one pull request.
- Extension and desktop changes can be tested from the pull request's build, before merge.
- A failing test keeps a trace, a screenshot and a video.
- Playwright waits for elements before acting on them.
- One test can drive several clients.
- Playwright and Selenium tests seed through the same Seeder API.

### Negative consequences

- Playwright covers the Chromium extension only, and no branded Firefox or Safari.
- Electron support is experimental. Only the web suite runs headless: Electron has no headless mode,
  and the POC runs the extension headed because Chromium's headless mode restarts the extension's
  service worker. CI needs a virtual display.
- Two end-to-end stacks remain: Playwright in TypeScript, and Selenium and Appium in C#.
- The overlapping Selenium web and desktop tests are rewritten, not ported, and their coverage is
  duplicated until each test retires. Where the Firefox and Edge extension tests go is settled in
  the test organization plan.
- Engineers who change a client take on writing its end-to-end tests and owning the flaky ones.
- Product code gains `data-testid` attributes.
- CI retries a failing test once, which can hide a flaky test.
- The POC's limits become adoption work, listed in the plan: shared accounts force one run at a
  time, CI has no Seeder account so the seeded tests skip there, the web suite on a pull request
  drives a deployed web vault, and fork pull requests get no run.
- The tests depend on test-only hooks in the clients: a biometrics fake that only development builds
  honor, and
  [`libs/automation-driver`](https://github.com/bitwarden/clients/tree/main/libs/automation-driver),
  which is attached to the global object in every Angular build.
- The shared extension-and-desktop tests rewrite the built manifest to require the native-messaging
  permission, so the permission prompt is not tested there.

### Plan

#### Rules

1. New end-to-end tests for the web vault, the Chromium browser extension and desktop `MUST` be
   written in Playwright under `e2e/` in `bitwarden/clients`.
1. The test repository keeps native mobile, CLI and API coverage, and
   `bitwarden/browser-interactions-testing` keeps its autofill tests in its own repository. Where
   Firefox, Edge and Safari extension coverage lives is settled in the test organization plan. An
   overlapping Selenium test `MUST NOT` be retired until a Playwright test covers the same behavior.
1. Tech leads `MUST` coordinate with the architecture group on a plan for how the tests are
   organized.
1. A test that changes account state `MUST` seed its own data through the Seeder API
   ([ADR-0040](./0040-seed-test-data-as-the-client.md)) and `MUST NOT` rely on a shared account.
   Seeded data is what removes the one-at-a-time limit.
1. Playwright end-to-end runs `MUST` use test accounts only and `MUST NOT` target Production.
   Traces, videos and reports CI uploads `MUST NOT` contain credentials for a shared test account. A
   [trace](https://playwright.dev/docs/trace-viewer) records the page's network requests and the
   values passed to actions such as `fill()`, so a test's login puts the account's password in the
   trace.
1. `libs/automation-driver` `MUST NOT` gain new capabilities until the security assessment in the
   steps below is complete.

#### Steps

- Tech leads and the architecture group publish a test organization plan that settles:
  - Where a team's tests live and who owns them.
  - Where Firefox, Edge and Safari extension coverage lives.
  - Naming, tags, and shared fixtures and page objects.
  - What runs on a pull request and what runs nightly, and who is told when it fails.
  - The order in which the overlapping Selenium tests retire.
- Assess `libs/automation-driver` against the
  [security principles](../security/principles/index.mdx), or link the existing assessment, and gate
  or remove what it rejects.
- Keep shared test-account credentials out of the traces and reports CI uploads.
- Give CI a Seeder API it can reach, so the seeded tests run there.
- Move the shared-account tests onto seeded data, then lift the one-at-a-time limit.
- Make the web suite test the pull request's own build.
- Decide how fork pull requests get a run.
- Add an end-to-end testing page under `docs/contributing/testing/`.
