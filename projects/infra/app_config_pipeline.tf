resource "aws_cloudformation_stack" "deploy" {
  name          = "app-config-stack"
  parameters    = {
    AlarmOne                                = "none"
    AlarmTwo                                = "none"
    AlarmThree                              = "none"
    ApplicationName                         = "account-management-components"
    ArtifactSourceBucketArn                 = "none"
    ArtifactSourceBucketAllowedAccounts     = length(var.allowed_config_access_accounts) == 0 ? "none" : join(",", var.allowed_config_access_accounts)
    ArtifactSourceBucketEventTriggerRoleArn = "none"
    AWSOrganizationId                       = "o-dpp53lco28"
    ConfigFileName                          = "config.zip"
    ConfigArtefactPath                      = "config.json"
    DeploymentDurationInMinutes             = 5
    DeploymentStrategy                      = "none"
    Environment                             = var.environment
    FinalBakeTimeInMinutes                  = 0
    GrowthFactor                            = 0
    OneLoginRepositoryName                  = "account-components"
    ProfileName                             = "operational"
    SigningKeyArn                           = "none"
    LambdaValidatorArn                      = "none"
  }

  template_body = file("${path.module}/app_config_pipeline.cf.yaml")
  capabilities  = var.capabilities
  on_failure    = var.on_failure
  iam_role_arn  = var.iam_role_arn
  tags = var.tags
}