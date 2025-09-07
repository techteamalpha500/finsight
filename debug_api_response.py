#!/usr/bin/env python3
"""
Debug API response to understand the 500 error
"""

import base64
import json
import urllib.request
import urllib.parse
import sys
from pathlib import Path

def debug_api_response():
    """Debug the API response to understand the 500 error"""
    print("🔍 Debugging API Response")
    print("=" * 50)
    
    # API URL
    import_api_url = "https://2gd70oknx5.execute-api.us-east-1.amazonaws.com"
    
    excel_file = Path("holdings-GYS673.xlsx")
    if not excel_file.exists():
        print(f"❌ Excel file not found: {excel_file}")
        return False
    
    print(f"✅ Found Excel file: {excel_file}")
    
    try:
        # Read and encode the Excel file
        with open(excel_file, 'rb') as f:
            file_content = f.read()
        
        file_base64 = base64.b64encode(file_content).decode('utf-8')
        print(f"✅ File encoded to base64: {len(file_base64)} characters")
        
        # Test with a smaller payload first
        print("\n📤 Testing with minimal payload...")
        minimal_payload = {
            "broker": "zerodha",
            "file_content": "dGVzdA==",  # "test" in base64
            "password": "",
            "file_extension": ".xlsx"
        }
        
        data = json.dumps(minimal_payload).encode('utf-8')
        req = urllib.request.Request(
            f"{import_api_url}/parse-cas",
            data=data,
            headers={"Content-Type": "application/json"}
        )
        
        try:
            with urllib.request.urlopen(req, timeout=30) as response:
                result = json.loads(response.read().decode('utf-8'))
                print(f"✅ Minimal test successful! Status: {response.status}")
                print(f"Response: {json.dumps(result, indent=2)}")
        except urllib.error.HTTPError as e:
            print(f"❌ Minimal test failed with status {e.code}")
            error_response = e.read().decode('utf-8')
            print(f"Error response: {error_response}")
            
            # Try to parse error response
            try:
                error_data = json.loads(error_response)
                print(f"Parsed error: {json.dumps(error_data, indent=2)}")
            except:
                print("Could not parse error response as JSON")
        
        # Test with actual file
        print("\n📤 Testing with actual Excel file...")
        actual_payload = {
            "broker": "zerodha",
            "file_content": file_base64,
            "password": "",
            "file_extension": ".xlsx"
        }
        
        data = json.dumps(actual_payload).encode('utf-8')
        req = urllib.request.Request(
            f"{import_api_url}/parse-cas",
            data=data,
            headers={"Content-Type": "application/json"}
        )
        
        try:
            with urllib.request.urlopen(req, timeout=30) as response:
                result = json.loads(response.read().decode('utf-8'))
                print(f"✅ Actual file test successful! Status: {response.status}")
                print(f"Response keys: {list(result.keys())}")
                
                if 'data' in result:
                    data = result['data']
                    print(f"Data keys: {list(data.keys())}")
                    if 'stocks' in data:
                        print(f"Number of stocks: {len(data['stocks'])}")
                        if data['stocks']:
                            print("First stock:")
                            print(json.dumps(data['stocks'][0], indent=2))
                
        except urllib.error.HTTPError as e:
            print(f"❌ Actual file test failed with status {e.code}")
            error_response = e.read().decode('utf-8')
            print(f"Error response: {error_response}")
            
            # Try to parse error response
            try:
                error_data = json.loads(error_response)
                print(f"Parsed error: {json.dumps(error_data, indent=2)}")
            except:
                print("Could not parse error response as JSON")
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = debug_api_response()
    if success:
        print("\n🔍 Debug completed!")
    else:
        print("\n❌ Debug failed!")