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

variable "signing_profile_version_arn" {
  type        = string
  description = "The ARN of the signing profile version used to Lambda code. This is the shared profile deployed in build from the signer stack"
}

variable "artifact_source_bucket_arn" {
  type        = string
  description = "The ARN of the promotion bucket from the previous environment"
  default     = "none"
}

variable "artifact_source_bucket_event_trigger_role_arn" {
  type        = string
  description = "The ARN of the role to assume for promotion events from the previous environment"
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
