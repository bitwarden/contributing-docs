---
sidebar_position: 22
---

# Filtering

- Read-many APIs that allow callers to specify search criteria `MUST` do so via one or more
  `filter[{name}]` query parameters where the `name` `SHOULD` be the same as one of the resource
  attributes.
- APIs `MAY` support wildcard matching. Those that do `MUST` support `*` for "starts with", "ends
  with", and "contains".
- APIs that support filtering by an attribute of an attribute `MAY` use dot-notation (e.g.
  `address.city`).

## Multi-value parameters

APIs that support specifying multiple values for a query parameter `MUST` do so via a
comma-delimited list. This allows APIs that started with single-value query parameters to evolve to
supporting multiple-values without changing the external-facing contract. When multiple values are
provided, "or" query semantics `MUST` be applied.

On a parameter that accepts multiple values or a [range](#ranges), a comma that is part of a value
`MUST` be escaped with a backslash — `filter[displayName]=Smith\, Jr` is the single value
`Smith, Jr`. An asterisk `MUST` likewise be escaped wherever the API supports wildcard matching.
Wherever either escape applies, a backslash that is part of a value `MUST` also be escaped as `\\`.
A parameter that takes a single value is never split, so a comma in its value needs no escaping.

> **Take care when a single-value parameter gains multi-value support.** A caller sending an
> unescaped comma will suddenly be sending two values. That is usually safe, because the evolution
> typically happens on constrained fields whose values cannot contain commas — but confirm it before
> making the change.

## Ranges

Query parameters that allow the caller to specify a range of values `MUST` do so using two values,
separated by commas, and using `[` and `]` to represent **inclusive** begin and end, and `(` and `)`
to represent **exclusive** begin and end. An asterisk `*` `MAY` be used to represent no limit.

Ranges are also how "less than", "greater than", "less than or equal to", and "greater than or equal
to" are implemented.

## Examples

| Example                                                         | Description                                     |
| --------------------------------------------------------------- | ----------------------------------------------- |
| `filter[lastName]=Smith`                                        | Users whose last name is 'Smith'.               |
| `filter[lastName]=S*`                                           | Users whose last name begins with 'S'.          |
| `filter[lastName]=*th`                                          | Users whose last name ends with 'th'.           |
| `filter[lastName]=*mi*`                                         | Users whose last name contains 'mi'.            |
| `filter[lastName]=Smith,Jones`                                  | Users whose last name is 'Smith' or 'Jones'.    |
| `filter[failedLoginCount]=[3,*)`                                | Users who have 3 or more failed login attempts. |
| `filter[birthDate]=(*,2000-01-01T00:00:00Z)`                    | Users born before the year 2000.                |
| `filter[birthDate]=[2000-01-01T00:00:00Z,2001-01-01T00:00:00Z)` | Users born in the year 2000.                    |

See also [Advanced Queries](./advanced-queries.md).
