---
sidebar_position: 30
---

# Jobs

APIs that accept work to be completed asynchronously return `202` along with a **job** — a resource
representing the accepted work and its progress. A formal standard for jobs is forthcoming. Bulk
operations place [additional requirements](./bulk-operations.md#bulk-responses) on what a completed
job reports.
