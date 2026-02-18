resource "aws_cloudformation_stack" "vpc_stack" {
  # See https://govukverify.atlassian.net/wiki/spaces/PLAT/pages/3531735041/VPC
  name         = "vpc"
  template_url = "https://template-storage-templatebucket-1upzyw6v9cs42.s3.amazonaws.com/vpc/template.yaml"

  parameters = {
    CloudWatchApiEnabled          = "Yes"
    CloudFormationEndpointEnabled = contains(["dev", "build"], var.environment) ? "Yes" : "No" # Required for integration tests to run when inside the VPC
    CloudWatchLogsApiEnabled      = contains(["dev", "build"], var.environment) ? "Yes" : "No" # Required for integration tests to run when inside the VPC
    SecretsManagerApiEnabled      = "Yes"
    DynatraceApiEnabled           = "Yes"
    KMSApiEnabled                 = "Yes"
    SSMApiEnabled                 = "Yes"
    DynamoDBApiEnabled            = "Yes"
    AppConfigDataApiEnabled       = "Yes"
    S3ApiEnabled                  = "Yes"
    SQSApiEnabled                 = "Yes"
    AllowRules                    = "pass tls $HOME_NET any -> $EXTERNAL_NET 443 (tls.sni; content:\".notifications.service.gov.uk\"; endswith; msg:\"Pass TLS to *.notifications.service.gov.uk\"; flow:established; sid:2001; rev:1;)\npass tls $HOME_NET any -> $EXTERNAL_NET 443 (tls.sni; content:\".fidoalliance.org\"; endswith; msg:\"Pass TLS to *.fidoalliance.org\"; flow:established; sid:2002; rev:1;)"
    AllowedDomains                = "*.notifications.service.gov.uk,*.fidoalliance.org"
    ExecuteApiGatewayEnabled      = "Yes"
  }

  capabilities = var.capabilities
}
