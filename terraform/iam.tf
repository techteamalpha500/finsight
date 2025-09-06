variable "app_role_name" {
  description = "IAM role name for app to access DynamoDB"
  type        = string
  default     = "finsight-app-role"
}

data "aws_iam_policy_document" "ddb_access" {
  statement {
    effect = "Allow"
    actions = [
      "dynamodb:PutItem",
      "dynamodb:GetItem",
      "dynamodb:UpdateItem",
      "dynamodb:DeleteItem",
      "dynamodb:Scan",
      "dynamodb:Query"
    ]
    resources = [
      aws_dynamodb_table.expenses.arn,
      aws_dynamodb_table.category_rules.arn,
      aws_dynamodb_table.user_budgets.arn,
      aws_dynamodb_table.invest.arn,
      "${aws_dynamodb_table.expenses.arn}/index/userId-date-index",
      "${aws_dynamodb_table.invest.arn}/index/*"
    ]
  }
}

resource "aws_iam_policy" "ddb_access" {
  name   = "finsight-ddb-access"
  policy = data.aws_iam_policy_document.ddb_access.json
}

resource "aws_iam_role" "app_role" {
  name = var.app_role_name
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
      Action   = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "attach_ddb" {
  role       = aws_iam_role.app_role.name
  policy_arn = aws_iam_policy.ddb_access.arn
}

output "app_role_arn" {
  value = aws_iam_role.app_role.arn
}