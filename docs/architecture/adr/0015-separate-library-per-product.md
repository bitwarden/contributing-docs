---
parent: Decisions
nav_order: 15
adr: "0015"
status: In progress
date: 2022-11-03
tags: [clients]
---

# Separate library per product

## Context and Problem Statement

Our `clients` repository currently stores much common logic inside of the `libs/common` package,
which is a library that is consumed by all of our clients. However not all parts of the package are
actually used by all of our clients which makes our bundles unecessarily large. Another issue with
this arrangement is the increased cognitive load for the different pods that have to filter out the
parts of the package that don't concern their work.

## Considered Options

- **Continue as is** - Place all services, models, views, etc in `libs/common`.
- **Put services that are only used in 1 client inside that client** - This has the benefit of not
  bloating the common package but will start "polluting" our frontends with request/response models
  that we're trying to hide behind services. Cognitive load is also not particularly improved.
  Services that are used in more than 1 client would automatically end up in `common`.
- **Create new libs for each product** - This involves splitting our common code into `common`,
  `password-manager`, `admin-console` and `secrets-manager` library packages. It has all the benfits
  of the `common` package such as being able to keep internal request/response models while avoiding
  bloat and lowering cognitive load. It also continues to encourage separation of UI and domain
  knowledge. The code inside the packages would be organized by feature.
- **Create new libs for each feature** - Shares many similarities with the option above, but instead
  splits the common code directly into features. Just like above, this has all the benfits of the
  `common` package such as being able to keep internal request/response models while avoiding bloat
  and lowering cognitive load. It also continues to encourage separation of UI and domain knowledge.

## Decision Outcome

Chosen option: **Create new libs for each product**

### Positive Consequences

- Write business logic without involving platform specifics.
- Packages work cross platform and are easy to import into another client.
- Ability to restrict access to internal classes and implementations.
- Smaller packages usually result in less cognitive load.
- Matches our organizational structure which in turn can be interpreted as matching our business
  capabilities
  [Amazon Whitepaper: Organized Around Business Capabilities](https://docs.aws.amazon.com/whitepapers/latest/running-containerized-microservices/organized-around-business-capabilities.html).

### Negative Consequences

- Less obvious where classes should be added. The real world rarely wants to fit neatly into boxes
  and making smaller boxes usually means it is going to be harder to fit things into them.
- Products that appear organically will not match structure resulting in friction during
  development.

### Product-pacakges vs. Feature-packages

Creating one library per feature will result in smaller boxes. The biggest advantage of this is
probably much smaller boxes and more fine-grained control over what gets imported where. However
this also leads to "what is a feature?" becoming one of the most prominent questions, something that
might not be as important in the other alternatives. Features have a tendency to get represented as
"entities" which makes everything more complicated because "entities" have different meanings in
different contexts. An "organization" probably means different things if you're inside an admin
console vs. simply browsing passwords. Having only one feature for both cases will end up creating
objects that contain to much for certain contexts.

Inter-package dependencies also get a lot more tempting when using feature-packages due to the
inter-feature dependencies that will inevitably develop. If features are instead kept within
product-packages then creating links between features will only strengthen the cohesion within the
package, something that is encouraged.
