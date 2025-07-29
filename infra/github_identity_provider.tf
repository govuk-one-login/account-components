resource "aws_cloudformation_stack" "github_identity_provider_stack" {
  count = var.create_build_stacks ? 1 : 0
  # See https://govukverify.atlassian.net/wiki/spaces/PLAT/pages/3375464923/GitHub+Identity+Provider
  name         = "github-identity-provider"
  template_url = "https://template-storage-templatebucket-1upzyw6v9cs42.s3.amazonaws.com/github-identity/template.yaml"

  parameters = {
    Environment = var.environment
    System      = var.system
  }

  capabilities = ["CAPABILITY_NAMED_IAM", "CAPABILITY_AUTO_EXPAND"]
}
