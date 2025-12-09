resource "aws_sns_topic" "high_severity" {
    name = "${var.alarm_sns_topic_name}-high" 
    tags = {
        "Environment" = var.environment
        "Severity"    = "high"
    }
}

resource "aws_sns_topic" "low_severity" {
    name = "${var.alarm_sns_topic_name}-low" 
    tags = {
        "Environment" = var.environment
        "Severity"    = "low"
    }
}

resource "aws_ssm_parameter" "high_severity_topic_arn" {
    name  = "/alarms/high-severity/topic-arn"
    type  = "String"
    value = aws_sns_topic.high_severity.arn

    tags = {
        "Environment" = var.environment
    }
}

resource "aws_ssm_parameter" "low_severity_topic_arn" {
    name  = "/alarms/low-severity/topic-arn"
    type  = "String"
    value = aws_sns_topic.low_severity.arn

    tags = {
        "Environment" = var.environment
    }
}

resource "aws_iam_role" "high_severity_slack_chatbot" {
    name = "chatbot-${var.environment}-high"

    assume_role_policy = jsonencode({
        Version   = "2012-10-17"
        Statement = [{
            Effect    = "Allow"
            Principal = { Service = "chatbot.amazonaws.com" }
            Action    = "sts:AssumeRole"
        }]
    })
}

resource "aws_iam_role_policy_attachment" "high_severity_slack_chatbot" {
    role       = aws_iam_role.high_severity_slack_chatbot.name
    policy_arn = "arn:aws:iam::aws:policy/CloudWatchReadOnlyAccess"
}

resource "aws_chatbot_slack_channel_configuration" "high_severity" {
    configuration_name = "alarms-${var.environment}-high"
    iam_role_arn       = aws_iam_role.high_severity_slack_chatbot.arn
    slack_channel_id   = var.alarm_slack_channel_id
    slack_team_id      = var.alarm_slack_workspace_id
    sns_topic_arns     = [aws_sns_topic.high_severity.arn]
}

resource "aws_sns_topic_subscription" "pagerduty" {
    count = var.environment == "prod" && var.pagerduty_integration_endpoint != null ? 1 : 0

    topic_arn = aws_sns_topic.high_severity.arn
    protocol  = "https"
    endpoint  = var.pagerduty_integration_endpoint

    delivery_policy = jsonencode({
        healthyRetryPolicy = {
            minDelayTarget = 20
            maxDelayTarget = 20
            numRetries      = 3
            numNoDelayRetries = 0
            numMinDelayRetries = 1
            backoffFunction  = "linear"
        }
    })
}
