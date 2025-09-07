# 🌐 API Gateway Configuration Guide

## 🚨 **Current Issue: API Gateway URLs Not Configured**

The frontend is currently trying to call placeholder API Gateway URLs, which is causing the error:
```
POST https://your-api-gateway-url/parse-cas net::ERR_NAME_NOT_RESOLVED
```

## 🔧 **Solution: Update API Gateway URLs**

### **Step 1: Deploy Infrastructure**
First, deploy the infrastructure to get the actual API Gateway URLs:

```bash
# Install Terraform (if not already installed)
# Then run the deployment script
python3 deploy-lambda.py
```

### **Step 2: Get API Gateway URLs**
After deployment, get the API Gateway URLs from Terraform outputs:

```bash
cd terraform
terraform output portfolio_api_endpoint
terraform output import_stocks_api_endpoint
```

**Example output:**
```
portfolio_api_endpoint = "https://abc123def4.execute-api.us-east-1.amazonaws.com"
import_stocks_api_endpoint = "https://xyz789ghi0.execute-api.us-east-1.amazonaws.com"
```

### **Step 3: Update Frontend Configuration**

#### **Option A: Environment Variables (Recommended)**
Create or update `.env.local` file in the frontend directory:

```bash
# Frontend environment variables
NEXT_PUBLIC_PORTFOLIO_API_URL=https://abc123def4.execute-api.us-east-1.amazonaws.com
NEXT_PUBLIC_IMPORT_STOCKS_API_URL=https://xyz789ghi0.execute-api.us-east-1.amazonaws.com
```

#### **Option B: Direct Code Update**
Update the URLs directly in `/workspace/frontend/src/lib/dynamodb.ts`:

```typescript
// Replace these placeholder URLs with actual API Gateway URLs
const PORTFOLIO_API_URL = process.env.NEXT_PUBLIC_PORTFOLIO_API_URL || 'https://abc123def4.execute-api.us-east-1.amazonaws.com';
const IMPORT_STOCKS_API_URL = process.env.NEXT_PUBLIC_IMPORT_STOCKS_API_URL || 'https://xyz789ghi0.execute-api.us-east-1.amazonaws.com';
```

### **Step 4: Restart Frontend**
After updating the configuration:

```bash
cd frontend
npm run dev
```

## 📊 **API Gateway Architecture**

### **Two Separate API Gateways:**

1. **Portfolio API Gateway** (`portfolio_api_endpoint`)
   - **Routes:**
     - `POST /holdings/import` - Import parsed stock data
     - `GET /holdings` - Fetch user holdings
     - `POST /holdings` - Create new holding
     - `DELETE /holdings/{id}` - Delete holding
     - `GET /mutual-funds` - Fetch mutual funds
     - `GET /stocks` - Fetch stock companies

2. **Import Stocks API Gateway** (`import_stocks_api_endpoint`)
   - **Routes:**
     - `POST /parse-cas` - Parse CAS/broker files

### **Request Flow:**
```
Frontend → Import Stocks API (parse-cas) → Portfolio API (holdings/import) → DynamoDB
```

## 🛠️ **Troubleshooting**

### **Common Issues:**

1. **ERR_NAME_NOT_RESOLVED**
   - **Cause:** API Gateway URLs not configured
   - **Solution:** Update URLs as described above

2. **CORS Errors**
   - **Cause:** API Gateway CORS not configured
   - **Solution:** Check Terraform CORS configuration

3. **403 Forbidden**
   - **Cause:** Lambda permissions not set
   - **Solution:** Check Lambda execution role permissions

4. **500 Internal Server Error**
   - **Cause:** Lambda function errors
   - **Solution:** Check CloudWatch logs

### **Testing API Endpoints:**

```bash
# Test Portfolio API
curl -X GET https://your-portfolio-api-url/mutual-funds

# Test Import Stocks API
curl -X POST https://your-import-stocks-api-url/parse-cas \
  -H "Content-Type: application/json" \
  -d '{"broker":"zerodha","file_content":"base64content","password":"","file_extension":".csv"}'
```

## 📝 **Environment Variables Reference**

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_PORTFOLIO_API_URL` | Portfolio API Gateway URL | `https://abc123.execute-api.us-east-1.amazonaws.com` |
| `NEXT_PUBLIC_IMPORT_STOCKS_API_URL` | Import Stocks API Gateway URL | `https://xyz789.execute-api.us-east-1.amazonaws.com` |

## 🚀 **Quick Fix for Development**

If you need to test immediately without deploying, you can use mock data by updating the frontend to use mock responses instead of API calls.

## ✅ **Verification Steps**

1. ✅ Deploy infrastructure with `python3 deploy-lambda.py`
2. ✅ Get API Gateway URLs from Terraform outputs
3. ✅ Update frontend environment variables
4. ✅ Restart frontend development server
5. ✅ Test import functionality

**Once configured, the import stocks functionality will work seamlessly!** 🎉