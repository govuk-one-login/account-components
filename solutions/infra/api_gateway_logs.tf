resource "aws_cloudformation_stack" "api_gateway_logs_stack" {
  # See https://govukverify.atlassian.net/wiki/spaces/PLAT/pages/3377037345/API+gateway+logging
  name         = "api-gateway-logs"
  template_url = "https://template-storage-templatebucket-1upzyw6v9cs42.s3.amazonaws.com/api-gateway-logs/template.yaml"

  capabilities = ["CAPABILITY_NAMED_IAM", "CAPABILITY_AUTO_EXPAND"]
}
