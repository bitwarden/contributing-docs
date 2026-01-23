---
sidebar_position: 2
---

# Models separation of concerns

To maintain clean architecture and separation of concerns, **API contracts** (request/response
models) must be kept separate from **data models**. This separation allows:

- **API contracts to evolve independently** from internal data structures
- **Versioning of APIs** without affecting internal business logic
- **Validation and serialization** specific to API layer

### Model Types and Their Purposes

#### Request Models (`*RequestModel`)

- Define the shape of data received from API clients
- Handle data validation (e.g., `[Required]`, `[StringLength]`)
- Convert to data models via `ToData()` methods

#### Response Models (`*ResponseModel`)

- Define the shape of data sent to API clients
- Construct from data models via constructors or factory methods
- Handle API-specific formatting and structure

#### Data Models

- Internal representation used by business logic
- Handle domain logic and transformations
- Should be clearly distinguishable from API models

### Guidelines

1. **Never expose data models directly in API endpoints**
2. **Provide conversion methods**
3. **Keep validation at the API layer**
