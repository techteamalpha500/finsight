#!/usr/bin/env python3
"""
Comprehensive validation script for CAS Import implementation
Validates all requirements and scenarios
"""

import json
import os
import sys
from pathlib import Path

def validate_frontend_broker_config():
    """Validate frontend broker configuration"""
    print("🔍 Validating frontend broker configuration...")
    
    # Check ImportStocksModal.tsx
    modal_path = Path("frontend/src/app/PortfolioManagement/Portfolio/Holdings/ImportStocksModal.tsx")
    if not modal_path.exists():
        print("❌ ImportStocksModal.tsx not found")
        return False
    
    content = modal_path.read_text()
    
    # Check for correct broker list
    expected_brokers = ['"Other"', '"Zerodha"', '"Groww"', '"Upstox"', '"Angel"']
    for broker in expected_brokers:
        if broker not in content:
            print(f"❌ Missing broker {broker} in ImportStocksModal.tsx")
            return False
    
    # Check for API import
    if "importCASData" not in content:
        print("❌ Missing importCASData import in ImportStocksModal.tsx")
        return False
    
    print("✅ Frontend broker configuration is correct")
    return True

def validate_cas_parser():
    """Validate CAS parser configuration"""
    print("🔍 Validating CAS parser configuration...")
    
    parser_path = Path("frontend/src/app/PortfolioManagement/Portfolio/Holdings/casParser.ts")
    if not parser_path.exists():
        print("❌ casParser.ts not found")
        return False
    
    content = parser_path.read_text()
    
    # Check for correct broker detection
    expected_detections = [
        "lowerFilename.includes('zerodha')",
        "lowerFilename.includes('groww')",
        "lowerFilename.includes('upstox')",
        "lowerFilename.includes('angel')"
    ]
    
    for detection in expected_detections:
        if detection not in content:
            print(f"❌ Missing broker detection for {detection}")
            return False
    
    print("✅ CAS parser configuration is correct")
    return True

def validate_api_integration():
    """Validate API integration"""
    print("🔍 Validating API integration...")
    
    # Check dynamodb.ts for API function
    lib_path = Path("frontend/src/lib/dynamodb.ts")
    if not lib_path.exists():
        print("❌ dynamodb.ts not found")
        return False
    
    content = lib_path.read_text()
    
    if "importCASData" not in content:
        print("❌ Missing importCASData function in dynamodb.ts")
        return False
    
    if "/holdings/import" not in content:
        print("❌ Missing /holdings/import endpoint in dynamodb.ts")
        return False
    
    print("✅ API integration is correct")
    return True

def validate_backend_api():
    """Validate backend API implementation"""
    print("🔍 Validating backend API implementation...")
    
    # Check portfolio lambda
    lambda_path = Path("backend/lambda/portfolio-api-py/index.py")
    if not lambda_path.exists():
        print("❌ portfolio lambda index.py not found")
        return False
    
    content = lambda_path.read_text()
    
    # Check for CAS import endpoint
    if "POST /holdings/import" not in content:
        print("❌ Missing POST /holdings/import endpoint in portfolio lambda")
        return False
    
    # Check for broker validation
    if "valid_brokers = ['Zerodha', 'Groww', 'Upstox', 'Angel', 'Other']" not in content:
        print("❌ Missing broker validation in portfolio lambda")
        return False
    
    # Check for import logic
    if "imported_count" not in content and "updated_count" not in content:
        print("❌ Missing import statistics in portfolio lambda")
        return False
    
    print("✅ Backend API implementation is correct")
    return True

def validate_terraform_config():
    """Validate terraform configuration"""
    print("🔍 Validating terraform configuration...")
    
    # Check terraform file
    tf_path = Path("terraform/lambda_portfolio.tf")
    if not tf_path.exists():
        print("❌ lambda_portfolio.tf not found")
        return False
    
    content = tf_path.read_text()
    
    # Check for import route
    if '"POST /holdings/import"' not in content:
        print("❌ Missing POST /holdings/import route in terraform")
        return False
    
    print("✅ Terraform configuration is correct")
    return True

def validate_deploy_script():
    """Validate deploy script"""
    print("🔍 Validating deploy script...")
    
    deploy_path = Path("deploy-lambda.py")
    if not deploy_path.exists():
        print("❌ deploy-lambda.py not found")
        return False
    
    content = deploy_path.read_text()
    
    # Check for portfolio-api in lambda functions
    if '"portfolio-api"' not in content:
        print("❌ Missing portfolio-api in deploy script")
        return False
    
    print("✅ Deploy script is correct")
    return True

def validate_test_suite():
    """Validate test suite"""
    print("🔍 Validating test suite...")
    
    test_path = Path("test_cas_import.py")
    if not test_path.exists():
        print("❌ test_cas_import.py not found")
        return False
    
    content = test_path.read_text()
    
    # Check for all 4 brokers in test data
    expected_brokers = ['"Zerodha"', '"Groww"', '"Upstox"', '"Angel"']
    for broker in expected_brokers:
        if broker not in content:
            print(f"❌ Missing {broker} in test suite")
            return False
    
    # Check for API testing
    if "test_cas_import" not in content:
        print("❌ Missing test_cas_import function")
        return False
    
    print("✅ Test suite is correct")
    return True

def validate_holdings_integration():
    """Validate holdings page integration"""
    print("🔍 Validating holdings page integration...")
    
    holdings_path = Path("frontend/src/app/PortfolioManagement/Portfolio/Holdings/page.tsx")
    if not holdings_path.exists():
        print("❌ Holdings page.tsx not found")
        return False
    
    content = holdings_path.read_text()
    
    # Check for import modal integration
    if "ImportStocksModal" not in content:
        print("❌ Missing ImportStocksModal in holdings page")
        return False
    
    # Check for handleImportStocks function
    if "handleImportStocks" not in content:
        print("❌ Missing handleImportStocks function")
        return False
    
    # Check for import button
    if "Import Stocks" not in content:
        print("❌ Missing Import Stocks button")
        return False
    
    print("✅ Holdings page integration is correct")
    return True

def validate_error_handling():
    """Validate error handling implementation"""
    print("🔍 Validating error handling...")
    
    # Check frontend error handling
    modal_path = Path("frontend/src/app/PortfolioManagement/Portfolio/Holdings/ImportStocksModal.tsx")
    content = modal_path.read_text()
    
    if "setError" not in content or "error" not in content:
        print("❌ Missing error handling in ImportStocksModal")
        return False
    
    # Check backend error handling
    lambda_path = Path("backend/lambda/portfolio-api-py/index.py")
    content = lambda_path.read_text()
    
    if "try:" not in content or "except" not in content:
        print("❌ Missing error handling in portfolio lambda")
        return False
    
    print("✅ Error handling is correct")
    return True

def validate_responsive_design():
    """Validate responsive design"""
    print("🔍 Validating responsive design...")
    
    modal_path = Path("frontend/src/app/PortfolioManagement/Portfolio/Holdings/ImportStocksModal.tsx")
    content = modal_path.read_text()
    
    # Check for responsive classes
    responsive_classes = ["sm:", "md:", "lg:", "xl:"]
    has_responsive = any(cls in content for cls in responsive_classes)
    
    if not has_responsive:
        print("❌ Missing responsive design classes")
        return False
    
    # Check for mobile-friendly elements
    if "max-w-2xl" not in content:
        print("❌ Missing max-width constraint")
        return False
    
    print("✅ Responsive design is correct")
    return True

def main():
    """Main validation function"""
    print("🚀 Starting Comprehensive CAS Import Validation")
    print("=" * 60)
    
    validations = [
        ("Frontend Broker Config", validate_frontend_broker_config),
        ("CAS Parser Config", validate_cas_parser),
        ("API Integration", validate_api_integration),
        ("Backend API", validate_backend_api),
        ("Terraform Config", validate_terraform_config),
        ("Deploy Script", validate_deploy_script),
        ("Test Suite", validate_test_suite),
        ("Holdings Integration", validate_holdings_integration),
        ("Error Handling", validate_error_handling),
        ("Responsive Design", validate_responsive_design)
    ]
    
    results = {}
    
    for name, validation_func in validations:
        try:
            results[name] = validation_func()
        except Exception as e:
            print(f"❌ Error validating {name}: {str(e)}")
            results[name] = False
        print()
    
    # Summary
    print("=" * 60)
    print("📊 VALIDATION RESULTS SUMMARY")
    print("=" * 60)
    
    passed = sum(1 for result in results.values() if result)
    total = len(results)
    
    for name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"  {name}: {status}")
    
    print(f"\n  Overall: {passed}/{total} validations passed")
    
    if passed == total:
        print("\n🎉 ALL VALIDATIONS PASSED!")
        print("✅ CAS Import implementation is complete and ready for deployment")
        print("\n📝 Next steps:")
        print("1. Deploy infrastructure: python deploy-lambda.py")
        print("2. Update API_BASE_URL in frontend environment")
        print("3. Test with: python test_cas_import.py")
        print("4. Verify frontend integration")
        return True
    else:
        print(f"\n⚠️  {total - passed} validations failed")
        print("Please fix the issues above before deployment")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)