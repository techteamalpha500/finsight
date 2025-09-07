#!/usr/bin/env python3
"""
Test script to analyze Zerodha Excel file and test import functionality
"""

import base64
import json
import requests
import sys
from pathlib import Path

def analyze_excel_file():
    """Analyze the Zerodha Excel file structure"""
    print("📊 Analyzing Zerodha Excel File")
    print("=" * 50)
    
    excel_file = Path("terraform/holdings-GYS673.xlsx")
    if not excel_file.exists():
        print(f"❌ Excel file not found: {excel_file}")
        return None
    
    print(f"✅ Found Excel file: {excel_file}")
    print(f"File size: {excel_file.stat().st_size} bytes")
    
    # Try to read with openpyxl if available
    try:
        from openpyxl import load_workbook
        print("✅ openpyxl available")
        
        workbook = load_workbook(excel_file)
        worksheet = workbook.active
        
        print(f"Sheet name: {worksheet.title}")
        print(f"Total rows: {worksheet.max_row}")
        print(f"Total columns: {worksheet.max_column}")
        print()
        
        # Show first 10 rows
        print("📋 First 10 rows:")
        for i, row in enumerate(worksheet.iter_rows(values_only=True), 1):
            if i > 10:
                break
            print(f"Row {i}: {row}")
        
        return True
        
    except ImportError:
        print("❌ openpyxl not available - cannot analyze Excel structure")
        return False
    except Exception as e:
        print(f"❌ Error analyzing Excel file: {e}")
        return False

def test_import_api():
    """Test the import API with the actual Excel file"""
    print("\n🚀 Testing Import API")
    print("=" * 50)
    
    # API URLs from environment
    import_api_url = "https://2gd70oknx5.execute-api.us-east-1.amazonaws.com"
    portfolio_api_url = "https://t52qkm02pl.execute-api.us-east-1.amazonaws.com"
    
    excel_file = Path("terraform/holdings-GYS673.xlsx")
    if not excel_file.exists():
        print(f"❌ Excel file not found: {excel_file}")
        return False
    
    try:
        # Read and encode the Excel file
        with open(excel_file, 'rb') as f:
            file_content = f.read()
        
        file_base64 = base64.b64encode(file_content).decode('utf-8')
        
        # Test parse-cas endpoint
        print("📤 Testing parse-cas endpoint...")
        parse_payload = {
            "broker": "zerodha",
            "file_content": file_base64,
            "password": "",
            "file_extension": ".xlsx"
        }
        
        response = requests.post(
            f"{import_api_url}/parse-cas",
            json=parse_payload,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        print(f"Response status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Parse successful!")
            print(f"Parsed data: {json.dumps(result, indent=2)}")
            
            # Test holdings import
            if 'data' in result:
                print("\n📤 Testing holdings import...")
                import_payload = result['data']
                
                import_response = requests.post(
                    f"{portfolio_api_url}/holdings/import",
                    json=import_payload,
                    headers={"Content-Type": "application/json"},
                    timeout=30
                )
                
                print(f"Import response status: {import_response.status_code}")
                
                if import_response.status_code == 200:
                    import_result = import_response.json()
                    print("✅ Import successful!")
                    print(f"Import result: {json.dumps(import_result, indent=2)}")
                    return True
                else:
                    print(f"❌ Import failed: {import_response.text}")
                    return False
            else:
                print("❌ No data in parse result")
                return False
        else:
            print(f"❌ Parse failed: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error testing API: {e}")
        return False

def main():
    """Main test function"""
    print("🧪 Zerodha Import Test Suite")
    print("=" * 60)
    
    # Step 1: Analyze Excel file
    excel_ok = analyze_excel_file()
    
    # Step 2: Test API import
    if excel_ok:
        api_ok = test_import_api()
        
        if api_ok:
            print("\n🎉 All tests passed! Zerodha import should work.")
        else:
            print("\n❌ API tests failed. Check the logs above.")
    else:
        print("\n❌ Excel analysis failed. Cannot proceed with API tests.")

if __name__ == "__main__":
    main()