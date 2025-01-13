---
title: Swift
---

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

## MARK comments

We use
[MARK comments](https://developer.apple.com/documentation/xcode/creating-organizing-and-editing-source-files#Annotate-your-code-for-visibility)
extensively in the codebase.

- Before each class definition, we use a MARK comment with a divider to denote the class.
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
