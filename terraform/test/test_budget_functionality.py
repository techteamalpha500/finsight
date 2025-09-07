#!/usr/bin/env python3
"""
Test script for budget functionality
"""

import json
import sys
import os

# Mock boto3 for testing
class MockTable:
    def __init__(self, name):
        self.name = name
        self.data = {}
    
    def get_item(self, **kwargs):
        key = kwargs.get('Key', {})
        user_id = key.get('userId', '')
        return {"Item": self.data.get(user_id, {})}
    
    def put_item(self, **kwargs):
        item = kwargs.get('Item', {})
        user_id = item.get('userId', '')
        self.data[user_id] = item
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

def test_budget_save():
    """Test saving budgets with new format"""
    print("🧪 Testing PUT /budgets endpoint (new format)...")
    
    event = {
        "requestContext": {
            "http": {
                "method": "PUT"
            },
            "routeKey": "PUT /budgets"
        },
        "rawPath": "/budgets",
        "body": json.dumps({
            "userId": "test_user",
            "defaultBudgets": {
                "Food": 1000,
                "Travel": 500
            },
            "overrides": {
                "2024-01": {
                    "Food": 1200
                }
            }
        })
    }
    
    context = {}
    
    try:
        response = handler(event, context)
        print(f"✅ Response: {response}")
        
        if response['statusCode'] == 200:
            print("✅ Budget saved successfully")
            return True
        else:
            print(f"❌ Status code: {response['statusCode']}")
            return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_budget_get():
    """Test getting budgets"""
    print("\n🧪 Testing GET /budgets endpoint...")
    
    event = {
        "requestContext": {
            "http": {
                "method": "GET"
            },
            "routeKey": "GET /budgets"
        },
        "rawPath": "/budgets",
        "queryStringParameters": {
            "userId": "test_user"
        }
    }
    
    context = {}
    
    try:
        response = handler(event, context)
        print(f"✅ Response: {response}")
        
        if response['statusCode'] == 200:
            body = json.loads(response['body'])
            if 'defaultBudgets' in body and 'overrides' in body:
                print(f"✅ Budgets retrieved: defaultBudgets={body['defaultBudgets']}, overrides={body['overrides']}")
                return True
            else:
                print("❌ Missing defaultBudgets or overrides in response")
                return False
        else:
            print(f"❌ Status code: {response['statusCode']}")
            return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def main():
    """Run all tests"""
    print("🚀 Testing Budget Functionality")
    print("=" * 50)
    
    tests = [
        test_budget_save,
        test_budget_get
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        if test():
            passed += 1
    
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All budget tests passed! The budget functionality is working correctly.")
        return 0
    else:
        print("❌ Some tests failed. Please check the issues above.")
        return 1

if __name__ == "__main__":
    sys.exit(main())