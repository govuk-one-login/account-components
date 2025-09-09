resource "aws_cloudformation_stack" "test_image_repository" {
  name         = "test-image-ecr"
  template_url = "https://template-storage-templatebucket-1upzyw6v9cs42.s3.amazonaws.com/test-image-repository/template.yaml"
  capabilities = ["CAPABILITY_NAMED_IAM"]
  parameters = {
    PipelineStackName  = "pipeline-main"
    RetainedImageCount = 100
  }
}