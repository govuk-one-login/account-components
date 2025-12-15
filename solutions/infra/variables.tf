variable "environment" {
  type        = string
  description = "The environment name"
  validation {
    condition     = contains(["dev", "build", "staging", "integration", "production"], var.environment)
    error_message = "Valid values for var: environment are (dev, build, staging, integration, production)"
  }
}

variable "hosted_zone_domain" {
  type        = string
  description = "The base domain to use for the account's hosted zone"
}

variable "stubs_domain" {
  type        = string
  description = "The domain to use for the stubs"
  default     = null
}

variable "api_domain" {
  type        = string
  description = "The domain to use for the public API"
}

variable "private_api_domain" {
  type        = string
  description = "The domain to use for the Private API"
}

variable "create_build_stacks" {
  type        = bool
  description = "Whether or not to deploy the stacks for building and signing application code. Only needed in dev and build. Defaults to false"
  default     = false
}

variable "system" {
  type        = string
  description = "The name of the system. Used in tags."
  default     = "Account Management Components"
}

variable "product" {
  type        = string
  description = "The name of the product. Used in tags."
  default     = "GOV.UK One Login"
}


variable "signer_allowed_accounts" {
  type        = list(string)
  description = "The AWS account IDs that can read the code signing KMS key"
}

variable "container_signer_key_arn" {
  type        = string
  description = "The ARN of the KMS key used to sign containers. This is the shared key deployed in build from the container-signer stack"
}

variable "signing_profile_arn" {
  type        = string
  description = "The ARN of the signing profile used to sign Lambda code. This is the shared profile deployed in build from the signer stack"
}

variable "additional_code_signing_version_arns" {
  type        = string
  description = "The ARN of an additional signing profile version used to sign Lambda code"
  default     = "arn:aws:signer:eu-west-2:216552277552:/signing-profiles/DynatraceSigner/5uwzCCGTPq"
}

variable "custom_kms_key_arn" {
  type        = string
  description = "The ARN of a custom KMS key that can be used to access secrets"
  default     = "arn:aws:kms:eu-west-2:216552277552:key/4bc58ab5-c9bb-4702-a2c3-5d339604a8fe"
}

variable "signing_profile_version_arn" {
  type        = string
  description = "The ARN of the signing profile version used to sign Lambda code. This is the shared profile deployed in build from the signer stack"
}

variable "core_artifact_source_bucket_arn" {
  type        = string
  description = "The ARN of the promotion bucket from the previous environment's core pipeline"
  default     = "none"
}

variable "core_artifact_source_bucket_event_trigger_role_arn" {
  type        = string
  description = "The ARN of the role to assume for promotion events from the previous environment's core pipeline"
  default     = "none"
}

variable "main_artifact_source_bucket_arn" {
  type        = string
  description = "The ARN of the promotion bucket from the previous environment's main pipeline"
  default     = "none"
}

variable "api_artifact_source_bucket_arn" {
  type        = string
  description = "The ARN of the promotion bucket from the previous environment's API pipeline"
  default     = "none"
}

variable "main_artifact_source_bucket_event_trigger_role_arn" {
  type        = string
  description = "The ARN of the role to assume for promotion events from the previous environment's main pipeline"
  default     = "none"
}

variable "api_artifact_source_bucket_event_trigger_role_arn" {
  type        = string
  description = "The ARN of the role to assume for promotion events from the previous environment's API pipeline"
  default     = "none"
}

variable "alarms_artifact_source_bucket_arn" {
  type        = string
  description = "The ARN of the promotion bucket from the previous environment's alarms pipeline"
  default     = "none"
}

variable "alarms_artifact_source_bucket_event_trigger_role_arn" {
  type        = string
  description = "The ARN of the role to assume for promotion events from the previous environment's alarms pipeline"
  default     = "none"
}

variable "repository_name" {
  type        = string
  description = "The Github repository name"
  default     = "account-components"
}

variable "allowed_promotion_accounts" {
  type        = list(string)
  description = "The AWS account IDs that this pipeline will promote to. Maximum 2 accounts"
  default     = []
}

variable "owner_email" {
  type        = string
  description = "The owning team's Google Group email address. Used for tagging and ECR scan notifications"
  default     = "one-login-home-team-tech@digital.cabinet-office.gov.uk"
}

variable "capabilities" {
  type    = list(string)
  default = ["CAPABILITY_NAMED_IAM", "CAPABILITY_AUTO_EXPAND"]
}

variable "on_failure" {
  type    = string
  default = "ROLLBACK"
}

variable "allowed_config_access_accounts" {
  type        = list(string)
  description = "The AWS account IDs that this can read config"
  default     = []
}

variable "config_artefact_path" {
  type        = string
  description = "The name of the JSON or YAML file within the ZIP file to be deployed to the AppConfig profile."
}

variable "config_signing_key_arn" {
  type        = string
  description = "The ARN of the KMS key to use to verify the provenance of the source artefact. If set to none a key will be created in the current account."
  default     = "none"
}

variable "config_alarm_one_arn" {
  type        = string
  description = "The ARN of an alarm of an alarm to monitoring deployments. Leave as none if no auto rollback is required."
  default     = "none"
}

variable "config_alarm_two_arn" {
  type        = string
  description = "The ARN of an alarm of an alarm to monitoring deployments. Leave as none if no auto rollback is required."
  default     = "none"
}

variable "config_alarm_three_arn" {
  type        = string
  description = "The ARN of an alarm of an alarm to monitoring deployments. Leave as none if no auto rollback is required."
  default     = "none"
}

variable "config_artifact_source_bucket_arn" {
  type        = string
  description = "The ARN of the S3 bucket to use as the source for configuration artefacts. If left as none then a new bucket is create in the account."
  default     = "none"
}

variable "config_artifact_source_bucket_event_trigger_role_arn" {
  type        = string
  description = "If ArtifactSourceBucketArn is set to pull artefacts from a different environment, this is the associated role to use to pull artefacts."
  default     = "none"
}

variable "config_deployment_duration_in_minutes" {
  type        = number
  description = "The deployment duration for the blue/green deploy, only required if DeploymentStrategy is not none"
  default     = 0
}

variable "config_final_bake_time_in_minutes" {
  type        = number
  description = "After the deployment this represents a period of time that AppConfig should continue to monitor the specified alarms for errors to trigger an rollback."
  default     = 0
}
