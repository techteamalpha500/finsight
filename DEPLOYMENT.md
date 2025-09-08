# Lambda Deployment Scripts

This directory contains individual deployment scripts for each Lambda function, allowing you to deploy specific functions without rebuilding everything.

## Available Scripts

### 1. `deploy-import-stocks.py`
Deploys only the **import-stocks** Lambda function.
- **Purpose**: Handles CAS file parsing and stock import functionality
- **Dependencies**: openpyxl, boto3, requests
- **Always rebuilds**: Yes (as per requirements)

```bash
./deploy-import-stocks.py
```

### 2. `deploy-portfolio-api.py`
Deploys only the **portfolio-api** Lambda function.
- **Purpose**: Handles portfolio and holdings API endpoints
- **Dependencies**: boto3
- **Always rebuilds**: No (only if requirements.txt changes)

```bash
./deploy-portfolio-api.py
```

### 3. `deploy-parse-mf-stocks.py`
Deploys only the **parse-mf-stocks** Lambda function.
- **Purpose**: Handles mutual fund and stock data parsing
- **Dependencies**: requests, boto3, charset_normalizer, urllib3, certifi, idna
- **Always rebuilds**: No (only if requirements.txt changes)

```bash
./deploy-parse-mf-stocks.py
```

### 4. `deploy-expenses-api.py`
Deploys only the **expenses-api** Lambda function.
- **Purpose**: Handles expenses tracking API endpoints
- **Dependencies**: boto3
- **Always rebuilds**: No (only if requirements.txt changes)

```bash
./deploy-expenses-api.py
```

## Usage Examples

### Deploy Only Import Stocks (Most Common)
When you make changes to the import functionality:
```bash
./deploy-import-stocks.py
```

### Deploy Only Portfolio API
When you make changes to holdings or portfolio logic:
```bash
./deploy-portfolio-api.py
```

### Deploy All Functions
Use the main deployment script:
```bash
./deploy-lambda.py
```

## Prerequisites

All scripts require:
- ✅ **Terraform** installed and configured
- ✅ **AWS CLI** configured with appropriate permissions
- ✅ **Python 3** with pip3

## What Each Script Does

1. **Checks Prerequisites**: Verifies Terraform and AWS CLI are available
2. **Builds Package**: Creates a ZIP file with source code and dependencies
3. **Verifies Dependencies**: Ensures critical dependencies are included
4. **Deploys with Terraform**: Uses targeted Terraform deployment
5. **Reports Success**: Confirms deployment completion

## Benefits

- ⚡ **Faster Deployments**: Only deploy what you changed
- 🔧 **Targeted Updates**: Update specific functions without affecting others
- 🧪 **Testing**: Deploy individual functions for testing
- 💰 **Cost Effective**: Reduce deployment time and resources

## Troubleshooting

### Common Issues

1. **Permission Denied**: Make sure scripts are executable
   ```bash
   chmod +x deploy-*.py
   ```

2. **Terraform Not Found**: Install Terraform
   ```bash
   # macOS
   brew install terraform
   
   # Ubuntu
   sudo apt-get install terraform
   ```

3. **AWS CLI Not Configured**: Configure AWS credentials
   ```bash
   aws configure
   ```

4. **Dependencies Missing**: Check requirements.txt files exist in Lambda directories

### Debug Mode

Add debug output by modifying the scripts to include more verbose logging.

## File Structure

```
/workspace/
├── deploy-lambda.py              # Main deployment script (all functions)
├── deploy-import-stocks.py       # Individual: import-stocks
├── deploy-portfolio-api.py       # Individual: portfolio-api
├── deploy-parse-mf-stocks.py     # Individual: parse-mf-stocks
├── deploy-expenses-api.py        # Individual: expenses-api
└── DEPLOYMENT.md                 # This documentation
```

## Notes

- **import-stocks** always rebuilds dependencies (as per requirements)
- Other functions only rebuild if requirements.txt changes
- All scripts use separate build directories to avoid conflicts
- ZIP files are created in the `terraform/` directory
- Terraform targets specific resources to avoid unnecessary updates