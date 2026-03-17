resource "aws_cloudformation_stack" "build_notifications_stack" {
  # See https://govukverify.atlassian.net/wiki/spaces/PLAT/pages/3377168419/Slack+build+notifications+-+via+AWS+Chatbot
  name         = "build-notifications"
  template_url = "https://template-storage-templatebucket-1upzyw6v9cs42.s3.amazonaws.com/build-notifications/template.yaml"

  parameters = {
    BuildNotificationSlackChannelId = var.environment == "production" ? "C0ALMLUAZE3" : "C0AMXCUQEQG"
    CriticalSlackChannelId          = var.environment == "production" ? "C0ALZMSQQTX" : "C0AM3500JUA"
    SecondLineSlackChannelId        = var.environment == "production" ? "C0AM352UZT4" : "none" # Stack does not allow SecondLineSlackChannelId in non-prod environments
    WarningSlackChannelId           = var.environment == "production" ? "C0AM13L5H7G" : "C0AM13NDKKQ"
    EnrichedNotifications           = "True"
    Environment                     = var.environment
  }

  capabilities = ["CAPABILITY_NAMED_IAM", "CAPABILITY_AUTO_EXPAND"]
}
