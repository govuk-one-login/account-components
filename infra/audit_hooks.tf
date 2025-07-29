resource "aws_cloudformation_stack" "lambda_audit_hook_stack" {
  # See https://govukverify.atlassian.net/wiki/spaces/PLAT/pages/3376906289/Lambda+audit+hook
  provider     = aws.london
  name         = "lambda-audit-hook"
  template_url = "https://template-storage-templatebucket-1upzyw6v9cs42.s3.amazonaws.com/lambda-audit-hook/template.yaml"

  capabilities = ["CAPABILITY_NAMED_IAM", "CAPABILITY_AUTO_EXPAND"]
}

resource "aws_cloudformation_stack" "infrastructure_audit_hook_stack" {
  # See https://govukverify.atlassian.net/wiki/spaces/PLAT/pages/3375464940/Infrastructure+audit+hook
  provider     = aws.london
  name         = "infrastructure-audit-hook"
  template_url = "https://template-storage-templatebucket-1upzyw6v9cs42.s3.amazonaws.com/infrastructure-audit-hook/template.yaml"

  capabilities = ["CAPABILITY_NAMED_IAM", "CAPABILITY_AUTO_EXPAND"]
}
