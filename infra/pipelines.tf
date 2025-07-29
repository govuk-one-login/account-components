# See https://govukverify.atlassian.net/wiki/spaces/PLAT/pages/3059908609/How+to+deploy+a+SAM+application+with+secure+pipelines
resource "aws_cloudformation_stack" "main_pipeline_stack" {
  name         = "components-pipeline-main"
  template_url = "https://template-storage-templatebucket-1upzyw6v9cs42.s3.amazonaws.com/sam-deploy-pipeline/template.yaml"

  parameters = {
    SAMStackName                            = "account-components-${var.environment}-main"
    Environment                             = var.environment
    VpcStackName                            = "vpc"
    ContainerSignerKmsKeyArn                = var.container_signer_key_arn
    SigningProfileArn                       = var.signing_profile_arn
    SigningProfileVersionArn                = var.signing_profile_version_arn
    ArtifactSourceBucketArn                 = var.artifact_source_bucket_arn
    ArtifactSourceBucketEventTriggerRoleArn = var.artifact_source_bucket_event_trigger_role_arn
    GitHubRepositoryName                    = var.create_build_stacks ? var.repository_name : "none"
    IncludePromotion                        = contains(["build", "staging"], var.environment) ? "Yes" : "No"
    AllowedAccounts                         = join(",", var.allowed_promotion_accounts)
    BuildNotificationStackName              = "build-notifications"
    SlackNotificationType                   = var.environment == "production" ? "All" : "Failures"
  }

  capabilities = ["CAPABILITY_NAMED_IAM", "CAPABILITY_AUTO_EXPAND"]
  depends_on   = [aws_cloudformation_stack.vpc_stack, aws_cloudformation_stack.build_notifications_stack]
}

resource "aws_cloudformation_stack" "core_pipeline_stack" {
  name         = "components-pipeline-core"
  template_url = "https://template-storage-templatebucket-1upzyw6v9cs42.s3.amazonaws.com/sam-deploy-pipeline/template.yaml"

  parameters = {
    SAMStackName                            = "account-components-${var.environment}-core"
    Environment                             = var.environment
    VpcStackName                            = "vpc"
    ContainerSignerKmsKeyArn                = var.container_signer_key_arn
    SigningProfileArn                       = var.signing_profile_arn
    SigningProfileVersionArn                = var.signing_profile_version_arn
    ArtifactSourceBucketArn                 = var.artifact_source_bucket_arn
    ArtifactSourceBucketEventTriggerRoleArn = var.artifact_source_bucket_event_trigger_role_arn
    GitHubRepositoryName                    = var.create_build_stacks ? var.repository_name : "none"
    IncludePromotion                        = contains(["build", "staging"], var.environment) ? "Yes" : "No"
    AllowedAccounts                         = join(",", var.allowed_promotion_accounts)
    BuildNotificationStackName              = "build-notifications"
    SlackNotificationType                   = var.environment == "production" ? "All" : "Failures"
  }

  capabilities = ["CAPABILITY_NAMED_IAM", "CAPABILITY_AUTO_EXPAND"]
  depends_on   = [aws_cloudformation_stack.vpc_stack, aws_cloudformation_stack.build_notifications_stack]
}

resource "aws_cloudformation_stack" "alarms_pipeline_stack" {
  name         = "components-pipeline-alarms"
  template_url = "https://template-storage-templatebucket-1upzyw6v9cs42.s3.amazonaws.com/sam-deploy-pipeline/template.yaml"

  parameters = {
    SAMStackName                            = "account-components-${var.environment}-alarms"
    Environment                             = var.environment
    VpcStackName                            = "vpc"
    ContainerSignerKmsKeyArn                = var.container_signer_key_arn
    SigningProfileArn                       = var.signing_profile_arn
    SigningProfileVersionArn                = var.signing_profile_version_arn
    ArtifactSourceBucketArn                 = var.artifact_source_bucket_arn
    ArtifactSourceBucketEventTriggerRoleArn = var.artifact_source_bucket_event_trigger_role_arn
    GitHubRepositoryName                    = var.create_build_stacks ? var.repository_name : "none"
    IncludePromotion                        = contains(["build", "staging"], var.environment) ? "Yes" : "No"
    AllowedAccounts                         = join(",", var.allowed_promotion_accounts)
    BuildNotificationStackName              = "build-notifications"
    SlackNotificationType                   = var.environment == "production" ? "All" : "Failures"
  }

  capabilities = ["CAPABILITY_NAMED_IAM", "CAPABILITY_AUTO_EXPAND"]
  depends_on   = [aws_cloudformation_stack.vpc_stack, aws_cloudformation_stack.build_notifications_stack]
}

resource "aws_cloudformation_stack" "mocks_pipeline_stack" {
  count        = contains(["build", "dev"], var.environment) ? 1 : 0
  name         = "components-pipeline-mocks"
  template_url = "https://template-storage-templatebucket-1upzyw6v9cs42.s3.amazonaws.com/sam-deploy-pipeline/template.yaml"

  parameters = {
    SAMStackName                            = "account-components-${var.environment}-alarms"
    Environment                             = var.environment
    VpcStackName                            = "vpc"
    ContainerSignerKmsKeyArn                = var.container_signer_key_arn
    SigningProfileArn                       = var.signing_profile_arn
    SigningProfileVersionArn                = var.signing_profile_version_arn
    ArtifactSourceBucketArn                 = var.artifact_source_bucket_arn
    ArtifactSourceBucketEventTriggerRoleArn = var.artifact_source_bucket_event_trigger_role_arn
    GitHubRepositoryName                    = var.create_build_stacks ? var.repository_name : "none"
    IncludePromotion                        = contains(["build", "staging"], var.environment) ? "Yes" : "No"
    AllowedAccounts                         = join(",", var.allowed_promotion_accounts)
    BuildNotificationStackName              = "build-notifications"
    SlackNotificationType                   = "Failures"
  }

  capabilities = ["CAPABILITY_NAMED_IAM", "CAPABILITY_AUTO_EXPAND"]
  depends_on   = [aws_cloudformation_stack.vpc_stack, aws_cloudformation_stack.build_notifications_stack]
}
