resource "aws_cloudformation_stack" "cloudfront_stack" {
  # See https://govukverify.atlassian.net/wiki/spaces/PLAT/pages/4035936392/cloudfront-distribution+readme
  name         = "cloudfront"
  template_url = "https://template-storage-templatebucket-1upzyw6v9cs42.s3.amazonaws.com/cloudfront-distribution/template.yaml"

  parameters = {
    DistributionAlias                                             = var.hosted_zone_domain
    FraudHeaderEnabled                                            = "true"
    FraudHeadersFunctionName                                      = "TICFFraudHeadersCloudFrontFunction"
    OriginCloakingHeaderManagedSecretRotationMonthWeekDaySchedule = "THU#3"
    StandardLoggingEnabled                                        = "true"
    CloudFrontCertArn                                             = aws_cloudformation_stack.certificate_stack.outputs["CertificateARN"]
    OriginCloakingHeader                                          = "none"
    PreviousOriginCloakingHeader                                  = "none"
    LogDestination                                                = "none"
  }

  capabilities = ["CAPABILITY_NAMED_IAM", "CAPABILITY_AUTO_EXPAND"]
}
