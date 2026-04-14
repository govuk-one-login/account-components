# See https://govukverify.atlassian.net/wiki/spaces/PLAT/pages/3059908609/How+to+deploy+a+SAM+application+with+secure+pipelines

resource "aws_cloudformation_stack" "amc_pipeline_stack" {
  name         = "pipeline-amc"
  template_url = "https://template-storage-templatebucket-1upzyw6v9cs42.s3.amazonaws.com/sam-deploy-pipeline/template.yaml"

  parameters = {
    SAMStackName                            = "amc"
    Environment                             = var.environment
    VpcStackName                            = "vpc"
    SigningProfileArn                       = var.signing_profile_arn
    SigningProfileVersionArn                = var.signing_profile_version_arn
    AdditionalCodeSigningVersionArns        = var.additional_code_signing_version_arns
    CustomKmsKeyArns                        = var.custom_kms_key_arn
    ArtifactSourceBucketArn                 = var.artifact_source_bucket_arn
    ArtifactSourceBucketEventTriggerRoleArn = var.artifact_source_bucket_event_trigger_role_arn
    GitHubRepositoryName                    = var.create_build_stacks ? var.repository_name : "none"
    TestImageRepositoryNames                = contains(["dev", "build"], var.environment) ? var.repository_name : ""
    TestImageRepositoryUri                  = contains(["dev", "build"], var.environment) ? aws_cloudformation_stack.test_image_repository[0].outputs["TestRunnerImageEcrRepositoryUri"] : "none"
    TestReportFormat                        = "CUCUMBERJSON"
    RunTestContainerInVPC                   = "True"
    IncludePromotion                        = contains(["build", "staging"], var.environment) ? "Yes" : "No"
    AllowedAccounts                         = join(",", var.allowed_promotion_accounts)
    BuildNotificationStackName              = "build-notifications"
    SlackNotificationType                   = var.environment == "dev" ? "None" : "All"
    ProgrammaticPermissionsBoundary         = "True"
    AllowedServiceOne                       = "AppConfig"
    AllowedServiceTwo                       = "EC2" # Required to attach lambdas to VPC
    AllowedServiceThree                     = "DynamoDB"
    AllowedServiceFour                      = "Lambda" # Required for canaries
    AllowedServiceFive                      = "Xray"
    AllowedServiceSix                       = "SQS"
    AllowedServiceSeven                     = "SSM"
    LambdaCanaryDeployment                  = contains(["production", "integration"], var.environment) ? "Canary10Percent30Minutes" : "AllAtOnce"
  }

  capabilities = var.capabilities
  depends_on   = [aws_cloudformation_stack.spoke_vpc_stack, aws_cloudformation_stack.build_notifications_stack]
}

resource "aws_cloudformation_stack" "amc_config_pipeline_stack" {
  name = "pipeline-amc-app-config"
  parameters = {
    AlarmOne                                = var.config_alarm_one_arn
    AlarmTwo                                = var.config_alarm_two_arn
    AlarmThree                              = var.config_alarm_three_arn
    ApplicationName                         = "account-components"
    ArtifactSourceBucketArn                 = var.config_artifact_source_bucket_arn
    ArtifactSourceBucketAllowedAccounts     = length(var.allowed_config_access_accounts) == 0 ? "none" : join(",", var.allowed_config_access_accounts)
    ArtifactSourceBucketEventTriggerRoleArn = var.config_artifact_source_bucket_event_trigger_role_arn
    AWSOrganizationId                       = "o-pjzf8d99ys,o-dpp53lco28"
    ConfigFileName                          = "config.zip"
    ConfigArtefactPath                      = var.config_artefact_path
    DeploymentDurationInMinutes             = var.config_deployment_duration_in_minutes
    DeployEventBusPolicy                    = "False"
    DeploymentStrategy                      = "none"
    Environment                             = var.environment
    FinalBakeTimeInMinutes                  = var.config_final_bake_time_in_minutes
    GrowthFactor                            = 0
    OneLoginRepositoryName                  = var.config_artifact_source_bucket_arn == "none" ? "account-components" : "none"
    ProfileName                             = "operational"
    SigningKeyArn                           = var.config_signing_key_arn
    LambdaValidatorArn                      = "none"
  }

  template_body = file("${path.module}/app_config_pipeline.cf.yaml")
  capabilities  = var.capabilities
  on_failure    = var.on_failure
}
