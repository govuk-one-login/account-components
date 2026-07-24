# 0004 - Frontend Lambda architecture

## Status

Accepted

## Decision

We will deploy the Account Components frontend as a Fastify application running on AWS Lambda, fronted by API Gateway and CloudFront.

## Context

Account Components is a shared journey service. Journeys can be initiated from multiple upstream applications — the Auth frontend and the Home frontend — which have very different traffic profiles. The Auth frontend in particular can experience high, spiky traffic as it sits on the critical path for all new GOV.UK One Login sign-ins.

Prior to this project, GOV.UK One Login frontends have been built with Express, packaged as Docker images, and deployed to AWS Fargate. Fargate scaling has often proven too slow to handle spiky traffic patterns reliably. Because Account Components sits downstream of Auth, a Fargate deployment would have required us to match the scaling profile of the highest-traffic upstream application. Because new Fargate tasks take significant time to come online, scaling must be triggered early — at relatively low CPU and memory thresholds — to ensure capacity is available before existing tasks become overwhelmed. This means maintaining a large buffer of tasks beyond what is actually needed to serve current traffic, increasing cost and environmental impact, and still risking failed requests during particularly sharp or unexpected spikes.

Lambda's on-demand scaling model is a natural fit for this traffic profile. This ADR documents the approach taken, the lessons learnt, and the best practices established so that this architecture can be advocated for and adopted by other projects in the programme.

## Tech stack

| Concern              | Technology                                                           |
| -------------------- | -------------------------------------------------------------------- |
| HTTP framework       | [Fastify](https://fastify.dev/) v5                                   |
| Lambda adapter       | [@fastify/aws-lambda](https://github.com/fastify/aws-lambda-fastify) |
| Bundler              | [Rolldown](https://rolldown.rs/)                                     |
| Templating           | [Nunjucks](https://mozilla.github.io/nunjucks/)                      |
| Session storage      | DynamoDB via a custom `@fastify/session` store                       |
| CSRF protection      | `@fastify/csrf-protection`                                           |
| Security headers     | `@fastify/helmet`                                                    |
| Static assets        | `@fastify/static`                                                    |
| Form body parsing    | `@fastify/formbody`                                                  |
| Cookies              | `@fastify/cookie`                                                    |
| Internationalisation | `i18next` + `i18next-http-middleware `                               |
| Observability        | AWS Lambda Powertools (logger, metrics), Dynatrace                   |
| Runtime              | Node.js 24 on `arm64`                                                |
| Infrastructure       | AWS SAM / CloudFormation                                             |

## Rationale

### Scaling

Lambda scales instantaneously and independently of any other application in the programme. Each incoming request can be served by a separate Lambda execution environment. This means Account Components does not need to be sized or scaled to match the traffic profile of its upstream callers. There is a much lower risk of a traffic spike from Auth causing failed requests in Account Components due to insufficient capacity.

Performance testing has been run at ~80 requests/second with a 100% success rate. Notably, the performance profile improves under load: as traffic increases, more warm Lambda execution environments are available to serve requests, reducing the proportion of cold starts.

Where traffic is very low and cold starts are a concern, provisioned concurrency can be used to keep a minimum number of execution environments warm. The frontend is currently configured with one unit of provisioned concurrency.

### Cost

Lambda pricing is based on the number of requests and the duration of execution. There is no charge for idle capacity. This is in contrast to Fargate, where tasks must be kept running (and paid for) even when there is no traffic. For a service with a low base traffic level and occasional high bursts, Lambda is likely to be significantly cheaper.

The Lambda memory is currently configured at 1769 MB, which provides approximately 1 vCPU. In future, Lambda power tuning tools can be used to find the optimal memory configuration for the best balance of cost and performance. The function is deployed on `arm64` (AWS Graviton), which typically offers better price/performance than `x86_64`.

### Fastify

Fastify was chosen over Express for two reasons:

1. It has a first-party Lambda adapter (`@fastify/aws-lambda`) that is actively maintained.
2. It is significantly faster than Express.

Fastify retains the familiar monolithic application structure of Express — plugins, hooks, route handlers — so the learning curve for developers already familiar with Express is low. That said, Fastify has its own conventions and it is worth reading the [Fastify documentation](https://fastify.dev/docs/latest/) to understand the fundamentals before starting, as it is not a drop-in replacement.

Fastify has a rich first-party plugin ecosystem that covers all of the important concerns for a GOV.UK frontend application without needing to rely on third-party plugins: session management, CSRF protection, security headers (Helmet), cookie management, serving static assets, and parsing form bodies. Where Express-compatible plugins are needed, Fastify is often able to use them directly.

### Other operational benefits

- **Faster deployments.** Lambda deployments are significantly faster than updating an ECS service, reducing the time it takes to get changes into production.
- **Simpler canary deployments.** AWS SAM's `DeploymentPreference` with CodeDeploy canary strategies (e.g. `Canary10Percent10Minutes`) are straightforward to configure for Lambda. The frontend is configured to use canary deployments in higher environments, with alarms on errors, throttles, availability, and p90 duration used as automatic rollback triggers.
- **Security.** Lambda execution environments are short-lived and isolated. Each environment serves a small number of requests before being recycled, reducing the blast radius of any compromise compared to a long-running container shared across many users and requests. The function runs inside protected VPC subnets, maintaining the same network security posture as a Fargate deployment while still being able to reach internal AWS resources.

## Cold starts

Cold starts are the main operational concern with a Lambda frontend. A cold start occurs when a new execution environment is initialised to serve a request. During a cold start, the Node.js runtime and all application code must be loaded before the request can be handled.

The following strategies are used to keep cold start times low:

- **Dynamic imports for route handlers.** Each route handler is loaded via a dynamic `import()` call. Rolldown treats dynamic imports as code-splitting points and produces separate bundles for each handler. This means only the code needed for the requested route is loaded on a cold start. Subsequent requests to the same route on the same execution environment benefit from the Node module cache.
- **Dependency discipline.** Care is taken not to introduce large dependencies unnecessarily. Where dependencies are used, preference is given to packages that use ES modules and are written in a tree-shakable way, so that Rolldown can eliminate unused code.
- **Monitoring.** A CloudWatch dashboard tracks cold start rate (%) and cold start p90 duration for the frontend Lambda. A p90 duration alarm fires if request duration (including cold starts) exceeds 1000 ms over a sustained period. An anomaly detection alarm fires if the p90 cold start duration rises significantly above its expected baseline, providing an early warning of any regression caused by changes to the application or its dependencies.

Current cold start times are in the region of ~1000 ms, with approximately half of this attributable to the required Dynatrace instrumentation layer. This is well within the programme's NFRs, as confirmed by performance testing.

## Lessons learnt

- **`trustProxy: true` is required.** HTTPS is terminated upstream by CloudFront and API Gateway before the request reaches the Lambda function. Fastify must be configured with `trustProxy: true` otherwise it will not correctly resolve the client IP, protocol, and host from the forwarded headers. This is easy to overlook when developing locally where requests arrive directly.
- **Rolldown over esbuild.** The API Lambdas in this project use esbuild, which is the more common choice for bundling Lambda functions. However, the frontend uses [Rolldown](https://rolldown.rs/) for several reasons: it is significantly faster than esbuild; it has native support for code splitting via dynamic imports, which is central to the cold start strategy; it offers finer-grained control over the bundle output; and esbuild has known compatibility issues with certain dependencies. Teams adopting this pattern should use Rolldown rather than esbuild for the frontend bundle.

## Local development

Local development runs the same Fastify application as a plain Node.js server rather than through the Lambda adapter. This means the local environment is not a fully accurate representation of the deployed Lambda environment.

This is an accepted trade-off. It is mitigated by maintaining comprehensive end-to-end tests (Playwright) that run against the deployed environment, which will catch any issues caused by differences between local and Lambda execution.

## Static assets

Static assets (CSS, JavaScript, fonts, images) are served directly by Fastify using `@fastify/static`. Individual asset requests are fast (~25 ms), but a cold start penalty can still be incurred on the first request to a static asset path.

This is mitigated by setting long-lived `cache-control` headers on static asset responses. Assets with content-hashed URLs are served with `public, max-age=86400, immutable`, meaning each client only needs to request each asset once per deployment. Other assets use a shorter `public, max-age=300`.

A further mitigation would be to configure CloudFront caching policies to cache static assets at the edge, eliminating Lambda invocations for cached assets entirely. This is a known gap in the current Dev Platform CloudFront stack, which does not support custom cache policies. This should be addressed at the programme level.

## Future work

A batteries-included starter repository will be created based on this project, making it straightforward for other teams in the programme to adopt the Fastify-on-Lambda frontend pattern without having to solve the same foundational problems from scratch.
