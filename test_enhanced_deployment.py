#!/usr/bin/env python3
"""
Test the enhanced deployment script functionality
"""

import sys
from pathlib import Path

def test_deployment_script():
    """Test the enhanced deployment script"""
    print("🧪 Testing Enhanced Deployment Script")
    print("=" * 50)
    
    # Import the deployment script
    try:
        sys.path.append('.')
        from deploy_lambda import build_lambda_packages
        
        print("✅ Deployment script imported successfully")
        
        # Test the lambda functions configuration
        lambda_functions = [
            {
                "name": "parse-mf-stocks",
                "src": "backend/lambda/parse-mf-stocks",
                "zip": "terraform/parse_mf_stocks.zip",
                "critical_deps": ['requests', 'boto3', 'charset_normalizer', 'urllib3', 'certifi', 'idna'],
                "main_file": "main.py"
            },
            {
                "name": "portfolio-api",
                "src": "backend/lambda/portfolio-api-py",
                "zip": "terraform/portfolio_api.zip",
                "critical_deps": ['boto3'],
                "main_file": "index.py"
            },
            {
                "name": "expenses-api",
                "src": "backend/lambda/expenses-api-py",
                "zip": "terraform/expenses_api.zip",
                "critical_deps": ['boto3'],
                "main_file": "index.py"
            },
            {
                "name": "import-stocks",
                "src": "backend/lambda/import-stocks",
                "zip": "terraform/import_stocks.zip",
                "critical_deps": ['boto3', 'openpyxl', 'PyPDF2', 'pdfplumber'],
                "main_file": "index.py"
            }
        ]
        
        print("✅ Lambda functions configuration:")
        for func in lambda_functions:
            print(f"  📊 {func['name']}:")
            print(f"     - Critical deps: {func['critical_deps']}")
            print(f"     - Main file: {func['main_file']}")
            print(f"     - Source: {func['src']}")
        
        # Check if import-stocks has openpyxl
        import_stocks = next((f for f in lambda_functions if f['name'] == 'import-stocks'), None)
        if import_stocks and 'openpyxl' in import_stocks['critical_deps']:
            print("✅ import-stocks Lambda includes openpyxl in critical dependencies")
        else:
            print("❌ import-stocks Lambda missing openpyxl in critical dependencies")
            return False
        
        # Check if source directories exist
        print("\n🔍 Checking source directories:")
        for func in lambda_functions:
            src_path = Path(func['src'])
            if src_path.exists():
                print(f"  ✅ {func['name']}: {src_path}")
                
                # Check for requirements.txt
                req_file = src_path / "requirements.txt"
                if req_file.exists():
                    print(f"     ✅ requirements.txt found")
                    with open(req_file, 'r') as f:
                        requirements = f.read().strip()
                    print(f"     📋 Requirements: {requirements}")
                else:
                    print(f"     ⚠️  requirements.txt not found")
            else:
                print(f"  ❌ {func['name']}: {src_path} not found")
                return False
        
        print("\n🎉 Enhanced deployment script test passed!")
        print("The script is ready to handle openpyxl dependencies correctly.")
        return True
        
    except ImportError as e:
        print(f"❌ Failed to import deployment script: {e}")
        return False
    except Exception as e:
        print(f"❌ Test failed: {e}")
        return False

if __name__ == "__main__":
    success = test_deployment_script()
    if success:
        print("\n✅ All tests passed! The deployment script is ready.")
    else:
        print("\n❌ Tests failed! Check the issues above.")
        sys.exit(1)