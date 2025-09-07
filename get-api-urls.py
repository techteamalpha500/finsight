#!/usr/bin/env python3
"""
Script to get API Gateway URLs from Terraform outputs
"""

import subprocess
import sys
import os

def run_command(cmd, check=True, capture_output=False):
    """Run a shell command and return the result"""
    print(f"🔧 Running: {' '.join(cmd)}")
    result = subprocess.run(cmd, check=check, capture_output=capture_output, text=True)
    if capture_output:
        return result.stdout.strip()
    return result

def get_api_urls():
    """Get API Gateway URLs from Terraform outputs"""
    print("🌐 Getting API Gateway URLs from Terraform...")
    
    # Change to terraform directory
    original_dir = os.getcwd()
    terraform_dir = os.path.join(original_dir, "terraform")
    
    if not os.path.exists(terraform_dir):
        print("❌ Terraform directory not found!")
        return None, None
    
    try:
        os.chdir(terraform_dir)
        
        # Get Portfolio API URL
        try:
            portfolio_url = run_command(["terraform", "output", "-raw", "portfolio_api_endpoint"], capture_output=True)
            print(f"✅ Portfolio API URL: {portfolio_url}")
        except subprocess.CalledProcessError:
            print("❌ Portfolio API URL not found (not deployed?)")
            portfolio_url = None
        
        # Get Import Stocks API URL
        try:
            import_url = run_command(["terraform", "output", "-raw", "import_stocks_api_endpoint"], capture_output=True)
            print(f"✅ Import Stocks API URL: {import_url}")
        except subprocess.CalledProcessError:
            print("❌ Import Stocks API URL not found (not deployed?)")
            import_url = None
        
        return portfolio_url, import_url
        
    except Exception as e:
        print(f"❌ Error getting API URLs: {e}")
        return None, None
    finally:
        os.chdir(original_dir)

def generate_env_file(portfolio_url, import_url):
    """Generate .env.local file with API URLs"""
    if not portfolio_url or not import_url:
        print("❌ Cannot generate .env file - missing API URLs")
        return
    
    env_content = f"""# API Gateway URLs
NEXT_PUBLIC_PORTFOLIO_API_URL={portfolio_url}
NEXT_PUBLIC_IMPORT_STOCKS_API_URL={import_url}
"""
    
    env_file = ".env.local"
    try:
        with open(env_file, "w") as f:
            f.write(env_content)
        print(f"✅ Generated {env_file} with API URLs")
        print(f"📝 Content:")
        print(env_content)
    except Exception as e:
        print(f"❌ Error writing {env_file}: {e}")

def main():
    """Main function"""
    print("🚀 API Gateway URL Configuration Helper")
    print("=" * 50)
    
    # Check if Terraform is available
    try:
        run_command(["terraform", "version"], capture_output=True)
        print("✅ Terraform is available")
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("❌ Terraform is not available. Please install Terraform first.")
        print("   Or deploy the infrastructure using: python3 deploy-lambda.py")
        sys.exit(1)
    
    # Get API URLs
    portfolio_url, import_url = get_api_urls()
    
    if portfolio_url and import_url:
        print("\n🎉 API URLs found!")
        print(f"📊 Portfolio API: {portfolio_url}")
        print(f"📊 Import Stocks API: {import_url}")
        
        # Generate .env file
        generate_env_file(portfolio_url, import_url)
        
        print("\n📝 Next steps:")
        print("1. Copy the .env.local file to your frontend directory")
        print("2. Restart your frontend development server")
        print("3. Test the import stocks functionality")
        
    else:
        print("\n❌ API URLs not found. Please deploy the infrastructure first:")
        print("   python3 deploy-lambda.py")
        print("\n📝 Manual configuration:")
        print("   Update frontend/src/lib/dynamodb.ts with actual API Gateway URLs")

if __name__ == "__main__":
    main()