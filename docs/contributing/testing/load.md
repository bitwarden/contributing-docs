---
sidebar_custom_props:
  access: bitwarden
---

# Load Tests

Load tests are available as [k6](https://k6.io/) scripts for executing locally or in the cloud,
focused on exercising the platform at scale.

## Configuration and parameters

Two environment variables are used for all tests:

- `IDENTITY_URL`: URL of the
  [Identity](https://github.com/bitwarden/server/tree/master/src/Identity) instance for
  authentication.
- `API_URL`: URL of the [API](https://github.com/bitwarden/server/tree/master/src/Api) instance for
  load testing operations once authenticated.
- `CLIENT_ID`: `X-ClientId` header value for all requests, to track unique clients and manage rate
  limiting.

Depending on the APIs under test, password or client credentials grants are used. For password:

- `AUTH_USER_EMAIL`: User email address.
- `AUTH_USER_PASSWORD_HASH`: Hash of the user's master password.

For client credentials:

- `AUTH_CLIENT_ID`: OAuth client ID.
- `AUTH_CLIENT_SECRET`: OAuth client secret.

Grafana's online presence is used to host the scripts in the cloud and has all of the above
configured. For local testing you may need to
[generate](https://bitwarden.com/help/public-api/#authentication) an ID and secret.

## Getting started

1. [Install](https://k6.io/docs/get-started/installation/) and configure k6 locally.
2. (optional)
   [Log in](https://k6.io/docs/cloud/creating-and-running-a-test/cloud-tests-from-the-cli/) to your
   cloud account with a token.
3. Run your scripts!

For local runs this is as simple as:

```bash
k6 run script.js
```

If you'd like to stream your results to the cloud, add the `--out=cloud` parameter. To pass
environment variables, use the `-e` parameter e.g. `-e IDENTITY_URL="http://localhost:4000"`.

For cloud runs directly:

```bash
k6 cloud script.js
```

Scheduled runs happen automatically in the cloud.

## Creating new scripts

Some examples already exist that can be copied. For a simple `GET` operation, look at the `/config`
test. For a more thorough CRUD suite, look at the `/public/groups` tests.

### Best practices

Checks should be simple and look for status codes and the necessary elements to continue operating
such as IDs. Avoid functional testing as that is covered by unit and automation tests in most cases;
the goal for load tests is to stress the system, not ensure correctness.

The `options` at the top of each script should at a minimum contain the `ext` info that's used in
the cloud. Choose a good `name`, and set the same name down in the `tags` element of `params`; this
is used to group requests and collect accurate metrics.

k6 provides [utility scripts](https://k6.io/docs/javascript-api/jslib/utils/) that can be included
and a commonly-used [`uuidv4`](https://k6.io/docs/javascript-api/jslib/utils/uuidv4/) helper can
generate UUIDs for placing in request properties. The k6 HTTP library does not assume requests
should be formatted as JSON so use `JSON.stringify` for bodies.

An authentication helper is available and is expected to be needed for essentially all tests.

### Stages

[Stages](https://k6.io/docs/using-k6/k6-options/reference/#stages) are used to configure variable
load as the script executes:

```javascript
stages: [
  { duration: "30s", target: 10 },
  { duration: "1m", target: 20 },
  { duration: "2m", target: 25 },
  { duration: "30s", target: 0 },
];
```

The above ramps up load to 10 VUs over 30 seconds, then to 20 VUs over one minute, then even higher
to 25 VUs over two minutes, before finally ramping down to no load over a final 30 seconds.

Depending on goals this could be changed, and it's generally expected that all tests will use the
same stages for uniformity.

### Thresholds

[Thresholds](https://k6.io/docs/using-k6/thresholds/) are similarly used to set expectations for
load test success:

```javascript
thresholds: {
  http_req_failed: ["rate<0.01"],
  http_req_duration: ["p(95)<1500"]
  }
```

Failed request count could arguably be set to zero, but a 1% failure rate is allowed for brief
aberrations. Duration over 95% of the requests -- P95 -- is to be measured over several runs for a
baseline.

Not only will the checks within scripts build up metrics, but core and (if desired) custom metrics
can be referred to for thresholds. Again, it's generally expected that all tests will use the same
thresholds as a base.

## Results

Best seen in the cloud where interactive graphs and charts are available, results contain:

- P95 response time.
- Request totals and requests per second.
- VUs in use.
- HTTP request details and their resulting checks.
- Thresholds.

Baselines are set for scripts once they are created and stabilized, and can be used for comparisons
over time.
