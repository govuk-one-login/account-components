resource "aws_cloudformation_stack" "vpc_stack" {
  # See https://govukverify.atlassian.net/wiki/spaces/PLAT/pages/3531735041/VPC
  name         = "vpc"
  template_url = "https://template-storage-templatebucket-1upzyw6v9cs42.s3.amazonaws.com/vpc/template.yaml"

  parameters = {
    CloudWatchApiEnabled          = "Yes"
    CloudFormationEndpointEnabled = contains(["dev", "build"], var.environment) ? "Yes" : "No" # Required for integration tests to run when inside the VPC
    CloudWatchLogsApiEnabled      = contains(["dev", "build"], var.environment) ? "Yes" : "No" # Required for integration tests to run when inside the VPC
    SecretsManagerApiEnabled      = contains(["dev", "build"], var.environment) ? "Yes" : "No" # Required for integration tests to run when inside the VPC
    DynatraceApiEnabled           = "Yes"
    KMSApiEnabled                 = "Yes"
    SSMApiEnabled                 = "Yes"
    DynamoDBApiEnabled            = "Yes"
    AppConfigDataApiEnabled       = "Yes"
    S3ApiEnabled                  = "Yes"
    AllowRules                    = "pass tls $HOME_NET any -> $EXTERNAL_NET 443 (tls.sni; content:\"account.gov.uk\"; endswith; msg:\"Pass TLS to *.account.gov.uk\"; flow:established; sid:2001; rev:1;)"
    AllowedDomains                = "*.account.gov.uk"
    ExecuteApiGatewayEnabled      = "Yes"
  }

  capabilities = var.capabilities
}
