---
sidebar_position: 9
---

# Standard responses

Status codes follow [RFC 9110](https://www.rfc-editor.org/info/rfc9110/). The following are possible
for every API, and APIs `SHOULD NOT` document them individually:

| Status | Meaning                                                                          |
| ------ | -------------------------------------------------------------------------------- |
| `400`  | The request is malformed and cannot be parsed, such as invalid JSON.             |
| `401`  | The caller is not authenticated.                                                 |
| `403`  | The caller is not authorized to invoke the API.                                  |
| `404`  | The resource named in the path does not exist, or the caller may not know of it. |
| `405`  | The HTTP method is not allowed.                                                  |
| `406`  | The API cannot return the requested media type.                                  |
| `409`  | The update conflicts with another update.                                        |
| `415`  | The API does not accept the request's media type.                                |
| `422`  | The request is invalid in a way the caller can fix.                              |
| `429`  | The caller has made too many requests.                                           |
| `500`  | An unexpected error the caller cannot fix. By definition, a bug.                 |
| `501`  | The API is stubbed out and not yet implemented.                                  |
| `503`  | The service or a dependency is unavailable, overloaded, or timed out.            |

## Commonly confused status codes

- **`400` or `422`:** `400` when the request cannot be parsed, `422` when it parses but is invalid.
- **`403` or `404`:** `403` for a resource the caller may know exists, `404` for one it may not.
- **`404` or `422`:** `404` when the resource named in the path is not found, or the caller should
  not know it exists. `422` when it is found but a resource referenced in the body is not, or the
  caller should not know it exists.
- **`500` or `503`:** `500` for a failure inside the service, `503` when the service is overloaded
  or a dependency is down, unreachable, or timed out.
