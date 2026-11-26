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

The Selenium end-to-end tests are not part of a client developer's workflow. No engineer outside QA
runs them while writing a change, because there is a barrier to setting them up, and because they
are yet another pull request to manage. The bar this ADR sets is one command from a
`bitwarden/clients` checkout, with the tests present locally for everyone. A developer, or an agent
working on a change, should write end-to-end tests confirming the behavior works as expected. Tests
are part of the change, not an afterthought.

Keeping the tests in a separate repository has the following costs:

- A client change and its end-to-end test live in different repositories and different languages, so
  a change in behavior takes two pull requests and leaves the tests broken in between.
- Running a suite takes a second checkout, a second toolchain, a Secrets Manager access token and a
  target, either a named environment or a base URL, with an internal setup guide.
- No test in the test repository runs automatically on a `bitwarden/clients` pull request. The web,
  extension and desktop suites run on a weekday schedule. The pull-request workflows in the test
  repository build, lint and review the test code itself.
- The nightly extension and desktop runs test the build from `main`, so they find a regression after
  it merges. Web tests run against a deployed environment.

The Selenium stack carries its own costs, independent of where the tests live:

- Waiting is the author's job. The web, extension and desktop page objects call Selenium's `.Until(`
  976 times and keep a wait-condition class in each project, and the README tells authors to avoid
  `Thread.Sleep()`.
- Nightly failures have their own tooling. A triage tool derives a failure-rate threshold for each
  suite from 30 days of nightly runs, and opens a manual review run for the failing cases when a run
  stays under it.
- Behaviors that need control over the client's environment have no infrastructure in it. Shared
  unlock, biometrics and passkeys are untested there.

A proof of concept (POC) in `bitwarden/clients` tried Playwright instead. The POC has around 40
tests in web, browser extension and desktop suites, and a shared suite where one test drives two
clients at once. It was written to cover shared unlock, biometrics and passkeys, which the Selenium
suites have no infrastructure for and do not test; it duplicates no Selenium test. The POC shows:

- 9 of the 21 commits changed client code in the same commit as the tests.
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

The POC is a proof of concept for the testing strategy, not for the features it covers. Its tests
are the only coverage those features have, and they stay regardless of the outcome of this ADR.

Playwright predates the POC at Bitwarden:
[`bitwarden/browser-interactions-testing`](https://github.com/bitwarden/browser-interactions-testing)
runs the extension's autofill tests on it.

End-to-end tests now have three homes and no rule for where a new one goes. This ADR supplies that
rule.

## Considered options

- **Keep Selenium and Appium in the test repository:** the status quo.
- **Move the Selenium suites into `bitwarden/clients`:** keep C# and Selenium, move the web,
  extension and desktop projects next to the clients.
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
  request, regressions found after merge, hand-written waits, triage tooling for nightly failures,
  and no infrastructure for shared unlock, biometrics or passkeys.
- No one outside QA runs the tests while writing a change.

### Move the Selenium suites into `bitwarden/clients`

**Pros**

- A client change and its end-to-end test land in one pull request, and the suites can run on it.
- Keeps the 1,400 existing test methods and their page objects, with no rewrite.
- Language is no obstacle: the C# projects can sit in `bitwarden/clients` as they are.

**Cons**

- A C# and .NET toolchain in a TypeScript repository. The one command from a clients checkout now
  installs .NET, and every client engineer writes tests in a language they do not otherwise use.
- Keeps every Selenium cost listed in the context: hand-written waits, nightly triage tooling, and
  no infrastructure for shared unlock, biometrics or passkeys.

### Adopt WebdriverIO

**Pros**

- TypeScript, the same language as the clients.
- Tests extensions in Chrome, Edge and Firefox
  ([Web Extension Testing](https://webdriver.io/docs/extension-testing/web-extensions)).
- One set of framework primitives over "the real Chrome, Firefox, Edge and Safari", "Android and iOS
  through Appium 3", and Electron
  ([WebdriverIO v10 release](https://webdriver.io/blog/2026/10/05/webdriverio-v10-release)).

**Cons**

- Nothing in `bitwarden/clients` is built on it, while Playwright suites already run there and in
  `bitwarden/browser-interactions-testing`.
- Its documentation leaves Safari web extensions out, so that gap stays open under every option.
- The shared primitives buy little. Almost no behavior is shared between the web vault, the
  extension, desktop and the mobile apps, so each still needs its own tests and its own fixtures.
- Its mobile reach goes through Appium, which the test repository already uses. Mobile is an
  autonomous team in its own repositories, and it has already chosen its own end-to-end tests
  ([bitwarden/ios#3232](https://github.com/bitwarden/ios/pull/3232)). A framework generic enough to
  span mobile and the clients is not a goal of this ADR.

### Adopt Playwright in `bitwarden/clients`

**Pros**

- Same repository and language as the clients, and the suites can run on the pull request.
- Already in-use at Bitwarden.
- "It auto-waits for all the relevant checks to pass and only then performs the requested action"
  ([Auto-waiting](https://playwright.dev/docs/actionability)).
- A failing test keeps a trace, a screenshot and a video.
- One test can drive several clients.
- Complex test behaviors are easy to set up: biometrics, shared unlock and passkeys all have working
  tests in the POC, and none of them has infrastructure in the Selenium suites.
- In a survey of tech leads, nearly all developers surveyed preferred Playwright.
- Runs the web vault on Chromium, Firefox and Safari
  ([Browsers](https://playwright.dev/docs/browsers)).

**Cons**

- Electron support is still marked experimental
  ([Electron](https://playwright.dev/docs/api/class-electron)).

## Decision outcome

Chosen option: **Adopt Playwright in `bitwarden/clients`**, because we want the test suite to live
with the code it covers so a change and its test are one atomic pull request, because Playwright is
perceived as the easiest option for writing tests, and because we want a framework suited to the app
environment over a generic layer spanning clients and mobile. The POC runs its web vault, browser
extension and desktop suites nightly against the development environment.

### Positive consequences

- A client change and its end-to-end test are written, reviewed and merged in one pull request.
- Extension and desktop changes can be tested from the pull request's build, before merge.
- A failing test keeps a trace, a screenshot and a video.
- Playwright waits for elements before acting on them.
- One test can drive several clients.
- Playwright and Selenium tests seed through the same Seeder API.
- Shared unlock, biometrics and passkeys become testable.
- Engineers who change a client write and own its end-to-end tests, so the tests follow the behavior
  instead of lagging it.

### Negative consequences

- There are two end-to-end stacks until we transition the Selenium tests to Playwright. Agents can
  machine-translate the existing tests, so the transition is not a hand rewrite of all 1,400 test
  methods.

### Plan

#### Rules

1. New end-to-end tests for the web vault, the Chromium browser extension and desktop `MUST` be
   written in Playwright under `e2e/` in `bitwarden/clients`.
2. Running a suite `MUST` be one command from a `bitwarden/clients` checkout, with no second
   repository, toolchain or internal setup guide.
3. The test repository keeps native mobile, CLI and API coverage, and
   `bitwarden/browser-interactions-testing` keeps its autofill tests in its own repository. Where
   Firefox, Edge and Safari extension coverage lives is settled in the test organization plan. An
   overlapping Selenium test `MUST NOT` be retired until a Playwright test covers the same behavior.
4. Tech leads `MUST` coordinate with the architecture group on a plan for how the tests are
   organized.
5. Tests `SHOULD` locate elements by role, label or visible text. A test `SHOULD NOT` add a new
   `data-testid` attribute to product code.
6. A test that changes account state `MUST` create its own data and `MUST NOT` rely on a shared
   account. Independent data is what removes the one-at-a-time limit.
7. A test `MUST` obtain its account from a shared account-creation fixture. The fixture has a Seeder
   API implementation ([ADR-0040](./0040-seed-test-data-as-the-client.md)) where that is available,
   and also supports account creation through the UI. This makes it possible to run the end-to-end
   suite against arbitrary servers, even ones for which Seeder is not available.
8. Playwright end-to-end runs `MUST` use test accounts only and `MUST NOT` target Production.
   Traces, videos and reports CI uploads `MUST NOT` contain credentials for a shared test account. A
   [trace](https://playwright.dev/docs/trace-viewer) records the page's network requests and the
   values passed to actions such as `fill()`, so a test's login puts the account's password in the
   trace.

#### Steps

- Tech leads and the architecture group publish a test organization plan that settles:
  - Where a team's tests live and who owns them.
  - Where Firefox, Edge and Safari extension coverage lives.
  - Naming, tags, and shared fixtures and page objects.
  - What runs on a pull request and what runs nightly, and who is told when it fails.
  - The order in which the overlapping Selenium tests retire.
- Keep shared test-account credentials out of the traces and reports CI uploads.
- Build the account-creation fixture with both backings, Seeder API and UI registration, and make
  the backing a configuration choice so a suite runs unchanged against USDEV or a local stack.
- Give CI a Seeder API it can reach, so the seeded tests run there.
- Move the shared-account tests onto the fixture, then lift the one-at-a-time limit.
- Make the web suite test the pull request's own build.
- Decide how fork pull requests get a run.
- Add an end-to-end testing page under `docs/contributing/testing/`.
