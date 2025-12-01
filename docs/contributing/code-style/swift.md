# Swift

We use both [SwiftLint](https://github.com/realm/SwiftLint) and
[SwiftFormat](https://github.com/nicklockwood/SwiftFormat) for linting and formatting code. These
are both run on build in Xcode.

However, there are some things that are not easily captured by these tools.

We try to follow Swift/iOS community standards (inasmuch as they exist). Though our apps are not API
libraries, we do find the
[Swift API Design Guidelines](https://www.swift.org/documentation/api-design-guidelines/) to be a
useful starting point.

## Conventions

In this document, "class" will be used to mean more generally classes, structs, actors, enums, and
protocols as things apply in each case.

## Xcode

Xcode has several settings that can be helpful for code formatting. In particular, under Settings ->
Text Editing -> Editing:

- You can update "Reformat code at column" and turn on "Show reformatting guide" to have a visual
  notation of 120 characters per line.
- You can turn on "Automatically trim trailing whitespace" and "Including whitespace-only lines".

On Settings -> Text Editing -> Indentation:

- We "Prefer indent using" spaces.
- We prefer both "Tab width" and "Indent width" to be 4 spaces.
- We do _not_ "Indent switch/case labels" in "Swift", but we do in "C/Objective-C/C++".

As well, Xcode has several useful hotkeys for formatting:

- `Control`+`I` will re-indent all selected lines, or the line the cursor is currently on.
- `Control`+`M` will break a comma-separated list of parameters or array members into separate lines
  per member.

## MARK comments

We use
[MARK comments](https://developer.apple.com/documentation/xcode/creating-organizing-and-editing-source-files#Annotate-your-code-for-visibility)
extensively in the codebase.

- Before each class definition, we use a MARK comment with a divider to denote the class.
  - This is optional if there is only one class in the file.
- Within each class definition, we use MARK comments to mark out the different sections of the file.
  This is the SwiftLint-enforced order:
  - Cases
  - Type Aliases
  - Associated Types
  - Subtypes
  - Type Properties
  - Properties
  - `IBInspectable`s
  - `IBOutlet`s
  - Initializers
  - Deinitializers
  - Type Methods
  - View Life Cycle Methods
  - `IBAction`s
  - Methods
  - Subscripts
- With type properties, properties, and methods, we further split each into Public and Private
  groups.
- We also will have further division with MARK comments in cases where it makes sense to denote
  particular sections of the class, such as with protocol conformance.
- In a test class, the MARK comments are ordered:
  - Properties
  - Setup & Teardown
  - Tests
- We sometimes use MARK comments to split up the tests in a test class to better signpost
  organization of related tests.

An incomplete example:

```swift
// MARK: - ClassName

/// (doc comments)
class ClassName {
    // MARK: Properties
    var count: Int

    // MARK: Private Properties
    private var text: String

    // MARK: Methods
    func printThings(_ times: Int) {
        print("\(times) times, count \(count), say \"\(text)\"")
    }
}
```

## Documentation comments

- We generally follow the recommendations for
  [Symbol Documentation in Source Files](https://www.swift.org/documentation/docc/writing-symbol-documentation-in-your-source-files).
- Each class should have a documentation comment indicating what the class does.
- Each symbol within a class should have a documentation comment.
  - We do not typically do this for `DefaultThing` properties or methods that conform to a `Thing`
    protocol in the same file; the documentation comment on that property or method in the protocol
    is sufficient. However, private properties/methods or other properties/methods not for
    conformance of `Thing` inside of `DefaultThing` should still have documentation comments.
- Method documentation comments also include a list of parameters and documentation on the return
  value.

## Alphabetization

- Within each section of a class, as noted by MARK comments, we alphabetize its members. That is,
  properties, methods, cases, and so on should be in alphabetical order.
- This also applies inside of case statements and method parameters.

### Exceptions

- In UI objects—such as views and view modifiers—properties that are displayed should be in the
  order in which they are displayed, following the top-left-bottom-right pattern that Apple uses in
  components such as
  [`UIEdgeInsets`](<https://developer.apple.com/documentation/uikit/uiedgeinsets/init(top:left:bottom:right:)-1s1t9>).
  For example, if a `title` is displayed above a `subtitle`, then it should be ordered `title` then
  `subtitle` in the properties list and therefore initializer and function parameter lists as
  appropriate. Properties that are not displayed then go after the displayed properties, in
  alphabetical order. You can see an example of this in
  [`BitwardenTextField`](https://github.com/bitwarden/ios/blob/main/BitwardenKit/UI/Platform/Application/Views/BitwardenTextField.swift).
- Closure parameters should be placed last in the method parameter list, to allow for
  [trailing closure syntax](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/closures/#Trailing-Closures).
  As well,
  [variadic parameters](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/functions/#Variadic-Parameters)
  should be last, as should parameters with
  [default values](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/functions/#Default-Parameter-Values).
  In cases where there are several different parameters that should be at the end, we allow
  developer discretion for the order.
- While tests should largely be in alphabetical order by the name of the method/property under test,
  we allow for those related tests to be ordered in a non-alphabetical manner to allow for more
  logical grouping. In particular, we commonly will handle successful scenarios and then failure
  scenarios. This is up to developer discretion.

## Capitalization

- Per the API Guidelines, acronyms and initialisms that commonly appear as all upper case in
  American English should be uniformly up- or down-cased according to case conventions.

## Naming

- Following in the
  [Objective-C conventions](https://developer.apple.com/library/archive/documentation/Cocoa/Conceptual/ProgrammingWithObjectiveC/Conventions/Conventions.html)
  and the API Guidelines linked above, the method name should indicate the primary result or intent
  of calling the method. For methods without side effects, these should be noun phrases; and for
  methods without side effects, these should be verb phrases.
- We prefer "Tapped" instead of "Pressed", "Touched", or "Clicked" when describing buttons or other
  screen elements being tapped, in line with Apple calling this a tap gesture.

## Localization

- We use Crowdin to crowd-source our localizations, based off of the English text. More information
  on how to contribute translations and how we use Crowdin within Bitwarden can be found
  [here](https://contributing.bitwarden.com/contributing/#localization-l10n).
- We use `.strings` files for localization. Therefore only the English `Localizable.strings` file
  needs to be updated when adding strings; we have regular jobs in GitHub that take care of syncing
  other translations with Crowdin.
- Keys in `Localizable.strings` should be a CamelCased string of the English text, rather than a
  description of where the key is used. As a result, if the English text changes, the key should
  likewise change—this allows translators in Crowdin to know that they need to likewise update the
  localized text.
- Contractions can be converted to un-contracted form in the key, particularly if it aids with
  readability.
- If the string in question is particularly long, a truncated form with `DescriptionLong` appended
  is reasonable.
- If possible, keys (and therefore corresponding localized text) should be the same between iOS and
  Android.

Some examples:

```text
"UseFingerprintToUnlock" = "Use fingerprint to unlock";
"EncryptionKeyMigrationRequiredDescriptionLong" = "Encryption key migration required. Please login through the web vault to update your encryption key.";
"YouAreAllSet" = "You're all set!";
```

## File names

- Swift files are named per Swift convention of CamelCase of the primary class name in the file.
- Unless there is an overriding convention—such as with a `Fastfile`—supporting files such a YAML
  configuration file or script is named in lowercase with hyphens in place of spaces; this is
  sometimes referred to as kebab-case.
