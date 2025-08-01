resource "aws_cloudformation_stack" "certificate_expiry_stack" {
  # See https://govukverify.atlassian.net/wiki/spaces/PLAT/pages/3374843054/Certificate+Expiry
  name         = "certificate-expiry"
  template_url = "https://template-storage-templatebucket-1upzyw6v9cs42.s3.amazonaws.com/certificate-expiry/template.yaml"

  parameters = {
    DaysBeforeExpiry = 45
  }

  capabilities = ["CAPABILITY_NAMED_IAM", "CAPABILITY_AUTO_EXPAND"]
}
