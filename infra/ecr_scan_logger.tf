resource "aws_cloudformation_stack" "ecr_scan_logger_stack" {
  count = var.create_build_stacks ? 1 : 0
  # See https://govukverify.atlassian.net/wiki/spaces/PLAT/pages/3377102896/ECR+Scan+Result+Logger
  name         = "ecr-image-scan-findings-logger"
  template_url = "https://template-storage-templatebucket-1upzyw6v9cs42.s3.amazonaws.com/ecr-image-scan-findings-logger/template.yaml"

  parameters = {
    NotificationEmail = var.owner_email
  }

  capabilities = ["CAPABILITY_NAMED_IAM", "CAPABILITY_AUTO_EXPAND"]
}
