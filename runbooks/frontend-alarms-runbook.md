# Frontend Alarms Runbook

## Overview

This runbook covers the following second line production alarms for the Account Management Components (AMC) frontend in the AWS account **di-account-components-prod** (494066295151):

- [FrontendApiGateway5XXErrorsAlarm](#frontendapigateway5xxerrorsalarm)
- [FrontendApiGatewayTrafficAnomalyAlarm](#frontendapigatewaytrafficanomalyalarm)
- [FrontendLambdaErrorsAlarm](#frontendlambdaerrorsalarm)
- [FrontendLambdaLogErrorAlarm](#frontendlambdalogerroralarm)
- [FrontendLambdaColdStartDurationAnomalyAlarm](#frontendlambdacoldstartdurationanomalyalarm)

These alarms are owned by the **Home team** in the **Accounts pod**.

Slack channel: **[#di-one-login-home-tech](https://gds.slack.com/archives/C011Y5SAY3U)**

## Context

AMC provides reusable account journeys which are initiated from either:

- An **Authentication (sign in/sign up) journey** — handed off from the Auth client
- **Account management (Home)** — handed off from the Home client

The handoff between the Auth or Home client and AMC is via OAuth (starting at the `/authorize` route).

The frontend Lambda handles all publicly accessible journey routes and the initial `/authorize` route used for the handover to AMC.

Journeys supported:

- Passkey creation during sign in
- Passkey creation in Home

Because AMC serves multiple journeys to different clients, the specific cause of an alarm may vary. The investigation steps below are general guidance.

## Investigation

### Check the Dashboard

Check the [AMC Dynatrace dashboard](https://bhe21058.live.dynatrace.com/#dashboard;id=c73876e9-7e9b-4962-b0ca-fc81b9e1164f;applyDashboardDefaults=true). This dashboard gives a high-level overview of the number of responses and errors within AMC and can be used to spot anomalies from usual patterns.

The [AMC CloudWatch dashboard](https://uk-digital-identity.awsapps.com/start/#/console?account_id=494066295151&destination=https%3A%2F%2Feu-west-2.console.aws.amazon.com%2Fcloudwatch%2Fhome%3Fregion%3Deu-west-2%23dashboards%2Fdashboard%2Famc-dashboard) can also be checked. This dashboard provides more information than the Dynatrace dashboard but requires a TEAM request to access it using the `ApprovedServiceSupport` role on the `di-account-components-prod` AWS account.

### Test the Journeys

When any of the alarms have been triggered then the following journeys may be experiencing degradation:

#### Passkey creation during sign in

The steps for testing passkey creation during sign in are available in the [Authentication team's runbook for passkey alarms](https://govukverify.atlassian.net/wiki/spaces/LO/pages/6754762776/Runbook+Handling+passkey+alarms#Set-up-a-passkey.1).

#### Passkey creation in Home

- Sign into [Home](https://home.account.gov.uk) using an account which has fewer than five passkeys
- Click "Security"
- Click "Manage your sign in details"
- Click "Set up a passkey"
- Follow the steps to add a passkey using an authenticator which does not already have passkeys on this account (e.g. if the account already has a "Chrome for Mac" passkey then use a different authenticator e.g. "iCloud Keychain")
- After adding a passkey it should appear in the list of passkeys on the "Manage your sign in details" page

## Severity and Escalation

These alarms may indicate a P3 incident. Out-of-hours escalation and support is not required. The Home team should be informed about the alarms by tagging `@one-login-home-developers` in Slack. Information about the investigations carried out and their findings should be included in the Slack thread. Home team developers can then help to decide whether the alarm relates to an incident or is a false positive.

## Alarm Specific Investigations (for escalations)

### FrontendApiGateway5XXErrorsAlarm

**What it means:** The Frontend API Gateway is returning more server errors (5XX) than expected.

**Investigation steps:**

1. Check the `amc-dashboard` CloudWatch dashboard for an overview of frontend health.
2. Check the Frontend Lambda logs at `/aws/lambda/amc/FrontendLambda` for errors occurring at the time of the alarm.
3. Check for any AWS regional service issues.
4. Check whether a recent deployment correlates with the start of errors.
5. Correlate with other AMC alarms — if `FrontendLambdaErrorsAlarm` or `FrontendLambdaLogErrorAlarm` are also firing, the root cause is likely in the Lambda itself.

### FrontendApiGatewayTrafficAnomalyAlarm

**What it means:** The Frontend API Gateway is receiving significantly less traffic than the ML-modelled baseline for the time of day and day of week. This may indicate an upstream issue preventing users from reaching AMC, a DNS or routing problem, or a significant drop in user activity.

**Investigation steps:**

1. Check the `amc-dashboard` CloudWatch dashboard for an overview of request counts and compare against typical patterns.
2. Check for any AWS regional service issues affecting API Gateway or CloudFront.
3. Check upstream services (Auth, Home) for availability issues that may be preventing users from reaching AMC.
4. Check DNS and routing — verify the CloudFront distribution and API Gateway domain are resolving correctly.
5. Check whether a recent deployment correlates with the start of the traffic drop.
6. Consider whether the drop may be expected (e.g. a planned maintenance window or a known reduction in upstream traffic).

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

### FrontendLambdaColdStartDurationAnomalyAlarm

**What it means:** The p90 cold start duration (`InitDuration`) of the Frontend Lambda has exceeded the anomaly detection band — i.e. it is significantly higher than the ML-modelled baseline. This may indicate a dependency being initialised during cold starts is slower than usual, or that a recent deployment has increased initialisation time.

**Investigation steps:**

1. Check the `amc-dashboard` CloudWatch dashboard — the "Frontend lambda cold start duration (p90) in milliseconds" widget shows the trend over time.
2. Check whether a recent deployment correlates with the increase — a larger bundle size or new initialisation-time dependencies can increase cold start duration.
3. Check Lambda metrics for memory pressure or CPU throttling which could slow initialisation.
4. If cold start durations are consistently elevated after a deployment, consider whether the change can be optimised to reduce initialisation work.
