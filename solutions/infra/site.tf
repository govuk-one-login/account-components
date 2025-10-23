terraform {
  required_version = "~> 1.12.0"

  backend "s3" {}

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
}

provider "aws" {
  region = "eu-west-2"

  default_tags {
    tags = {
      Product     = var.product
      System      = var.system
      Environment = var.environment
      Owner       = var.owner_email
    }
  }
}

provider "aws" {
  alias  = "virginia"
  region = "us-east-1"

  default_tags {
    tags = {
      Product     = var.product
      System      = var.system
      Environment = var.environment
      Owner       = var.owner_email
    }
  }
}
