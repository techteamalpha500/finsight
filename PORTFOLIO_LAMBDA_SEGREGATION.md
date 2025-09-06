# Portfolio Lambda Function Segregation

## Overview
This document describes the segregation of portfolio and holdings functionality from the expenses-api Lambda function into a separate portfolio-api Lambda function.

## Changes Made

### 1. New Portfolio Lambda Function
- **Location**: `backend/lambda/portfolio-api-py/index.py`
- **Purpose**: Handles all portfolio, holdings, and mutual fund related operations
- **Dependencies**: `requirements.txt` with boto3 and botocore

### 2. Cleaned Expenses Lambda Function
- **Location**: `backend/lambda/expenses-api-py/index.py`
- **Purpose**: Handles only expense-related operations (expenses, categories, budgets, rules)
- **Removed**: All portfolio, holdings, mutual fund, and investment related code

### 3. Terraform Configuration
- **New File**: `terraform/lambda_portfolio.tf` - Portfolio Lambda infrastructure
- **Updated File**: `terraform/lambda_api.tf` - Cleaned expenses Lambda infrastructure

### 4. Deployment Script
- **New File**: `deploy-portfolio-lambda.sh` - Script to deploy portfolio Lambda

### 5. Updated Frontend Code
- **Updated File**: `frontend/src/lib/dynamodb.ts` - Now supports both APIs
- **New File**: `frontend/.env.local.example` - Example environment variables
- **New Functions**: Added expense-related API functions
- **Separate API Calls**: Portfolio and expense functions use different base URLs

## Portfolio Lambda Endpoints

### Public Endpoints (No Authentication Required)
- `GET /mutual-funds` - Fetch all mutual fund schemes
- `GET /mutual-funds/search` - Search mutual funds with filters

### Protected Endpoints (JWT Authentication Required)
- `POST /portfolio` - Create a new portfolio
- `GET /portfolio` - List user's portfolios
- `PUT /portfolio/plan` - Save allocation plan
- `GET /portfolio/plan` - Fetch allocation plan
- `POST /holdings` - Create a new holding
- `GET /holdings` - List user's holdings
- `DELETE /holdings/{id}` - Delete a holding
- `POST /transactions` - Create a transaction
- `GET /transactions` - List transactions

## Expenses Lambda Endpoints

### Public Endpoints (No Authentication Required)
- `GET /health` - Health check
- `GET /categories` - Get expense categories

### Protected Endpoints (JWT Authentication Required)
- `POST /add` - Add new expense
- `PUT /add` - Update expense
- `POST /list` - List expenses
- `POST /edit` - Edit expense
- `POST /delete` - Delete expense
- `POST /summary/monthly` - Monthly expense summary
- `POST /summary/category` - Category-wise summary
- `GET /budgets` - Get budgets
- `PUT /budgets` - Update budgets

## Database Tables

### Portfolio Lambda Tables
- `InvestApp` - Portfolios and allocation plans
- `MutualFundSchemes` - Mutual fund data
- `holdings` - User holdings
- `AssetClassMapping` - Asset class to portfolio role mapping

### Expenses Lambda Tables
- `Expenses` - User expenses
- `CategoryRules` - Auto-categorization rules
- `UserBudgets` - User budget settings

## Deployment

### Deploy Portfolio Lambda
```bash
./deploy-portfolio-lambda.sh
```

### Deploy Expenses Lambda
```bash
cd terraform
terraform init
terraform plan
terraform apply
```

## Benefits of Segregation

1. **Separation of Concerns**: Each Lambda handles a specific domain
2. **Independent Scaling**: Portfolio and expenses can scale independently
3. **Easier Maintenance**: Smaller, focused codebases
4. **Security**: Different IAM roles and permissions for each function
5. **Performance**: Reduced cold start times and memory usage
6. **Deployment**: Independent deployments without affecting other functionality

## Environment Variables

### Frontend (.env.local)
```bash
# API Base URLs for segregated Lambda functions
NEXT_PUBLIC_API_BASE_EXPENSES=https://[expenses-api-gateway-url]
NEXT_PUBLIC_API_BASE_PORTFOLIO=https://[portfolio-api-gateway-url]

# Legacy support - keep the old variable for backward compatibility
NEXT_PUBLIC_API_BASE=https://[portfolio-api-gateway-url]

# AWS Configuration
NEXT_PUBLIC_AWS_REGION=us-east-1
NEXT_PUBLIC_AWS_ACCESS_KEY_ID=your_access_key_here
NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY=your_secret_key_here
```

### Portfolio Lambda
- `AWS_REGION` - AWS region
- `INVEST_TABLE` - Investment table name
- `MUTUAL_FUND_SCHEMES_TABLE` - Mutual fund schemes table name
- `HOLDINGS_TABLE` - Holdings table name
- `ASSET_CLASS_MAPPING_TABLE` - Asset class mapping table name

### Expenses Lambda
- `AWS_REGION` - AWS region
- `EXPENSES_TABLE` - Expenses table name
- `CATEGORY_RULES_TABLE` - Category rules table name
- `USER_BUDGETS_TABLE` - User budgets table name
- `GROQ_API_KEY` - Groq API key for AI categorization
- `GROQ_MODEL` - Groq model name

## IAM Permissions

### Portfolio Lambda IAM Role
- DynamoDB access to investment, mutual fund, holdings, and asset class mapping tables
- CloudWatch Logs access

### Expenses Lambda IAM Role
- DynamoDB access to expenses, category rules, and user budgets tables
- CloudWatch Logs access

## Migration Notes

1. **Frontend Updates**: 
   - Update `.env.local` with new environment variables
   - Frontend code has been updated to use separate API base URLs
   - Portfolio functions use `NEXT_PUBLIC_API_BASE_PORTFOLIO`
   - Expense functions use `NEXT_PUBLIC_API_BASE_EXPENSES`
   - Legacy support maintained with `NEXT_PUBLIC_API_BASE`

2. **Environment Variables**: Ensure both Lambdas have the correct environment variables
3. **IAM Roles**: Verify IAM permissions are correctly set for both functions
4. **API Gateway**: Both functions will have separate API Gateway instances
5. **Testing**: Test both functions independently before switching traffic

## Rollback Plan

If issues arise, you can:
1. Keep both functions running
2. Update frontend to use the original expenses Lambda for portfolio operations
3. Remove the portfolio Lambda and its infrastructure
4. Restore portfolio code to expenses Lambda