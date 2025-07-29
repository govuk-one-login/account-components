resource "aws_cloudformation_stack" "build_notifications_stack" {
  # See https://govukverify.atlassian.net/wiki/spaces/PLAT/pages/3377168419/Slack+build+notifications+-+via+AWS+Chatbot
  provider     = aws.london
  name         = "build-notifications"
  template_url = "https://template-storage-templatebucket-1upzyw6v9cs42.s3.amazonaws.com/build-notifications/template.yaml"

  parameters = {
    InitialNotificationStack = "Yes"
    SlackChannelId           = var.environment == "production" ? "C04D3SQNJ4B" : "C083UQKHPC2"
    EnrichedNotifications    = "True"
  }

  capabilities = ["CAPABILITY_NAMED_IAM", "CAPABILITY_AUTO_EXPAND"]
}
