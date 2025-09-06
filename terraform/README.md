# Finsight Terraform Infrastructure

This directory contains Terraform configuration for the Finsight application infrastructure.

## Quick Deployment

For all Lambda functions and infrastructure:

```bash
./deploy-lambda.py
```

This script will:
1. Build clean Lambda deployment packages with dependencies
2. Deploy all Lambda functions with Terraform
3. Set up all DynamoDB tables and API Gateway routes

## Architecture

### Lambda Functions
- **`parse-mf-stocks`** - Parses AMFI NAV data and NSE/BSE stock data
- **`portfolio-api`** - Portfolio management API (holdings, transactions)
- **`expenses-api`** - Expenses tracking API

### DynamoDB Tables
- **`MutualFundSchemes`** - Stores parsed mutual fund data
- **`StockCompanies`** - Stores NSE and BSE stock company data
- **`Holdings`** - User portfolio holdings
- **`Expenses`** - User expense transactions
- **`CategoryRules`** - Expense categorization rules
- **`UserBudgets`** - User budget configurations

### API Gateway
- **Portfolio API Routes** - `/portfolio/*` endpoints
- **Expenses API Routes** - `/expenses/*` endpoints

## Files

### Core Infrastructure
- `provider.tf` - AWS provider configuration
- `dynamodb.tf` - DynamoDB tables for all app data
- `versions.tf` - Terraform version constraints

### Lambda Functions
- `lambda_stocks.tf` - Parse MF/Stocks Lambda
- `lambda_portfolio.tf` - Portfolio API Lambda
- `lambda_api.tf` - Expenses API Lambda
- `iam.tf` - General IAM roles

### Other
- `aws_identity.tf` - AWS identity configuration

## Prerequisites

- AWS CLI configured
- Terraform installed  
- Python 3.12+

## Cost

Estimated monthly cost: ~$5-15 for all Lambda functions and associated resources.
