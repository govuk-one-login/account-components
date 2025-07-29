resource "aws_cloudformation_stack" "signer_stack" {
  count = var.create_build_stacks ? 1 : 0
  # See https://govukverify.atlassian.net/wiki/spaces/PLAT/pages/3377004573/AWS+Signer
  name         = "signer"
  template_url = "https://template-storage-templatebucket-1upzyw6v9cs42.s3.amazonaws.com/signer/template.yaml"

  parameters = {
    Environment = var.environment
    System      = var.system
  }

  capabilities = ["CAPABILITY_NAMED_IAM", "CAPABILITY_AUTO_EXPAND"]
}
