#!/usr/bin/env python3
"""
Simple test script for the expenses Lambda function without boto3
"""

import json
import sys
import os

# Mock boto3 for testing
class MockTable:
    def __init__(self, name):
        self.name = name
    
    def get_item(self, **kwargs):
        return {"Item": {}}
    
    def put_item(self, **kwargs):
        return {}
    
    def scan(self, **kwargs):
        return {"Items": []}
    
    def update_item(self, **kwargs):
        return {}
    
    def delete_item(self, **kwargs):
        return {}

class MockDynamoDB:
    def Table(self, name):
        return MockTable(name)

# Mock boto3
sys.modules['boto3'] = type('MockBoto3', (), {
    'resource': lambda *args, **kwargs: MockDynamoDB()
})()
sys.modules['boto3.dynamodb.conditions'] = type('MockConditions', (), {
    'Key': lambda *args, **kwargs: type('MockKey', (), {})()
})()

# Mock environment variables
os.environ['AWS_REGION'] = 'us-east-1'
os.environ['EXPENSES_TABLE'] = 'Expenses'
os.environ['CATEGORY_RULES_TABLE'] = 'CategoryRules'
os.environ['USER_BUDGETS_TABLE'] = 'UserBudgets'
os.environ['GROQ_API_KEY'] = 'test-key'

# Import the handler
sys.path.insert(0, '/workspace/backend/lambda/expenses-api-py')
from index import handler

def test_categories_endpoint():
    """Test the categories endpoint"""
    print("🧪 Testing GET /categories endpoint...")
    
    event = {
        "requestContext": {
            "http": {
                "method": "GET"
            },
            "routeKey": "GET /categories"
        },
        "rawPath": "/categories"
    }
    
    context = {}
    
    try:
        response = handler(event, context)
        print(f"✅ Response: {response}")
        
        if response['statusCode'] == 200:
            body = json.loads(response['body'])
            if 'categories' in body:
                print(f"✅ Categories returned: {len(body['categories'])} categories")
                return True
            else:
                print("❌ No categories in response")
                return False
        else:
            print(f"❌ Status code: {response['statusCode']}")
            return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_add_endpoint():
    """Test the POST /add endpoint"""
    print("\n🧪 Testing POST /add endpoint...")
    
    event = {
        "requestContext": {
            "http": {
                "method": "POST"
            },
            "routeKey": "POST /add"
        },
        "rawPath": "/add",
        "body": json.dumps({
            "userId": "test_user",
            "rawText": "Lunch 250 at restaurant"
        })
    }
    
    context = {}
    
    try:
        response = handler(event, context)
        print(f"✅ Response: {response}")
        
        if response['statusCode'] == 200:
            body = json.loads(response['body'])
            if 'amount' in body and 'category' in body:
                print(f"✅ Parsed: Amount={body['amount']}, Category={body['category']}")
                return True
            else:
                print("❌ Missing amount or category in response")
                return False
        else:
            print(f"❌ Status code: {response['statusCode']}")
            return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def main():
    """Run all tests"""
    print("🚀 Testing Expenses Lambda Function")
    print("=" * 50)
    
    tests = [
        test_categories_endpoint,
        test_add_endpoint
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        if test():
            passed += 1
    
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! The Lambda function is working correctly.")
        return 0
    else:
        print("❌ Some tests failed. Please check the issues above.")
        return 1

if __name__ == "__main__":
    sys.exit(main())