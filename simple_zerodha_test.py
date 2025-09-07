#!/usr/bin/env python3
"""
Simple test to check Zerodha Excel file and test import
"""

import base64
import json
import urllib.request
import urllib.parse
import sys
from pathlib import Path

def test_import_api():
    """Test the import API with the actual Excel file"""
    print("🚀 Testing Zerodha Import API")
    print("=" * 50)
    
    # API URLs from environment
    import_api_url = "https://2gd70oknx5.execute-api.us-east-1.amazonaws.com"
    portfolio_api_url = "https://t52qkm02pl.execute-api.us-east-1.amazonaws.com"
    
    excel_file = Path("holdings-GYS673.xlsx")
    if not excel_file.exists():
        print(f"❌ Excel file not found: {excel_file}")
        return False
    
    print(f"✅ Found Excel file: {excel_file}")
    print(f"File size: {excel_file.stat().st_size} bytes")
    
    try:
        # Read and encode the Excel file
        with open(excel_file, 'rb') as f:
            file_content = f.read()
        
        file_base64 = base64.b64encode(file_content).decode('utf-8')
        print(f"✅ File encoded to base64: {len(file_base64)} characters")
        
        # Test parse-cas endpoint
        print("\n📤 Testing parse-cas endpoint...")
        parse_payload = {
            "broker": "zerodha",
            "file_content": file_base64,
            "password": "",
            "file_extension": ".xlsx"
        }
        
        # Create request
        data = json.dumps(parse_payload).encode('utf-8')
        req = urllib.request.Request(
            f"{import_api_url}/parse-cas",
            data=data,
            headers={"Content-Type": "application/json"}
        )
        
        try:
            with urllib.request.urlopen(req, timeout=30) as response:
                result = json.loads(response.read().decode('utf-8'))
                print(f"✅ Parse successful! Status: {response.status}")
                print(f"Response keys: {list(result.keys())}")
                
                if 'data' in result:
                    data = result['data']
                    print(f"Data keys: {list(data.keys())}")
                    
                    if 'stocks' in data:
                        stocks = data['stocks']
                        print(f"Number of stocks parsed: {len(stocks)}")
                        
                        if stocks:
                            print("First stock:")
                            print(json.dumps(stocks[0], indent=2))
                        
                        # Test holdings import
                        print("\n📤 Testing holdings import...")
                        import_payload = data
                        
                        import_data = json.dumps(import_payload).encode('utf-8')
                        import_req = urllib.request.Request(
                            f"{portfolio_api_url}/holdings/import",
                            data=import_data,
                            headers={"Content-Type": "application/json"}
                        )
                        
                        try:
                            with urllib.request.urlopen(import_req, timeout=30) as import_response:
                                import_result = json.loads(import_response.read().decode('utf-8'))
                                print(f"✅ Import successful! Status: {import_response.status}")
                                print(f"Import result: {json.dumps(import_result, indent=2)}")
                                return True
                        except urllib.error.HTTPError as e:
                            print(f"❌ Import failed with status {e.code}")
                            print(f"Error response: {e.read().decode('utf-8')}")
                            return False
                    else:
                        print("❌ No stocks in parsed data")
                        return False
                else:
                    print("❌ No data in parse result")
                    print(f"Full result: {json.dumps(result, indent=2)}")
                    return False
                    
        except urllib.error.HTTPError as e:
            print(f"❌ Parse failed with status {e.code}")
            print(f"Error response: {e.read().decode('utf-8')}")
            return False
            
    except Exception as e:
        print(f"❌ Error testing API: {e}")
        return False

def main():
    """Main test function"""
    print("🧪 Zerodha Import Test")
    print("=" * 40)
    
    success = test_import_api()
    
    if success:
        print("\n🎉 Test passed! Zerodha import should work.")
    else:
        print("\n❌ Test failed. Check the logs above.")

if __name__ == "__main__":
    main()