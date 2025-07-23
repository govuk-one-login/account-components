resource "aws_cloudformation_stack" "hosted_zone" {
  name = "hosted_zone"
  parameters = {
    DomainName = var.hosted_zone_domain
  }
  template_body = file("./hosted_zone.yaml")
}
