resource "aws_cloudformation_stack" "alarms" {
  name = "component-alarms"
  template_body = file("./alarms.cf.yaml")
  capabilities = ["CAPABILITY_NAMED_IAM"]
  
  parameters = {
    AlarmSlackChannelId = var.environment == "production" ? "C0A2N78NXDX" : "C0A1TS3EJ4X"
    AlarmSlackWorkspaceId = "T8GT9416G"
    Environment = var.environment
  }
}