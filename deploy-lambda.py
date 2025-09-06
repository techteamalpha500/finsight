#!/usr/bin/env python3
"""
Unified Terraform Deployment Script
This script handles the complete deployment process for all Lambda functions and infrastructure
"""

import os
import sys
import subprocess
import json
import shutil
import zipfile
from pathlib import Path

def run_command(cmd, check=True, capture_output=False):
    """Run a shell command and return the result"""
    print(f"🔧 Running: {' '.join(cmd)}")
    result = subprocess.run(cmd, check=check, capture_output=capture_output, text=True)
    if capture_output:
        return result.stdout.strip()
    return result

def check_prerequisites():
    """Check if required tools are installed"""
    print("🔍 Checking prerequisites...")
    
    # Check Terraform
    try:
        run_command(["terraform", "version"], capture_output=True)
        print("✅ Terraform is installed")
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("❌ Terraform is not installed. Please install Terraform first.")
        sys.exit(1)
    
    # Check AWS CLI
    try:
        run_command(["aws", "sts", "get-caller-identity"], capture_output=True)
        print("✅ AWS CLI is configured")
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("❌ AWS CLI is not configured. Please run 'aws configure' first.")
        sys.exit(1)

def build_lambda_packages():
    """Build all Lambda deployment packages"""
    print("📦 Building Lambda deployment packages...")
    
    # Define all lambda functions to build
    lambda_functions = [
        {
            "name": "parse-mf-stocks",
            "src": "backend/lambda/parse-mf-stocks",
            "zip": "terraform/parse_mf_stocks.zip"
        },
        {
            "name": "portfolio-api",
            "src": "backend/lambda/portfolio-api-py",
            "zip": "terraform/portfolio_api.zip"
        },
        {
            "name": "expenses-api",
            "src": "backend/lambda/expenses-api-py",
            "zip": "terraform/expenses_api.zip"
        },

    ]
    
    for func in lambda_functions:
        print(f"\n🔧 Building {func['name']}...")
        
        # Paths
        lambda_src = Path(func["src"])
        build_dir = Path(f"terraform/lambda_build_{func['name'].replace('-', '_')}")
        zip_file = Path(func["zip"])
        
        # Skip if source doesn't exist
        if not lambda_src.exists():
            print(f"   ⚠️  Source directory {lambda_src} not found, skipping...")
            continue
        
        # Clean up previous builds
        if build_dir.exists():
            shutil.rmtree(build_dir)
        if zip_file.exists():
            zip_file.unlink()
        
        # Create build directory
        build_dir.mkdir(parents=True, exist_ok=True)
        
        # Copy Lambda source files
        print(f"   📋 Copying {func['name']} source files...")
        for file in lambda_src.glob("*.py"):
            shutil.copy2(file, build_dir)
            print(f"      ✅ Copied {file.name}")
        
        # Install dependencies
        requirements_file = lambda_src / "requirements.txt"
        if requirements_file.exists():
            print(f"   📦 Installing {func['name']} dependencies...")
            run_command([
                "pip3", "install", "-r", str(requirements_file), 
                "-t", str(build_dir), "--upgrade"
            ])
            
            # Verify critical dependencies
            if func['name'] == 'parse-mf-stocks':
                required_deps = ['requests', 'boto3', 'charset_normalizer', 'urllib3', 'certifi', 'idna']
                missing_deps = []
                
                for dep in required_deps:
                    dep_dir = build_dir / dep
                    if not dep_dir.exists():
                        missing_deps.append(dep)
                
                if missing_deps:
                    print(f"   ❌ ERROR: Missing dependencies in {func['name']} build directory: {missing_deps}")
                    sys.exit(1)
                
                print(f"   ✅ Verified all critical dependencies for {func['name']}: {required_deps}")
            
            print(f"   ✅ {func['name']} dependencies installed successfully")
        
        # Create deployment ZIP
        print(f"   📦 Creating {func['name']} deployment ZIP...")
        with zipfile.ZipFile(zip_file, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for file_path in build_dir.rglob("*"):
                if file_path.is_file():
                    arcname = file_path.relative_to(build_dir)
                    zipf.write(file_path, arcname)
        
        print(f"   ✅ Created {zip_file}")
        
        # Verify ZIP contents for critical functions
        if func['name'] == 'parse-mf-stocks':
            print(f"   📦 Verifying {func['name']} ZIP contents...")
            with zipfile.ZipFile(zip_file, 'r') as zipf:
                file_list = zipf.namelist()
                required_deps = ['requests', 'boto3', 'charset_normalizer', 'urllib3', 'certifi', 'idna']
                
                has_main = any('main.py' in f for f in file_list)
                has_deps = {}
                for dep in required_deps:
                    has_deps[dep] = any(dep in f for f in file_list)
                
                print(f"      📄 Contains main.py: {has_main}")
                for dep, has_it in has_deps.items():
                    print(f"      📄 Contains {dep}: {has_it}")
                print(f"      📄 Total files: {len(file_list)}")
                
                missing_deps = [dep for dep, has_it in has_deps.items() if not has_it]
                if not has_main or missing_deps:
                    print(f"   ❌ ERROR: {func['name']} ZIP is missing critical files!")
                    if not has_main:
                        print(f"      Missing: main.py")
                    if missing_deps:
                        print(f"      Missing dependencies: {missing_deps}")
                    sys.exit(1)
        
        # Clean up build directory
        shutil.rmtree(build_dir)

def deploy_terraform():
    """Deploy using Terraform"""
    print("🚀 Starting Terraform deployment...")
    
    # Change to terraform directory
    os.chdir("terraform")
    
    try:
        # Initialize Terraform
        print("📋 Initializing Terraform...")
        run_command(["terraform", "init"])
        
        # Validate configuration
        print("📋 Validating Terraform configuration...")
        run_command(["terraform", "validate"])
        
        # Plan deployment
        print("📋 Planning Terraform deployment...")
        run_command(["terraform", "plan", "-out=tfplan"])
        
        # Ask for confirmation
        print("\n🤔 Do you want to apply these changes? (y/N)")
        response = input().strip().lower()
        
        if response in ['y', 'yes']:
            print("🚀 Applying Terraform changes...")
            run_command(["terraform", "apply", "--auto-approve", "tfplan"])
            
            # Show outputs
            print("\n✅ Deployment completed!")
            show_deployment_outputs()
            
        else:
            print("❌ Deployment cancelled by user")
            return False
            
    finally:
        # Clean up
        if Path("tfplan").exists():
            Path("tfplan").unlink()
        os.chdir("..")
    
    return True

def show_deployment_outputs():
    """Show all deployment outputs"""
    print("\n📊 Lambda Functions:")
    
    # Parse MF Stocks Lambda
    try:
        lambda_name = run_command(["terraform", "output", "-raw", "parse_mf_stocks_lambda_name"], capture_output=True)
        lambda_arn = run_command(["terraform", "output", "-raw", "parse_mf_stocks_lambda_arn"], capture_output=True)
        print(f"   📊 Parse MF Stocks: {lambda_name}")
        print(f"      ARN: {lambda_arn}")
    except subprocess.CalledProcessError:
        print("   📊 Parse MF Stocks: (not deployed)")
    
    # Portfolio API Lambda
    try:
        portfolio_name = run_command(["terraform", "output", "-raw", "portfolio_lambda_name"], capture_output=True)
        portfolio_arn = run_command(["terraform", "output", "-raw", "portfolio_lambda_arn"], capture_output=True)
        print(f"   💼 Portfolio API: {portfolio_name}")
        print(f"      ARN: {portfolio_arn}")
    except subprocess.CalledProcessError:
        print("   💼 Portfolio API: (not deployed)")
    
    # Expenses API Lambda
    try:
        expenses_name = run_command(["terraform", "output", "-raw", "expenses_lambda_name"], capture_output=True)
        expenses_arn = run_command(["terraform", "output", "-raw", "expenses_lambda_arn"], capture_output=True)
        print(f"   💰 Expenses API: {expenses_name}")
        print(f"      ARN: {expenses_arn}")
    except subprocess.CalledProcessError:
        print("   💰 Expenses API: (not deployed)")
    
    print("\n📊 DynamoDB Tables:")
    try:
        stock_table = run_command(["terraform", "output", "-raw", "stock_companies_table_name"], capture_output=True)
        print(f"   📈 Stock Companies: {stock_table}")
    except subprocess.CalledProcessError:
        print("   📈 Stock Companies: (not deployed)")
    
    try:
        mf_table = run_command(["terraform", "output", "-raw", "mutual_fund_schemes_table_name"], capture_output=True)
        print(f"   💰 Mutual Fund Schemes: {mf_table}")
    except subprocess.CalledProcessError:
        print("   💰 Mutual Fund Schemes: (not deployed)")
    
    try:
        invest_table = run_command(["terraform", "output", "-raw", "invest_table_name"], capture_output=True)
        print(f"   💼 Holdings: {invest_table}")
    except subprocess.CalledProcessError:
        print("   💼 Holdings: (not deployed)")
    
    try:
        expenses_table = run_command(["terraform", "output", "-raw", "expenses_table_name"], capture_output=True)
        print(f"   💸 Expenses: {expenses_table}")
    except subprocess.CalledProcessError:
        print("   💸 Expenses: (not deployed)")
    
    print("\n🎯 Usage Examples:")
    print("   📊 Parse MF/Stocks (both):")
    print("   aws lambda invoke --function-name parse-mf-stocks --payload 'eyJ0eXBlIjoiYm90aCJ9Cg==' both_response.json")
    print("   ")
    print("   📈 Parse stocks only:")
    print("   aws lambda invoke --function-name parse-mf-stocks --payload 'eyJ0eXBlIjoic3RvY2tzIn0K' stocks_response.json")
    print("   ")
    print("   💰 Parse mutual funds only:")
    print("   aws lambda invoke --function-name parse-mf-stocks --payload 'eyJ0eXBlIjoibWYifQo=' mf_response.json")
    print("   ")
    print("   🔍 Check response:")
    print("   cat response.json")
    print("   ")
    print("   💼 Test Portfolio API:")
    print("   curl -X GET https://your-api-gateway-url/portfolio/holdings")
    print("   ")
    print("   💸 Test Expenses API:")
    print("   curl -X GET https://your-api-gateway-url/expenses/transactions")
    print("   ")
    print("   📝 Alternative method (using file):")
    print("   echo '{\"type\":\"stocks\"}' > payload.json")
    print("   aws lambda invoke --function-name parse-mf-stocks --payload file://payload.json response.json")

def main():
    """Main deployment function"""
    print("🚀 Starting Unified Terraform Deployment...")
    print("=" * 60)
    print("This will deploy all Lambda functions and infrastructure:")
    print("  📊 Parse MF/Stocks Lambda (parse-mf-stocks)")
    print("  💼 Portfolio API Lambda (portfolio-api)")
    print("  💰 Expenses API Lambda (expenses-api)")
    print("  📊 All DynamoDB Tables")
    print("  🌐 API Gateway Routes")
    print("=" * 60)
    
    # Check prerequisites
    check_prerequisites()
    
    # Build all Lambda packages
    build_lambda_packages()
    
    # Deploy with Terraform
    success = deploy_terraform()
    
    if success:
        print("\n🎉 Deployment completed successfully!")
        print("\n📝 Next steps:")
        print("1. Test the Lambda functions with different payload types")
        print("2. Check CloudWatch logs for any issues")
        print("3. Verify data in DynamoDB tables")
        print("4. Test API Gateway endpoints")
        print("5. Update frontend environment variables if needed")
    else:
        print("\n❌ Deployment failed or was cancelled")
        sys.exit(1)

if __name__ == "__main__":
    main()