# Filtering

- Read-many APIs that accept search criteria `MUST` take them as `filter[{name}]` query parameters,
  where `name` `SHOULD` be a resource attribute.
- APIs `MAY` support `*` as a wildcard in filter values. Those that do `MUST` document which
  attributes accept it.
- APIs `MAY` filter on a nested attribute using dot notation, such as `address.city`.

The `filter` parameter family is credited to [JSON:API](https://jsonapi.org/).

## Multi-value parameters and ranges

- A parameter that accepts several values `MUST` take them as a comma-delimited list, and `MUST`
  apply "or" semantics. A single-value parameter can therefore gain multi-value support without
  changing its contract.
- On a parameter that accepts several values or a range, a comma that is part of a value `MUST` be
  escaped with a backslash, so `filter[displayName]=Smith\, Jr` is the single value `Smith, Jr`. An
  asterisk `MUST` be escaped likewise wherever wildcards are supported, and a backslash that is part
  of a value `MUST` then be escaped as `\\`. A single-value parameter is never split, so it needs no
  escaping.
- A range `MUST` be two comma-separated values, with `[` and `]` for inclusive bounds and `(` and
  `)` for exclusive bounds. `*` `MAY` stand for no limit. Ranges express "less than", "greater
  than", and their inclusive forms.

When a single-value parameter gains multi-value support, a caller sending an unescaped comma starts
sending two values. Confirm that the field's values cannot contain commas before making the change.

## Examples

| Example                                                         | Meaning                          |
| --------------------------------------------------------------- | -------------------------------- |
| `filter[lastName]=Smith`                                        | Last name is "Smith".            |
| `filter[lastName]=S*`                                           | Last name begins with "S".       |
| `filter[lastName]=*th`                                          | Last name ends with "th".        |
| `filter[lastName]=*mi*`                                         | Last name contains "mi".         |
| `filter[lastName]=Smith,Jones`                                  | Last name is "Smith" or "Jones". |
| `filter[failedLoginCount]=[3,*)`                                | Three or more failed logins.     |
| `filter[birthDate]=(*,2000-01-01T00:00:00Z)`                    | Born before the year 2000.       |
| `filter[birthDate]=[2000-01-01T00:00:00Z,2001-01-01T00:00:00Z)` | Born in the year 2000.           |
