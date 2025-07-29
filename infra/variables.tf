variable "environment" {
  type        = string
  description = "The environment name"
  validation {
    condition     = contains(["dev", "build", "staging", "integration", "production"], var.environment)
    error_message = "Valid values for var: environment are (dev, build, staging, integration, production)."
  }
}

variable "hosted_zone_domain" {
  type        = string
  description = "The base domain to use for the account's hosted zone"
}

variable "create_build_stacks" {
  type        = bool
  description = "Whether or not to deploy the stacks for building and signing application code. Only needed in dev and build. Defaults to false."
  default     = false
}

variable "system" {
  type        = string
  description = "The name of the system. Used in tags."
  default     = "Account Managment Components"
}
