# Frontend Alarms Runbook

## Overview

This runbook covers the following second line production alarms for the Account Management Components (AMC) frontend:

- [FrontendApiGateway5XXErrorsAlarm](#frontendapigateway5xxerrorsalarm)
- [FrontendLambdaErrorsAlarm](#frontendlambdaerrorsalarm)
- [FrontendLambdaLogErrorAlarm](#frontendlambdalogerroralarm)

## AWS Account

Account: **di-account-components-prod** (494066295151)

Dashboard: [amc-dashboard](https://uk-digital-identity.awsapps.com/start/#/console?account_id=494066295151&role_name=ApprovedServiceSupport&destination=https%3A%2F%2Feu-west-2.console.aws.amazon.com%2Fcloudwatch%2Fhome%3Fregion%3Deu-west-2%23dashboards%2Fdashboard%2Famc-dashboard)

## Context

AMC provides reusable account journeys which are initiated from either:

- An **Authentication (sign in/sign up) journey** — handed off from the Auth client
- **Account management (Home)** — handed off from the Home client

The handoff between the Auth or Home client and AMC is via OAuth (starting at the `/authorize` route).

The frontend Lambda handles all publicly accessible journey routes and the initial `/authorize` route used for the handover to AMC.

Because AMC serves multiple journeys to different clients, the specific cause of an alarm may vary. The investigation steps below are general guidance.

Journeys supported:

- Passkey creation during sign in
- Passkey creation from account management

## Owning Team

These alarms are owned by the **Home team** in the **Accounts pod**.

Slack channel: **[#di-one-login-home-tech](https://gds.slack.com/archives/C011Y5SAY3U)**

Resolution will likely need to be done by the Home team.

## Alarms

### FrontendApiGateway5XXErrorsAlarm

**What it means:** The Frontend API Gateway is returning more server errors (5XX) than expected.

**Investigation steps:**

1. Check the `amc-dashboard` CloudWatch dashboard for an overview of frontend health.
2. Check the Frontend Lambda logs at `/aws/lambda/amc/FrontendLambda` for errors occurring at the time of the alarm.
3. Check for any AWS regional service issues.
4. Check whether a recent deployment correlates with the start of errors.
5. Correlate with other AMC alarms — if `FrontendLambdaErrorsAlarm` or `FrontendLambdaLogErrorAlarm` are also firing, the root cause is likely in the Lambda itself.

### FrontendLambdaErrorsAlarm

**What it means:** The Frontend Lambda function is producing invocation errors (unhandled exceptions or timeouts).

**Investigation steps:**

1. Check the `amc-dashboard` CloudWatch dashboard.
2. Check the Frontend Lambda logs at `/aws/lambda/amc/FrontendLambda` for stack traces or timeout messages.
3. Check Lambda metrics (duration, memory usage, concurrent executions) for resource exhaustion.
4. Check downstream dependencies (e.g. DynamoDB session store, external APIs) for availability issues.
5. Check whether a recent deployment correlates with the start of errors.

### FrontendLambdaLogErrorAlarm

**What it means:** The Frontend Lambda is logging ERROR or CRITICAL level messages at an elevated rate.

**Investigation steps:**

1. Check the `amc-dashboard` CloudWatch dashboard.
2. Check the Frontend Lambda logs at `/aws/lambda/amc/FrontendLambda` — filter for `level = "ERROR"` or `level = "CRITICAL"` to identify the specific error messages.
3. Use the log dimensions (`scope`, `client_id`, `path`) to narrow down which journey and client is affected.
4. Check whether the errors correlate with a specific route or journey step.
5. Check downstream service health (Auth, Home, external APIs).
6. Check whether a recent deployment correlates with the start of errors.

## Testing the Passkey Creation Journey

To verify the frontend is functioning correctly, you can manually test the passkey creation journey:

1. Sign in to Home (account management) at https://home.account.gov.uk
2. Create a passkey from the account management area.

This exercises the OAuth handoff from Home into AMC and the passkey creation journey routes served by the frontend Lambda.

## Escalation

Contact the Home team via Slack at **[#di-one-login-home-tech](https://gds.slack.com/archives/C011Y5SAY3U)** for resolution.
