resource "aws_cloudformation_stack" "main_cloudfront_stack" {
  # See https://govukverify.atlassian.net/wiki/spaces/PLAT/pages/4035936392/cloudfront-distribution+readme
  name         = "cloudfront-main"
  template_url = "https://template-storage-templatebucket-1upzyw6v9cs42.s3.amazonaws.com/cloudfront-distribution/template.yaml"

  parameters = {
    DistributionAlias                                             = var.hosted_zone_domain
    FraudHeaderEnabled                                            = "true"
    FraudHeadersFunctionName                                      = "TICFFraudHeadersCloudFrontFunction"
    OriginCloakingHeaderManagedSecretRotationMonthWeekDaySchedule = "THU#3" # pragma: allowlist-secret
    StandardLoggingEnabled                                        = "true"
    CloudFrontCertArn                                             = aws_cloudformation_stack.certificate_stack_virginia.outputs["CertificateARN"]
    OriginCloakingHeader                                          = "none"
    PreviousOriginCloakingHeader                                  = "none"
    LogDestination                                                = "none"
  }

  capabilities = ["CAPABILITY_NAMED_IAM", "CAPABILITY_AUTO_EXPAND"]
}

resource "aws_cloudformation_stack" "api_cloudfront_stack" {
  # See https://govukverify.atlassian.net/wiki/spaces/PLAT/pages/4035936392/cloudfront-distribution+readme
  name         = "cloudfront-api"
  template_url = "https://template-storage-templatebucket-1upzyw6v9cs42.s3.amazonaws.com/cloudfront-distribution/template.yaml"

  parameters = {
    DistributionAlias                                             = var.api_domain
    FraudHeaderEnabled                                            = "true"
    FraudHeadersFunctionName                                      = "TICFFraudHeadersCloudFrontFunction"
    OriginCloakingHeaderManagedSecretRotationMonthWeekDaySchedule = "THU#3" # pragma: allowlist-secret
    StandardLoggingEnabled                                        = "true"
    CloudFrontCertArn                                             = aws_cloudformation_stack.certificate_stack_virginia.outputs["CertificateARN"]
    OriginCloakingHeader                                          = "none"
    PreviousOriginCloakingHeader                                  = "none"
    LogDestination                                                = "none"
  }

  capabilities = ["CAPABILITY_NAMED_IAM", "CAPABILITY_AUTO_EXPAND"]
}
