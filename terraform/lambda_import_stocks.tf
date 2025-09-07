variable "import_stocks_lambda_name" {
  type        = string
  default     = "import-stocks"
  description = "Import Stocks Lambda function name"
}

# Use pre-built ZIP file with dependencies
locals {
  import_stocks_zip_path = "${path.module}/import_stocks.zip"
}

resource "aws_iam_role" "import_stocks_lambda_exec" {
  name = "${var.import_stocks_lambda_name}-exec"
  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Effect = "Allow",
      Principal = { Service = "lambda.amazonaws.com" },
      Action   = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "import_stocks_lambda_basic_logs" {
  role       = aws_iam_role.import_stocks_lambda_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "import_stocks_lambda_ddb_access" {
  name = "${var.import_stocks_lambda_name}-ddb-access"
  role = aws_iam_role.import_stocks_lambda_exec.id
  policy = jsonencode({
    Version = "2012-10-17",
    Statement: [{
      Effect: "Allow",
      Action: [
        "dynamodb:PutItem","dynamodb:GetItem","dynamodb:UpdateItem","dynamodb:DeleteItem","dynamodb:Scan","dynamodb:Query"
      ],
      Resource: [
        aws_dynamodb_table.holdings.arn,
        "${aws_dynamodb_table.holdings.arn}/index/*"
      ]
    }]
  })
}

resource "aws_lambda_function" "import_stocks" {
  function_name = var.import_stocks_lambda_name
  role          = aws_iam_role.import_stocks_lambda_exec.arn
  handler       = "index.handler"
  runtime       = "python3.12"
  filename      = local.import_stocks_zip_path
  source_code_hash = filebase64sha256(local.import_stocks_zip_path)

  timeout = 60
  
  environment {
    variables = {
      REGION                   = var.aws_region
      HOLDINGS_TABLE           = aws_dynamodb_table.holdings.name
    }
  }
}

resource "aws_apigatewayv2_api" "import_stocks_http" {
  name          = "import-stocks-http-api"
  protocol_type = "HTTP"
  cors_configuration {
    allow_origins = ["*"]
    allow_methods = ["GET","POST","PUT","DELETE","OPTIONS"]
    allow_headers = ["*"]
  }
}

resource "aws_apigatewayv2_authorizer" "import_stocks_jwt" {
  count              = length(var.cognito_user_pool_id) > 0 && length(var.cognito_audience) > 0 ? 1 : 0
  api_id             = aws_apigatewayv2_api.import_stocks_http.id
  name               = "jwt-authorizer"
  authorizer_type    = "JWT"
  identity_sources   = ["$request.header.Authorization"]
  jwt_configuration {
    audience = var.cognito_audience
    issuer   = "https://cognito-idp.${var.aws_region}.amazonaws.com/${var.cognito_user_pool_id}"
  }
}

resource "aws_apigatewayv2_integration" "import_stocks_lambda" {
  api_id                 = aws_apigatewayv2_api.import_stocks_http.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.import_stocks.arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "import_stocks_routes" {
  for_each = toset([
    "POST /parse-cas"
  ])
  api_id             = aws_apigatewayv2_api.import_stocks_http.id
  route_key          = each.value
  target             = "integrations/${aws_apigatewayv2_integration.import_stocks_lambda.id}"
  authorization_type = length(var.cognito_user_pool_id) > 0 && length(var.cognito_audience) > 0 ? "JWT" : "NONE"
  authorizer_id      = length(var.cognito_user_pool_id) > 0 && length(var.cognito_audience) > 0 ? aws_apigatewayv2_authorizer.import_stocks_jwt[0].id : null
}

resource "aws_lambda_permission" "import_stocks_apigw_invoke" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.import_stocks.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.import_stocks_http.execution_arn}/*/*"
}

resource "aws_apigatewayv2_stage" "import_stocks_default" {
  api_id      = aws_apigatewayv2_api.import_stocks_http.id
  name        = "$default"
  auto_deploy = true
}

output "import_stocks_lambda_name" {
  value = aws_lambda_function.import_stocks.function_name
}

output "import_stocks_lambda_arn" {
  value = aws_lambda_function.import_stocks.arn
}

output "import_stocks_api_endpoint" {
  value = aws_apigatewayv2_api.import_stocks_http.api_endpoint
}