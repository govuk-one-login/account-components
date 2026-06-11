# API Alarms Runbook

## Overview

This runbook covers the following second line production alarms for the Account Management Components (AMC) private API:

- [ApiApiGateway5XXErrorsAlarm](#apiapigateway5xxerrorsalarm)
- [ApiTokenLambdaErrorsAlarm](#apitokenlambdaerrorsalarm)
- [ApiTokenLambdaLogErrorAlarm](#apitokenlambdalogerroralarm)
- [ApiJourneyOutcomeLambdaErrorsAlarm](#apijourneyoutcomelambdaerrorsalarm)
- [ApiJourneyOutcomeLambdaLogErrorAlarm](#apijourneyoutcomelambdalogerroralarm)

## Context

AMC provides reusable account journeys which are initiated from either:

- An **Authentication (sign in/sign up) journey** — handed off from the Auth client
- **Account management (Home)** — handed off from the Home client

When a user finishes an AMC journey they are redirected back to the client's callback with an authorization code. The client can then:

1. Make a request to the `/token` endpoint to exchange the authorization code for a token.
2. Use the token to make a request to the `/journeyoutcome` endpoint to get details of the user's completed journey.

These endpoints form the private API and are consumed by the Auth and Home clients.

Journeys supported:

- Passkey creation during sign in
- Passkey creation from account management

## Owning Team

These alarms are owned by the **Home team** in the **Accounts pod**.

Slack channel: **[#di-one-login-home-tech](https://gds.slack.com/archives/C011Y5SAY3U)**

Resolution will likely need to be done by the Home team.

## Alarms

### ApiApiGateway5XXErrorsAlarm

**What it means:** The private API Gateway is returning more server errors (5XX) than expected.

**Investigation steps:**

1. Check the `amc-dashboard` CloudWatch dashboard for an overview of API health.
2. Check the API Lambda logs at `/aws/lambda/amc/ApiTokenLambda` and `/aws/lambda/amc/ApiJourneyOutcomeLambda` for errors occurring at the time of the alarm.
3. Check for any AWS regional service issues.
4. Check whether a recent deployment correlates with the start of errors.
5. Correlate with other AMC alarms — if Token or JourneyOutcome Lambda alarms are also firing, the root cause is likely in the Lambda itself.

### ApiTokenLambdaErrorsAlarm

**What it means:** The Token Lambda function is producing invocation errors (unhandled exceptions or timeouts).

**Investigation steps:**

1. Check the `amc-dashboard` CloudWatch dashboard.
2. Check the Token Lambda logs at `/aws/lambda/amc/ApiTokenLambda` for stack traces or timeout messages.
3. Check Lambda metrics (duration, memory usage, concurrent executions) for resource exhaustion.
4. Check downstream dependencies (e.g. DynamoDB, KMS) for availability issues.
5. Check whether a recent deployment correlates with the start of errors.

### ApiTokenLambdaLogErrorAlarm

**What it means:** The Token Lambda is logging ERROR or CRITICAL level messages at an elevated rate.

**Investigation steps:**

1. Check the `amc-dashboard` CloudWatch dashboard.
2. Check the Token Lambda logs at `/aws/lambda/amc/ApiTokenLambda` — filter for `level = "ERROR"` or `level = "CRITICAL"` to identify the specific error messages.
3. Check whether errors relate to authorization code validation, client authentication, or token signing.
4. Check downstream service health (DynamoDB, KMS).
5. Check whether a recent deployment correlates with the start of errors.

### ApiJourneyOutcomeLambdaErrorsAlarm

**What it means:** The Journey Outcome Lambda function is producing invocation errors (unhandled exceptions or timeouts).

**Investigation steps:**

1. Check the `amc-dashboard` CloudWatch dashboard.
2. Check the Journey Outcome Lambda logs at `/aws/lambda/amc/ApiJourneyOutcomeLambda` for stack traces or timeout messages.
3. Check Lambda metrics (duration, memory usage, concurrent executions) for resource exhaustion.
4. Check downstream dependencies (e.g. DynamoDB, KMS) for availability issues.
5. Check whether a recent deployment correlates with the start of errors.

### ApiJourneyOutcomeLambdaLogErrorAlarm

**What it means:** The Journey Outcome Lambda is logging ERROR or CRITICAL level messages at an elevated rate.

**Investigation steps:**

1. Check the `amc-dashboard` CloudWatch dashboard.
2. Check the Journey Outcome Lambda logs at `/aws/lambda/amc/ApiJourneyOutcomeLambda` — filter for `level = "ERROR"` or `level = "CRITICAL"` to identify the specific error messages.
3. Check whether errors relate to token validation or journey outcome retrieval.
4. Check downstream service health (DynamoDB, KMS).
5. Check whether a recent deployment correlates with the start of errors.

## Testing the Passkey Creation Journey

To verify the API is functioning correctly end-to-end, you can manually test the passkey creation journey:

1. Sign in to Home (account management) at https://home.account.gov.uk
2. Create a passkey from the account management area.

This exercises the full flow including the OAuth handoff, the frontend journey, and the subsequent `/token` and `/journeyoutcome` requests made by the client.

## Escalation

Contact the Home team via Slack at **[#di-one-login-home-tech](https://gds.slack.com/archives/C011Y5SAY3U)** for resolution.
