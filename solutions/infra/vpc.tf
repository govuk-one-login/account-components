resource "aws_cloudformation_stack" "transit_gateway_cross_account_role" {
  # See https://govukverify.atlassian.net/wiki/spaces/PLAT/pages/5746426210/Transit+Gateway+Infrastructure+Reference#Latest-published-templates
  name         = "transit-gateway-cross-account-role"
  template_url = "https://template-storage-templatebucket-1upzyw6v9cs42.s3.eu-west-2.amazonaws.com/tgw-cross-account-role/template.yaml"

  parameters = {
    HubAccountId                 = var.transit_gateway_hub_account_id
    DisasterRecoveryHubAccountId = var.disaster_recovery_transit_gateway_hub_account_id
  }

  capabilities = var.capabilities
}

resource "aws_cloudformation_stack" "spoke_vpc_stack" {
  # See https://govukverify.atlassian.net/wiki/spaces/PLAT/pages/5746426210/Transit+Gateway+Infrastructure+Reference#Latest-published-templates
  name         = "vpc"
  template_url = "https://template-storage-templatebucket-1upzyw6v9cs42.s3.eu-west-2.amazonaws.com/spoke-vpc/template.yaml"

  parameters = {
    TransitGatewayId                 = var.transit_gateway_id
    DisasterRecoveryTransitGatewayId = var.disaster_recovery_transit_gateway_id
    UseDisasterRecovery              = var.disaster_recovery_transit_gateway_id != null ? "Yes" : "No"
    CloudWatchApiEnabled             = "Yes"
    CloudFormationEndpointEnabled    = contains(["dev", "build"], var.environment) ? "Yes" : "No" # Required for integration tests to run when inside the VPC
    CloudWatchLogsApiEnabled         = contains(["dev", "build"], var.environment) ? "Yes" : "No" # Required for integration tests to run when inside the VPC
    SecretsManagerApiEnabled         = "Yes"
    DynatraceApiEnabled              = "Yes"
    KMSApiEnabled                    = "Yes"
    SSMApiEnabled                    = "Yes"
    DynamoDBApiEnabled               = "Yes"
    AppConfigDataApiEnabled          = "Yes"
    S3ApiEnabled                     = "Yes"
    SQSApiEnabled                    = "Yes"
    ExecuteApiGatewayEnabled         = "Yes"
    AllowedDomains                   = "*.notifications.service.gov.uk"
    TestEgress                       = "https://www.notifications.service.gov.uk/"
  }

  capabilities = var.capabilities
}
