# 0002 - Application architecture

## Decision

We will build a combined Fastify app deployed to AWS Lambda (Option 3).

We will comply with the following restrictions to meet our security standards:

- We will deploy a private API gateway for service to service routes
- We will deploy the application as 3 separate lambdas:
  - `/authorize` handler
  - `/token` and `/userinfo` handler (accessible on the private API only)
  - All other user-facing routes

## Context

See [ADR 0001](../adr/0001-initiative-description.md) for an overview of the service features.

The account components service doesn't have any long-term user data stores.
It provides a user interface for other GOV.UK One Login APIs - mostly the Account Management API.
It's more like a traditional frontend service with a few routes that will only be called by other GOV.UK One Login services.

We expect the traffic profile for this service to be 'low base, high burst.
When this service launches, the only component journey will be for locked out users to delete their account.
This will be low volume with a few thousand users per month.
However, we plan to move journeys into this service from the Authentication service, which means it will become part of the 'Create a new GOV.UK One Login' journey.
This is much higher traffic and will place this service on the critical path for new users trying to access a government service.
We need to start with an architecture that can easily scale to the levels we know we'll reach.

## Options

### 1. Containerised app on ECS / Fargate

We build a Node / Express application and deploy it as a container to ECS / Fargate.
This is the same pattern used for most frontend applications on GOV.UK One Login.

We'd be working in familiar territory but we know scaling these frontends is complex and time-consuming.
We would also not be able to easily separate permissions for different routes as there's significant overhead when creating a new ECS task.

### 2. Separate frontend (ECS / Fargate) & backend (Lambda) apps

We separate the user-facing routes that return HTML into a Node / Express application (as in Option 1), and build separate Lambda applications for the other routes.

This would allow us to give handlers for the more sensitive routes (like `/token` and `/userinfo`) elevated permissions over the user-facing code.

There are plenty of places in GOV.UK One Login that have demonstrated scaling Node Lambdas to our expected traffic levels.
We would have the same issues scaling the container as in Option 1.

### 3. Combined Fastify app deployed to Lambda (Chosen)

We build a single application that handles all routes using [Fastify](https://fastify.dev/) and deploy it to AWS Lambda.

Fastify is an Express-like framework that has [first-class support](https://github.com/fastify/aws-lambda-fastify) for running in Lambda.
This means we'd get a good developer experience as we can easily run the whole application locally, while still getting the simpler scaling from Lambda.
We could run the application locally with the SAM CLI which will also allow us to integration test our Cloudformation template.
This should mean we can release this feature more quickly, even with the time taken to learn the new framework as it's very similar to Express.

If we have particularly sensitive routes that require higher AWS permissions or performance needs, we could deploy these as a separate Lambda function.
In that case we'd still deploy the same application code but we could assign a different IAM role or private API gateway.

Initialising lots of code for unneeded routes in a Lambda puts us at risk of slow cold starts.
We can prevent this by only loading the handler (and dependent code) at the time of first request for that route.
We've performance tested this option and it comfortably met our performance NFRs.

Given the 'low base, high burst' traffic pattern we expect for this application, running on Lambda will allow us to scale faster
and will be significantly cheaper and more environmentally friendly than a container based app.

### 4. Combined Express app deployed to Lambda

The Frontend Capability team in GOV.UK One Login have been experimenting with running Express applications on AWS Lambda.
This has proved fairly complicated to get working so far.

We could try to finish this work and then build this service using the output.
This would mean we're working with a framework that's very well used across GOV.UK One Login.
Scaling to meet our expected traffic profile shouldn't be an issue and should have the same cost and environmental benefits as mentioned in Option 3.

However, we don't know how much more effort is required to get Express working before we can start building the service, and we do have a deadline to work to.
