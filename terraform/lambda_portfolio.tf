variable "portfolio_lambda_name" {
  type        = string
  default     = "portfolio-api"
  description = "Portfolio Lambda function name"
}

data "archive_file" "portfolio_lambda_zip" {
  type        = "zip"
  source_dir  = "${path.root}/../backend/lambda/portfolio-api-py"
  output_path = "${path.module}/build/portfolio-api.zip"
}

resource "aws_iam_role" "portfolio_lambda_exec" {
  name = "${var.portfolio_lambda_name}-exec"
  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Effect = "Allow",
      Principal = { Service = "lambda.amazonaws.com" },
      Action   = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "portfolio_lambda_basic_logs" {
  role       = aws_iam_role.portfolio_lambda_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "portfolio_lambda_ddb_access" {
  name = "${var.portfolio_lambda_name}-ddb-access"
  role = aws_iam_role.portfolio_lambda_exec.id
  policy = jsonencode({
    Version = "2012-10-17",
    Statement: [{
      Effect: "Allow",
      Action: [
        "dynamodb:PutItem","dynamodb:GetItem","dynamodb:UpdateItem","dynamodb:DeleteItem","dynamodb:Scan","dynamodb:Query"
      ],
      Resource: [
        aws_dynamodb_table.invest.arn,
        aws_dynamodb_table.mutual_fund_schemes.arn,
        aws_dynamodb_table.holdings.arn,
        aws_dynamodb_table.asset_class_mapping.arn,
        aws_dynamodb_table.stock_companies.arn,
        aws_dynamodb_table.repayments.arn,
        aws_dynamodb_table.repayment_history.arn,
        "${aws_dynamodb_table.invest.arn}/index/*",
        "${aws_dynamodb_table.mutual_fund_schemes.arn}/index/*",
        "${aws_dynamodb_table.holdings.arn}/index/*",
        "${aws_dynamodb_table.stock_companies.arn}/index/*",
        "${aws_dynamodb_table.repayments.arn}/index/*",
        "${aws_dynamodb_table.repayment_history.arn}/index/*"
      ]
    }]
  })
}

resource "aws_lambda_function" "portfolio" {
  function_name = var.portfolio_lambda_name
  role          = aws_iam_role.portfolio_lambda_exec.arn
  handler       = "index.handler"
  runtime       = "python3.12"
  filename      = data.archive_file.portfolio_lambda_zip.output_path
  source_code_hash = data.archive_file.portfolio_lambda_zip.output_base64sha256

  timeout = 60
  
  environment {
    variables = {
      REGION                   = var.aws_region
      INVEST_TABLE             = aws_dynamodb_table.invest.name
      MUTUAL_FUND_SCHEMES_TABLE = aws_dynamodb_table.mutual_fund_schemes.name
      HOLDINGS_TABLE           = aws_dynamodb_table.holdings.name
      ASSET_CLASS_MAPPING_TABLE = aws_dynamodb_table.asset_class_mapping.name
      STOCK_COMPANIES_TABLE    = aws_dynamodb_table.stock_companies.name
    }
  }
}

resource "aws_apigatewayv2_api" "portfolio_http" {
  name          = "portfolio-http-api"
  protocol_type = "HTTP"
  cors_configuration {
    allow_origins = ["*"]
    allow_methods = ["GET","POST","PUT","DELETE","OPTIONS"]
    allow_headers = ["*"]
  }
}

resource "aws_apigatewayv2_authorizer" "portfolio_jwt" {
  count              = length(var.cognito_user_pool_id) > 0 && length(var.cognito_audience) > 0 ? 1 : 0
  api_id             = aws_apigatewayv2_api.portfolio_http.id
  name               = "jwt-authorizer"
  authorizer_type    = "JWT"
  identity_sources   = ["$request.header.Authorization"]
  jwt_configuration {
    audience = var.cognito_audience
    issuer   = "https://cognito-idp.${var.aws_region}.amazonaws.com/${var.cognito_user_pool_id}"
  }
}

resource "aws_apigatewayv2_integration" "portfolio_lambda" {
  api_id                 = aws_apigatewayv2_api.portfolio_http.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.portfolio.arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "portfolio_routes_public" {
  for_each = toset([
    "GET /mutual-funds",
    "GET /mutual-funds/search",
    "GET /stocks",
    "GET /stocks/search"
  ])
  api_id    = aws_apigatewayv2_api.portfolio_http.id
  route_key = each.value
  target    = "integrations/${aws_apigatewayv2_integration.portfolio_lambda.id}"
}

resource "aws_apigatewayv2_route" "portfolio_routes_protected" {
  for_each = toset([
    "POST /portfolio",
    "GET /portfolio",
    "PUT /portfolio/plan",
    "GET /portfolio/plan",
    "POST /holdings",
    "GET /holdings",
    "DELETE /holdings/{id}",
    "POST /transactions",
    "GET /transactions",
    "GET /repayments",
    "POST /repayments",
    "GET /repayments/{id}",
    "PUT /repayments/{id}",
    "DELETE /repayments/{id}",
    "POST /repayments/{id}/prepayment",
    "GET /repayments/{id}/history"
  ])
  api_id             = aws_apigatewayv2_api.portfolio_http.id
  route_key          = each.value
  target             = "integrations/${aws_apigatewayv2_integration.portfolio_lambda.id}"
  authorization_type = length(var.cognito_user_pool_id) > 0 && length(var.cognito_audience) > 0 ? "JWT" : "NONE"
  authorizer_id      = length(var.cognito_user_pool_id) > 0 && length(var.cognito_audience) > 0 ? aws_apigatewayv2_authorizer.portfolio_jwt[0].id : null
}

resource "aws_lambda_permission" "portfolio_apigw_invoke" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.portfolio.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.portfolio_http.execution_arn}/*/*"
}

resource "aws_apigatewayv2_stage" "portfolio_default" {
  api_id      = aws_apigatewayv2_api.portfolio_http.id
  name        = "$default"
  auto_deploy = true
}

output "portfolio_api_endpoint" {
  value = aws_apigatewayv2_api.portfolio_http.api_endpoint
}