# Lambda function for fetching and storing MF and stock data
resource "aws_lambda_function" "parse_mf_stocks" {
  filename         = "parse_mf_stocks.zip"
  function_name    = "parse-mf-stocks"
  role            = aws_iam_role.parse_mf_stocks_exec.arn
  handler         = "main.lambda_handler"
  source_code_hash = filebase64sha256("parse_mf_stocks.zip")
  runtime         = "python3.12"
  timeout         = 600  # 10 minutes timeout for data fetching

  environment {
    variables = {
      STOCK_COMPANIES_TABLE = aws_dynamodb_table.stock_companies.name
      MUTUAL_FUND_SCHEMES_TABLE = aws_dynamodb_table.mutual_fund_schemes.name
      KEEP_VARIANTS = "direct_growth_only"
    }
  }

  tags = {
    Name        = "parse-mf-stocks"
    Environment = var.environment
    Project     = "finsight"
  }
}

# IAM role for parse-mf-stocks Lambda
resource "aws_iam_role" "parse_mf_stocks_exec" {
  name = "parse-mf-stocks-exec"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name        = "parse-mf-stocks-exec"
    Environment = var.environment
    Project     = "finsight"
  }
}

# IAM policy for parse-mf-stocks Lambda
resource "aws_iam_role_policy" "parse_mf_stocks_policy" {
  name = "parse-mf-stocks-policy"
  role = aws_iam_role.parse_mf_stocks_exec.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        Effect = "Allow"
        Action = [
          "dynamodb:PutItem",
          "dynamodb:GetItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan",
          "dynamodb:BatchGetItem",
          "dynamodb:BatchWriteItem"
        ]
        Resource = [
          aws_dynamodb_table.stock_companies.arn,
          aws_dynamodb_table.mutual_fund_schemes.arn,
          "${aws_dynamodb_table.stock_companies.arn}/index/*",
          "${aws_dynamodb_table.mutual_fund_schemes.arn}/index/*"
        ]
      }
    ]
  })
}

# Attach basic execution role
resource "aws_iam_role_policy_attachment" "parse_mf_stocks_basic" {
  role       = aws_iam_role.parse_mf_stocks_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Archive file for Lambda deployment
# Note: This ZIP file is created by deploy-lambda.py with dependencies included
# We use a local_file data source to reference the pre-built ZIP
data "local_file" "parse_mf_stocks_zip" {
  filename = "parse_mf_stocks.zip"
}

# CloudWatch Log Group for parse-mf-stocks Lambda
resource "aws_cloudwatch_log_group" "parse_mf_stocks_logs" {
  name              = "/aws/lambda/parse-mf-stocks"
  retention_in_days = 14

  tags = {
    Name        = "parse-mf-stocks-logs"
    Environment = var.environment
    Project     = "finsight"
  }
}

# Output the Lambda function name
output "parse_mf_stocks_lambda_name" {
  value = aws_lambda_function.parse_mf_stocks.function_name
}

output "parse_mf_stocks_lambda_arn" {
  value = aws_lambda_function.parse_mf_stocks.arn
}