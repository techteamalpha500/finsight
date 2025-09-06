variable "expenses_table_name" {
  description = "DynamoDB table name for expenses"
  type        = string
  default     = "Expenses"
}

// CategoryMemory removed per simplified 


output "mutual_fund_schemes_table_name" {
  value = aws_dynamodb_table.mutual_fund_schemes.name
}

variable "category_rules_table_name" {
  description = "DynamoDB table name for global category rules"
  type        = string
  default     = "CategoryRules"
}

variable "user_budgets_table_name" {
  description = "DynamoDB table name for per-user default category budgets"
  type        = string
  default     = "UserBudgets"
}

variable "invest_table_name" {
  description = "Single-table DynamoDB for user, portfolios, allocations, holdings, transactions"
  type        = string
  default     = "InvestApp"
}

variable "mutual_fund_schemes_table_name" {
  description = "DynamoDB table name for mutual fund schemes"
  type        = string
  default     = "MutualFundSchemes"
}

variable "holdings_table_name" {
  description = "DynamoDB table name for holdings"
  type        = string
  default     = "holdings"
}

variable "asset_class_mapping_table_name" {
  description = "DynamoDB table name for asset class to portfolio role mapping"
  type        = string
  default     = "AssetClassMapping"
}

variable "stock_companies_table_name" {
  description = "DynamoDB table name for stock companies data"
  type        = string
  default     = "StockCompanies"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "dev"
}

resource "aws_dynamodb_table" "expenses" {
  name         = var.expenses_table_name
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "expenseId"

  attribute {
    name = "expenseId"
    type = "S"
  }

  # Attributes used by the GSI must be defined here
  attribute {
    name = "userId"
    type = "S"
  }

  attribute {
    name = "date"
    type = "S"
  }

  # GSI to efficiently query by userId and date for list and monthly summaries
  global_secondary_index {
    name            = "userId-date-index"
    hash_key        = "userId"
    range_key       = "date"
    projection_type = "ALL"
  }
}

// Removed CategoryMemory as per simplified flow (global rules only)

resource "aws_dynamodb_table" "category_rules" {
  name         = var.category_rules_table_name
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "rule"

  attribute {
    name = "rule"
    type = "S"
  }
}

resource "aws_dynamodb_table" "user_budgets" {
  name         = var.user_budgets_table_name
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "userId"

  attribute {
    name = "userId"
    type = "S"
  }
}

resource "aws_dynamodb_table" "invest" {
  name         = var.invest_table_name
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "pk"
  range_key    = "sk"

  attribute {
    name = "pk"
    type = "S"
  }

  attribute {
    name = "sk"
    type = "S"
  }

  # Generic GSI to support alternative access patterns when needed
  attribute {
    name = "GSI1PK"
    type = "S"
  }

  attribute {
    name = "GSI1SK"
    type = "S"
  }

  global_secondary_index {
    name            = "GSI1"
    hash_key        = "GSI1PK"
    range_key       = "GSI1SK"
    projection_type = "ALL"
  }
}

# DynamoDB table for mutual fund schemes
resource "aws_dynamodb_table" "mutual_fund_schemes" {
  name         = var.mutual_fund_schemes_table_name
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "scheme_code"

  attribute {
    name = "scheme_code"
    type = "S"
  }

  attribute {
    name = "date"
    type = "S"
  }

  attribute {
    name = "amc"
    type = "S"
  }

  attribute {
    name = "scheme_type"
    type = "S"
  }

  attribute {
    name = "asset_class"
    type = "S"
  }

  attribute {
    name = "portfolio_role"
    type = "S"
  }

  attribute {
    name = "plan"
    type = "S"
  }

  attribute {
    name = "option"
    type = "S"
  }

  attribute {
    name = "is_etf"
    type = "S"
  }

  attribute {
    name = "fund_name"
    type = "S"
  }

  # GSI for querying by date
  global_secondary_index {
    name     = "DateIndex"
    hash_key = "date"
    projection_type = "ALL"
  }

  # GSI for querying by AMC
  global_secondary_index {
    name     = "AMC-Date-Index"
    hash_key = "amc"
    range_key = "date"
    projection_type = "ALL"
  }

  # GSI for querying by scheme type
  global_secondary_index {
    name     = "SchemeType-Date-Index" 
    hash_key = "scheme_type"
    range_key = "date"
    projection_type = "ALL"
  }

  # GSI for querying by asset class - useful for portfolio analysis
  global_secondary_index {
    name     = "AssetClass-Date-Index" 
    hash_key = "asset_class"
    range_key = "date"
    projection_type = "ALL"
  }

  # GSI for querying by portfolio role - useful for portfolio analysis
  global_secondary_index {
    name     = "PortfolioRole-Date-Index" 
    hash_key = "portfolio_role"
    range_key = "date"
    projection_type = "ALL"
  }

  # GSI for querying by plan (Direct/Regular)
  global_secondary_index {
    name     = "Plan-Date-Index" 
    hash_key = "plan"
    range_key = "date"
    projection_type = "ALL"
  }

  # GSI for querying by option (Growth/IDCW)
  global_secondary_index {
    name     = "Option-Date-Index" 
    hash_key = "option"
    range_key = "date"
    projection_type = "ALL"
  }

  # GSI for querying by ETF status - essential for portfolio allocation
  global_secondary_index {
    name     = "ETF-Status-Index" 
    hash_key = "is_etf"
    projection_type = "ALL"
  }

  # GSI for querying by fund name for search functionality
  global_secondary_index {
    name     = "FundName-Index" 
    hash_key = "fund_name"
    projection_type = "ALL"
  }

  tags = {
    Name        = var.mutual_fund_schemes_table_name
    Environment = var.environment
    Project     = "finsight"
  }
}

# Dedicated holdings table for portfolio holdings
resource "aws_dynamodb_table" "holdings" {
  name         = var.holdings_table_name
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }

  # Attributes used by the GSI must be defined here
  attribute {
    name = "user_id"
    type = "S"
  }

  attribute {
    name = "created_at"
    type = "S"
  }

  global_secondary_index {
    name            = "userId-createdAt-index"
    hash_key        = "user_id"
    range_key       = "created_at"
    projection_type = "ALL"
  }

  tags = {
    Name        = var.holdings_table_name
    Environment = var.environment
    Project     = "finsight"
  }
}

# Asset class to portfolio role mapping table
resource "aws_dynamodb_table" "asset_class_mapping" {
  name         = var.asset_class_mapping_table_name
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "asset_class"

  attribute {
    name = "asset_class"
    type = "S"
  }

  tags = {
    Name        = var.asset_class_mapping_table_name
    Environment = var.environment
    Project     = "finsight"
  }
}

# Stock companies table for NSE and BSE data
resource "aws_dynamodb_table" "stock_companies" {
  name         = var.stock_companies_table_name
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "symbol"
  range_key    = "exchange"

  attribute {
    name = "symbol"
    type = "S"
  }

  attribute {
    name = "exchange"
    type = "S"
  }

  attribute {
    name = "companyName"
    type = "S"
  }

  attribute {
    name = "isinNumber"
    type = "S"
  }

  # GSI for searching by company name
  global_secondary_index {
    name     = "companyName-index"
    hash_key = "companyName"
    projection_type = "ALL"
  }

  # GSI for searching by ISIN
  global_secondary_index {
    name     = "isinNumber-index"
    hash_key = "isinNumber"
    projection_type = "ALL"
  }

  # GSI for searching by exchange
  global_secondary_index {
    name     = "exchange-index"
    hash_key = "exchange"
    projection_type = "ALL"
  }

  tags = {
    Name        = var.stock_companies_table_name
    Environment = var.environment
    Project     = "finsight"
  }
}

output "expenses_table_name" {
  value = aws_dynamodb_table.expenses.name
}

// category_memory_table_name output removed

output "category_rules_table_name" {
  value = aws_dynamodb_table.category_rules.name
}

output "user_budgets_table_name" {
  value = aws_dynamodb_table.user_budgets.name
}

output "holdings_table_name" {
  value = aws_dynamodb_table.holdings.name
}

output "asset_class_mapping_table_name" {
  value = aws_dynamodb_table.asset_class_mapping.name
}

output "stock_companies_table_name" {
  value = aws_dynamodb_table.stock_companies.name
}

# Repayments table
resource "aws_dynamodb_table" "repayments" {
  name           = "Repayments"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "user_id"
  range_key      = "repayment_id"

  attribute {
    name = "user_id"
    type = "S"
  }

  attribute {
    name = "repayment_id"
    type = "S"
  }

  attribute {
    name = "type"
    type = "S"
  }

  attribute {
    name = "status"
    type = "S"
  }

  global_secondary_index {
    name            = "TypeIndex"
    hash_key        = "type"
    projection_type = "ALL"
  }

  global_secondary_index {
    name            = "StatusIndex"
    hash_key        = "status"
    projection_type = "ALL"
  }

  tags = {
    Name        = "Repayments"
    Environment = "production"
  }
}

# Repayment History table
resource "aws_dynamodb_table" "repayment_history" {
  name           = "RepaymentHistory"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "user_id"
  range_key      = "repayment_id"

  attribute {
    name = "user_id"
    type = "S"
  }

  attribute {
    name = "repayment_id"
    type = "S"
  }

  attribute {
    name = "history_id"
    type = "S"
  }

  global_secondary_index {
    name            = "RepaymentHistoryIndex"
    hash_key        = "repayment_id"
    range_key       = "history_id"
    projection_type = "ALL"
  }

  tags = {
    Name        = "RepaymentHistory"
    Environment = "production"
  }
}

output "repayments_table_name" {
  value = aws_dynamodb_table.repayments.name
}

output "repayment_history_table_name" {
  value = aws_dynamodb_table.repayment_history.name
}