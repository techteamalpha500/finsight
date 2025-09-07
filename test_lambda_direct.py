#!/usr/bin/env python3
"""
Test the import-stocks lambda directly
"""

import json
import base64
import sys
from pathlib import Path

def test_lambda_direct():
    """Test the lambda function directly"""
    print("🧪 Testing Import-Stocks Lambda Directly")
    print("=" * 50)
    
    # Read the Excel file
    excel_file = Path("holdings-GYS673.xlsx")
    if not excel_file.exists():
        print(f"❌ Excel file not found: {excel_file}")
        return False
    
    with open(excel_file, 'rb') as f:
        file_content = f.read()
    
    file_base64 = base64.b64encode(file_content).decode('utf-8')
    
    # Create test event
    event = {
        "broker": "zerodha",
        "file_content": file_base64,
        "password": "",
        "file_extension": ".xlsx"
    }
    
    print(f"✅ Created test event with {len(file_base64)} character base64 string")
    
    # Import and test the lambda
    try:
        sys.path.append('backend/lambda/import-stocks')
        from index import handler
        
        print("✅ Lambda handler imported successfully")
        
        # Test the handler
        result = handler(event, {})
        
        print(f"✅ Lambda executed successfully")
        print(f"Result: {json.dumps(result, indent=2)}")
        
        return True
        
    except Exception as e:
        print(f"❌ Lambda execution failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_lambda_direct()
    if success:
        print("\n🎉 Lambda test passed!")
    else:
        print("\n❌ Lambda test failed!")