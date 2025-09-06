import json
import logging
import importlib.util
import sys
import os

# Import modules with hyphens in their names
def import_module_from_file(module_name, file_path):
    spec = importlib.util.spec_from_file_location(module_name, file_path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[module_name] = module
    spec.loader.exec_module(module)
    return module

# Import the handlers
stocks_module = import_module_from_file("fetch_stocks", "fetch-stocks.py")
mf_module = import_module_from_file("fetch_mf_nav", "fetch-mf-nav.py")

stocks_handler = stocks_module.lambda_handler
mf_handler = mf_module.lambda_handler

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

def lambda_handler(event, context):
    """
    Main lambda handler that routes to either stocks or MF parsing
    based on the event payload.
    
    Event payload options:
    1. {"type": "stocks"} - Parse stock data only
    2. {"type": "mf"} - Parse mutual fund data only  
    3. {"type": "both"} - Parse both stocks and MF data
    4. {} or no type - Parse both (default)
    """
    
    try:
        # Parse event payload
        if isinstance(event, str):
            event_data = json.loads(event)
        else:
            event_data = event or {}
        
        parse_type = event_data.get("type", "both").lower()
        logger.info(f"Starting data parsing with type: {parse_type}")
        
        results = {}
        
        # Route based on type
        if parse_type == "stocks":
            logger.info("Executing stocks parsing only")
            try:
                stocks_result = stocks_handler(event, context)
                results["stocks"] = stocks_result
            except Exception as e:
                logger.error(f"Stocks parsing failed: {str(e)}")
                results["stocks"] = {
                    "statusCode": 500,
                    "body": f"Stocks parsing failed: {str(e)}"
                }
            
        elif parse_type == "mf":
            logger.info("Executing mutual fund parsing only")
            try:
                mf_result = mf_handler(event, context)
                results["mutual_funds"] = mf_result
            except Exception as e:
                logger.error(f"Mutual fund parsing failed: {str(e)}")
                results["mutual_funds"] = {
                    "statusCode": 500,
                    "body": f"Mutual fund parsing failed: {str(e)}"
                }
            
        elif parse_type == "both":
            logger.info("Executing both stocks and mutual fund parsing")
            
            # Parse stocks
            logger.info("Starting stocks parsing...")
            try:
                stocks_result = stocks_handler(event, context)
                results["stocks"] = stocks_result
            except Exception as e:
                logger.error(f"Stocks parsing failed: {str(e)}")
                results["stocks"] = {
                    "statusCode": 500,
                    "body": f"Stocks parsing failed: {str(e)}"
                }
            
            # Parse mutual funds
            logger.info("Starting mutual fund parsing...")
            try:
                mf_result = mf_handler(event, context)
                results["mutual_funds"] = mf_result
            except Exception as e:
                logger.error(f"Mutual fund parsing failed: {str(e)}")
                results["mutual_funds"] = {
                    "statusCode": 500,
                    "body": f"Mutual fund parsing failed: {str(e)}"
                }
            
        else:
            return {
                "statusCode": 400,
                "body": {
                    "error": f"Invalid parse type: {parse_type}",
                    "valid_types": ["stocks", "mf", "both"]
                }
            }
        
        # Return combined results
        return {
            "statusCode": 200,
            "body": {
                "message": f"Data parsing completed for type: {parse_type}",
                "results": results
            }
        }
        
    except Exception as e:
        logger.error(f"Error in main lambda handler: {str(e)}")
        return {
            "statusCode": 500,
            "body": {
                "error": str(e),
                "message": "Data parsing failed"
            }
        }