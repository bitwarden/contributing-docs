---
adr: "0027"
status: Proposed
date: 2025-08-01
tags: [clients, angular, i18n]
---

# 0027 - Improved Localization

<AdrTable frontMatter={frontMatter}></AdrTable>

## Context and Problem Statement

We currently use a homegrown localization system based on the
[`chrome.i18n`](https://developer.chrome.com/docs/extensions/reference/api/i18n) api. This has
served us reasonably well but comes with many limitations which we've had to work around over the
years. Most notably it lacks any native capability for interpolation which is useful for adding
markup such as marking words as italic or bold or inserting links into strings. In most scenarios
we've handled this by splitting the sentence into multiple localized strings but that is not always
optimal in all locales.

Another limitation is pluralization where we currently can't distinguish phrases that are singular
or plural which we've often mitigated by adding (s) at the end which again provides a sub-optimal
experience as different languages handles names, numbers, and dates differently.

In order to better handle more complex localization scenarios we'd like to explore changing the
underlying localization engine.

## Considered Options

- **Keep chrome.i18n** - Continue using our current homegrown localization system
- **Continue building our own** - Expand our custom localization framework
- **Angular Localization (@angular/localize)** - Use Angular's built-in i18n framework
- **ngx-translate** - Use the popular Angular translation library
- **`Transloco`** - Use the modern Angular translation library
- **angular-i18next** - Use i18next with Angular integration

### Keep `chrome.i18n`

**Pros:**

- We already use it and have existing infrastructure
- No migration effort required

**Cons:**

- Lacks native interpolation capabilities for HTML
- No pluralization support

### Continue building our own

**Pros:**

- Complete control over features and implementation
- Can be tailored exactly to our needs

**Cons:**

- Development and maintenance overhead
- Localization is a solved problem with standardized formats

### Angular Localization (`@angular/localize`)

**Pros:**

- Built-in framework for Angular with long-term support
- Expected to be supported for the lifetime of Angular
- Seamless integration in Angular environments
- Advanced capabilities like pluralization and interpolation
- Uses standardized ICU `MessageFormat`
- Provides a command for extracting localized strings from source

**Cons:**

- Supports dynamic localization but documentation is limited
- Locale must be initialized before bootstrapping Angular (though this shouldn't negatively affect
  us)
- Limited support outside Angular - only `$localize` tag available outside templates and only
  supports basic variable replacement
- May need pairing with libraries like `intl-messageformat` for content scripts

### `ngx-translate`

**Cons:**

- Angular specific, requires Angular to run
- Not suitable for content scripts

### `Transloco`

**Cons:**

- Angular specific, requires Angular to run
- Not suitable for content scripts

### `angular-i18next`

**Pros:**

- Integrates with the i18next ecosystem
- Easy to run in background processes

**Cons:**

- Angular integration is not widely adopted
- No extract command - difficult to identify which client uses which keys
- Lacks advanced capabilities like safe HTML tag substitution

## Decision Outcome

Chosen option: **Angular Localization (@angular/localize)**, because it provides the best balance of
features, long-term support, and integration with our Angular-based architecture.

### Implementation Details

#### Angular Environment

In Angular environments, `@angular/localize` offers seamless integration with advanced capabilities:

```html
<p i18n>Updated {minutes, plural, =0 {just now} =1 {one minute ago} other {{{ 5 }} minutes ago}}</p>

<p i18n>This is a inline link to <a href="/settings">Settings</a> with text before and after.</p>

<p i18n>A phrase we really <strong>need</strong> to highlight!</p>
```

```json
{
  "locale": "en-US",
  "translations": {
    "4606963464835766483": "Updated {$ICU}",
    "2002272803511843863": "{VAR_PLURAL, plural, =0 {just now} =1 {one minute ago} other {{INTERPOLATION} minutes ago}}",
    "1150463724722084961": "This is a inline link to {$START_LINK}Settings{$CLOSE_LINK} with text before and after.",
    "5010897546053474360": "A phrase we really {$START_TAG_STRONG}need{$CLOSE_TAG_STRONG} to highlight!"
  }
}
```

#### Content Scripts

Outside Angular environments, we're limited to the `$localize` tag functionality, which provides
basic string interpolation equivalent to our current system. For advanced features, we can combine
with post-processing libraries like `intl-messageformat`:

```typescript
formatIcu($localize`{count, plural, =0 {none} =1 {one} other {more}}`);
```

### Positive Consequences

- Native support for pluralization and interpolation
- Better localization experience across all languages
- Long-term support as part of Angular core
- Reduced need for workarounds and string splitting

### Negative Consequences

- Migration effort required from current system
- Limited functionality in non-Angular environments
- May require additional libraries for content scripts
- Learning curve for development team

### Implementation Plan

Replacing a localization system is difficult since it's used in virtually every component and in
several background services and content scripts. We therefore need to maintain both systems in
parallel and ideally offer automated migrations wherever possible.

1. Proof of concept evaluation: https://github.com/bitwarden/clients/pull/13737
2. Automatic migrations: Build robust automated migrations that coverts existing:
   - `i18nService.t` to `$localize`
   - `<p>{{ 'templateString' | i18n }}</p>` to `<p i18n="@@templateString">A template string.</p>`

   PoC: https://github.com/bitwarden/clients/tree/arch/localization-migrators

3. Add support for Angular Localization in parallel
4. Evaluate content script integration with `intl-messageformat` for non-Angular environments
5. Create migration guidelines and documentation for development teams
6. Plan phased rollout:
   - starting with new features
   - then migrating area by area
   - lastly tackle any remaining usage
