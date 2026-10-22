resource "aws_cloudformation_stack" "iam" {
  name = "iam"
  parameters = {
    SAMStackName = var.sam_stack_name
  }
  template_body = file("./iam.cf.yaml")
  capabilities  = ["CAPABILITY_NAMED_IAM"]
}
