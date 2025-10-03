# See https://govukverify.atlassian.net/wiki/spaces/PLAT/pages/3059908609/How+to+deploy+a+SAM+application+with+secure+pipelines
resource "aws_cloudformation_stack" "main_pipeline_stack" {
  name         = "pipeline-main"
  template_url = "https://template-storage-templatebucket-1upzyw6v9cs42.s3.amazonaws.com/sam-deploy-pipeline/template.yaml"

  parameters = {
    SAMStackName                            = "components-main"
    Environment                             = var.environment
    VpcStackName                            = "vpc"
    ContainerSignerKmsKeyArn                = var.container_signer_key_arn
    SigningProfileArn                       = var.signing_profile_arn
    SigningProfileVersionArn                = var.signing_profile_version_arn
    AdditionalCodeSigningVersionArns        = var.additional_code_signing_version_arns
    CustomKmsKeyArns                        = var.custom_kms_key_arn
    ArtifactSourceBucketArn                 = var.main_artifact_source_bucket_arn
    ArtifactSourceBucketEventTriggerRoleArn = var.main_artifact_source_bucket_event_trigger_role_arn
    GitHubRepositoryName                    = var.create_build_stacks ? var.repository_name : "none"
    TestImageRepositoryNames                = var.repository_name
    TestImageRepositoryUri                  = contains(["dev", "build"], var.environment) ? aws_cloudformation_stack.test_image_repository.outputs["TestRunnerImageEcrRepositoryUri"] : ""
    IncludePromotion                        = contains(["build", "staging"], var.environment) ? "Yes" : "No"
    AllowedAccounts                         = join(",", var.allowed_promotion_accounts)
    BuildNotificationStackName              = "build-notifications"
    SlackNotificationType                   = var.environment == "production" ? "All" : "Failures"

  }

  capabilities = ["CAPABILITY_NAMED_IAM", "CAPABILITY_AUTO_EXPAND"]
  depends_on   = [aws_cloudformation_stack.vpc_stack, aws_cloudformation_stack.build_notifications_stack]
}

resource "aws_cloudformation_stack" "core_pipeline_stack" {
  name         = "pipeline-core"
  template_url = "https://template-storage-templatebucket-1upzyw6v9cs42.s3.amazonaws.com/sam-deploy-pipeline/template.yaml"

  parameters = {
    SAMStackName                            = "components-core"
    Environment                             = var.environment
    VpcStackName                            = "vpc"
    ContainerSignerKmsKeyArn                = var.container_signer_key_arn
    SigningProfileArn                       = var.signing_profile_arn
    SigningProfileVersionArn                = var.signing_profile_version_arn
    AdditionalCodeSigningVersionArns        = var.additional_code_signing_version_arns
    CustomKmsKeyArns                        = var.custom_kms_key_arn
    ArtifactSourceBucketArn                 = var.core_artifact_source_bucket_arn
    ArtifactSourceBucketEventTriggerRoleArn = var.core_artifact_source_bucket_event_trigger_role_arn
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
  name         = "pipeline-alarms"
  template_url = "https://template-storage-templatebucket-1upzyw6v9cs42.s3.amazonaws.com/sam-deploy-pipeline/template.yaml"

  parameters = {
    SAMStackName                            = "components-alarms"
    Environment                             = var.environment
    VpcStackName                            = "vpc"
    ContainerSignerKmsKeyArn                = var.container_signer_key_arn
    SigningProfileArn                       = var.signing_profile_arn
    SigningProfileVersionArn                = var.signing_profile_version_arn
    AdditionalCodeSigningVersionArns        = var.additional_code_signing_version_arns
    CustomKmsKeyArns                        = var.custom_kms_key_arn
    ArtifactSourceBucketArn                 = var.alarms_artifact_source_bucket_arn
    ArtifactSourceBucketEventTriggerRoleArn = var.alarms_artifact_source_bucket_event_trigger_role_arn
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
  name         = "pipeline-mocks"
  template_url = "https://template-storage-templatebucket-1upzyw6v9cs42.s3.amazonaws.com/sam-deploy-pipeline/template.yaml"

  parameters = {
    SAMStackName                     = "components-mocks"
    Environment                      = var.environment
    VpcStackName                     = "vpc"
    ContainerSignerKmsKeyArn         = var.container_signer_key_arn
    SigningProfileArn                = var.signing_profile_arn
    SigningProfileVersionArn         = var.signing_profile_version_arn
    AdditionalCodeSigningVersionArns = var.additional_code_signing_version_arns
    CustomKmsKeyArns                 = var.custom_kms_key_arn
    GitHubRepositoryName             = var.create_build_stacks ? var.repository_name : "none"
    IncludePromotion                 = "No"
    BuildNotificationStackName       = "build-notifications"
    SlackNotificationType            = "Failures"
  }

  capabilities = ["CAPABILITY_NAMED_IAM", "CAPABILITY_AUTO_EXPAND"]
  depends_on   = [aws_cloudformation_stack.vpc_stack, aws_cloudformation_stack.build_notifications_stack]
}
