plugin "aws" {
    enabled = true
    version = "0.48.0"
    source  = "github.com/terraform-linters/tflint-ruleset-aws"
    signature = "pgp" # workaround for https://github.com/terraform-linters/tflint/issues/2594
}
