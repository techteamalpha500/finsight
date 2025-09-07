#!/usr/bin/env python3
"""
Test script for CAS Import functionality
Tests the complete flow for all 4 supported brokers
"""

import json
import requests
import time

# Test configuration
API_BASE_URL = "https://your-api-gateway-url"  # Replace with actual API Gateway URL
TEST_USER_ID = "user-123"

# Test data for each broker
TEST_CAS_DATA = {
    "Zerodha": {
        "broker": "Zerodha",
        "stocks": [
            {
                "name": "Reliance Industries Ltd",
                "symbol": "RELIANCE",
                "units": 10,
                "price": 2500.00,
                "currentValue": 25000.00,
                "investedAmount": 24000.00
            },
            {
                "name": "TCS Ltd",
                "symbol": "TCS",
                "units": 5,
                "price": 3500.00,
                "currentValue": 17500.00,
                "investedAmount": 17000.00
            }
        ]
    },
    "Groww": {
        "broker": "Groww",
        "stocks": [
            {
                "name": "HDFC Bank Ltd",
                "symbol": "HDFCBANK",
                "units": 20,
                "price": 1500.00,
                "currentValue": 30000.00,
                "investedAmount": 29000.00
            },
            {
                "name": "Infosys Ltd",
                "symbol": "INFY",
                "units": 15,
                "price": 1800.00,
                "currentValue": 27000.00,
                "investedAmount": 26000.00
            }
        ]
    },
    "Upstox": {
        "broker": "Upstox",
        "stocks": [
            {
                "name": "ITC Ltd",
                "symbol": "ITC",
                "units": 25,
                "price": 400.00,
                "currentValue": 10000.00,
                "investedAmount": 9500.00
            },
            {
                "name": "Bajaj Finance Ltd",
                "symbol": "BAJFINANCE",
                "units": 8,
                "price": 6500.00,
                "currentValue": 52000.00,
                "investedAmount": 50000.00
            }
        ]
    },
    "Angel": {
        "broker": "Angel",
        "stocks": [
            {
                "name": "Wipro Ltd",
                "symbol": "WIPRO",
                "units": 30,
                "price": 450.00,
                "currentValue": 13500.00,
                "investedAmount": 13000.00
            },
            {
                "name": "HCL Technologies Ltd",
                "symbol": "HCLTECH",
                "units": 12,
                "price": 1200.00,
                "currentValue": 14400.00,
                "investedAmount": 14000.00
            }
        ]
    }
}

def test_cas_parsing(broker_name, mock_file_content):
    """Test CAS parsing for a specific broker"""
    print(f"\n🧪 Testing CAS parsing for {broker_name}...")
    
    try:
        # Step 1: Test CAS parsing
        parse_response = requests.post(
            f"{API_BASE_URL}/parse-cas",
            headers={
                "Content-Type": "application/json"
            },
            json={
                "broker": broker_name,
                "file_content": mock_file_content,
                "password": "test123"
            },
            timeout=30
        )
        
        print(f"   📡 Parse API Response Status: {parse_response.status_code}")
        
        if parse_response.status_code == 200:
            parse_result = parse_response.json()
            print(f"   ✅ Parsing Success!")
            print(f"      📊 Parsed {parse_result.get('total_stocks', 0)} stocks")
            
            # Step 2: Test import to holdings
            cas_data = parse_result.get('data', {})
            import_response = requests.post(
                f"{API_BASE_URL}/holdings/import",
                headers={
                    "Content-Type": "application/json"
                },
                json=cas_data,
                timeout=30
            )
            
            print(f"   📡 Import API Response Status: {import_response.status_code}")
            
            if import_response.status_code == 200:
                import_result = import_response.json()
                print(f"   ✅ Import Success!")
                print(f"      📊 Imported: {import_result.get('imported', 0)} stocks")
                print(f"      🔄 Updated: {import_result.get('updated', 0)} stocks")
                print(f"      📈 Total processed: {import_result.get('total_processed', 0)} stocks")
                
                if import_result.get('errors'):
                    print(f"      ⚠️  Errors: {len(import_result['errors'])}")
                    for error in import_result['errors']:
                        print(f"         - {error}")
                
                return True
            else:
                print(f"   ❌ Import failed with status {import_response.status_code}")
                try:
                    error_data = import_response.json()
                    print(f"      Error: {error_data.get('error', 'Unknown error')}")
                except:
                    print(f"      Error: {import_response.text}")
                return False
        else:
            print(f"   ❌ Parsing failed with status {parse_response.status_code}")
            try:
                error_data = parse_response.json()
                print(f"      Error: {error_data.get('error', 'Unknown error')}")
            except:
                print(f"      Error: {parse_response.text}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"   ❌ Request failed: {str(e)}")
        return False
    except Exception as e:
        print(f"   ❌ Unexpected error: {str(e)}")
        return False

def test_cas_import(broker_name, cas_data):
    """Test CAS import for a specific broker (legacy function)"""
    print(f"\n🧪 Testing CAS import for {broker_name}...")
    
    try:
        # Make API call
        response = requests.post(
            f"{API_BASE_URL}/holdings/import",
            headers={
                "Content-Type": "application/json"
            },
            json=cas_data,
            timeout=30
        )
        
        print(f"   📡 API Response Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"   ✅ Success!")
            print(f"      📊 Imported: {result.get('imported', 0)} stocks")
            print(f"      🔄 Updated: {result.get('updated', 0)} stocks")
            print(f"      📈 Total processed: {result.get('total_processed', 0)} stocks")
            
            if result.get('errors'):
                print(f"      ⚠️  Errors: {len(result['errors'])}")
                for error in result['errors']:
                    print(f"         - {error}")
            
            return True
        else:
            print(f"   ❌ Failed with status {response.status_code}")
            try:
                error_data = response.json()
                print(f"      Error: {error_data.get('error', 'Unknown error')}")
            except:
                print(f"      Error: {response.text}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"   ❌ Request failed: {str(e)}")
        return False
    except Exception as e:
        print(f"   ❌ Unexpected error: {str(e)}")
        return False

def test_get_holdings():
    """Test getting holdings to verify import worked"""
    print(f"\n🔍 Testing holdings retrieval...")
    
    try:
        response = requests.get(
            f"{API_BASE_URL}/holdings",
            headers={
                "Content-Type": "application/json"
            },
            timeout=30
        )
        
        print(f"   📡 API Response Status: {response.status_code}")
        
        if response.status_code == 200:
            holdings = response.json()
            print(f"   ✅ Success! Retrieved {len(holdings)} holdings")
            
            # Show summary by broker/symbol
            symbols = {}
            for holding in holdings:
                symbol = holding.get('symbol', 'Unknown')
                if symbol not in symbols:
                    symbols[symbol] = 0
                symbols[symbol] += 1
            
            print(f"   📊 Holdings by symbol:")
            for symbol, count in symbols.items():
                print(f"      {symbol}: {count} holding(s)")
            
            return True
        else:
            print(f"   ❌ Failed with status {response.status_code}")
            return False
            
    except Exception as e:
        print(f"   ❌ Error: {str(e)}")
        return False

def main():
    """Main test function"""
    print("🚀 Starting CAS Import Test Suite")
    print("=" * 60)
    print("Testing CAS import functionality for all 4 supported brokers:")
    print("  📊 Zerodha")
    print("  📊 Groww") 
    print("  📊 Upstox")
    print("  📊 Angel")
    print("=" * 60)
    
    # Check if API URL is configured
    if API_BASE_URL == "https://your-api-gateway-url":
        print("❌ Please update API_BASE_URL in this script with your actual API Gateway URL")
        return
    
    results = {}
    
    # Create mock file content (base64 encoded PDF content)
    mock_file_content = "JVBERi0xLjQKJcOkw7zDtsO8CjIgMCBvYmoKPDwKL0xlbmd0aCAzIDAgUgo+PgpzdHJlYW0KQlQKL0YxIDEyIFRmCjcyIDcyMCBUZAooVGVzdCBDQVMgRmlsZSkgVGoKRVQKZW5kc3RyZWFtCmVuZG9iagoKMyAwIG9iago0NQplbmRvYmoKCjEgMCBvYmoKPDwKL1R5cGUgL1BhZ2UKL1BhcmVudCA0IDAgUgovUmVzb3VyY2VzIDw8Ci9Gb250IDw8Ci9GMSAyIDAgUgo+Pgo+PgovTWVkaWFCb3ggWzAgMCA2MTIgNzkyXQovQ29udGVudHMgMiAwIFIKPj4KZW5kb2JqCgo0IDAgb2JqCjw8Ci9UeXBlIC9QYWdlcwovQ291bnQgMQovS2lkcyBbMSAwIFJdCj4+CmVuZG9iagoKNSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgNCAwIFIKPj4KZW5kb2JqCgp4cmVmCjAgNgowMDAwMDAwMDAwIDY1NTM1IGYKMDAwMDAwMDAwOSAwMDAwMCBuCjAwMDAwMDAwNTggMDAwMDAgbgowMDAwMDAwMTE1IDAwMDAwIG4KMDAwMDAwMDI2MyAwMDAwMCBuCjAwMDAwMDAzMjIgMDAwMDAgbgp0cmFpbGVyCjw8Ci9TaXplIDYKL1Jvb3QgNSAwIFIKPj4Kc3RhcnR4cmVmCjQxNQolJUVPRgo="
    
    # Test each broker with new parsing approach
    for broker_name, cas_data in TEST_CAS_DATA.items():
        success = test_cas_parsing(broker_name, mock_file_content)
        results[broker_name] = success
        
        # Small delay between tests
        time.sleep(1)
    
    # Test holdings retrieval
    holdings_success = test_get_holdings()
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 TEST RESULTS SUMMARY")
    print("=" * 60)
    
    total_tests = len(TEST_CAS_DATA)
    passed_tests = sum(1 for success in results.values() if success)
    
    for broker_name, success in results.items():
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"  {broker_name}: {status}")
    
    print(f"\n  Holdings Retrieval: {'✅ PASS' if holdings_success else '❌ FAIL'}")
    print(f"\n  Overall: {passed_tests}/{total_tests} broker tests passed")
    
    if passed_tests == total_tests and holdings_success:
        print("\n🎉 All tests passed! CAS import functionality is working correctly.")
    else:
        print("\n⚠️  Some tests failed. Please check the API configuration and deployment.")
    
    print("\n📝 Next steps:")
    print("1. Verify the API Gateway URL is correct")
    print("2. Ensure the portfolio lambda is deployed with the latest code")
    print("3. Check CloudWatch logs for any errors")
    print("4. Test the frontend integration")

if __name__ == "__main__":
    main()