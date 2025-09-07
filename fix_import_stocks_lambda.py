#!/usr/bin/env python3
"""
Fix the import-stocks Lambda by building and deploying it with correct dependencies
"""

import os
import sys
import subprocess
import shutil
import zipfile
from pathlib import Path

def run_command(cmd, check=True, capture_output=False):
    """Run a shell command and return the result"""
    print(f"🔧 Running: {' '.join(cmd)}")
    result = subprocess.run(cmd, check=check, capture_output=capture_output, text=True)
    if capture_output:
        return result.stdout.strip()
    return result

def build_import_stocks_lambda():
    """Build the import-stocks Lambda with all dependencies"""
    print("🔧 Building import-stocks Lambda with dependencies...")
    
    # Paths
    lambda_src = Path("backend/lambda/import-stocks")
    build_dir = Path("terraform/lambda_build_import_stocks")
    zip_file = Path("terraform/import_stocks.zip")
    
    if not lambda_src.exists():
        print(f"❌ Lambda source not found: {lambda_src}")
        return False
    
    print(f"✅ Lambda source found: {lambda_src}")
    
    # Clean up previous builds
    if build_dir.exists():
        shutil.rmtree(build_dir)
    if zip_file.exists():
        zip_file.unlink()
    
    # Create build directory
    build_dir.mkdir(parents=True, exist_ok=True)
    
    # Copy Lambda source files
    print("📋 Copying source files...")
    for file in lambda_src.glob("*.py"):
        shutil.copy2(file, build_dir)
        print(f"  ✅ Copied {file.name}")
    
    # Install dependencies
    requirements_file = lambda_src / "requirements.txt"
    if requirements_file.exists():
        print("📦 Installing dependencies...")
        with open(requirements_file, 'r') as f:
            requirements = f.read().strip()
        print(f"📋 Requirements: {requirements}")
        
        try:
            run_command([
                "pip3", "install", "-r", str(requirements_file), 
                "-t", str(build_dir), "--upgrade", "--no-cache-dir"
            ])
            print("✅ Dependencies installed successfully")
        except subprocess.CalledProcessError as e:
            print(f"❌ Failed to install dependencies: {e}")
            return False
        
        # Verify critical dependencies
        print("🔍 Verifying dependencies...")
        critical_deps = ['boto3', 'openpyxl', 'PyPDF2', 'pdfplumber']
        missing_deps = []
        
        for dep in critical_deps:
            dep_found = False
            for item in build_dir.iterdir():
                if item.is_dir() and (item.name == dep or item.name.startswith(f"{dep}-")):
                    dep_found = True
                    print(f"  ✅ {dep} found")
                    break
            
            if not dep_found:
                missing_deps.append(dep)
                print(f"  ❌ {dep} missing")
        
        if missing_deps:
            print(f"❌ Missing dependencies: {missing_deps}")
            print("📁 Build directory contents:")
            for item in sorted(build_dir.iterdir()):
                print(f"  - {item.name}")
            return False
        
        print("✅ All dependencies verified")
    
    # Create deployment ZIP
    print("📦 Creating deployment ZIP...")
    with zipfile.ZipFile(zip_file, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for file_path in build_dir.rglob("*"):
            if file_path.is_file():
                arcname = file_path.relative_to(build_dir)
                zipf.write(file_path, arcname)
    
    print(f"✅ Created {zip_file}")
    print(f"ZIP size: {zip_file.stat().st_size} bytes")
    
    # Verify ZIP contents
    print("🔍 Verifying ZIP contents...")
    with zipfile.ZipFile(zip_file, 'r') as zipf:
        file_list = zipf.namelist()
        print(f"Total files: {len(file_list)}")
        
        # Check for critical files
        has_index = any('index.py' in f for f in file_list)
        has_openpyxl = any('openpyxl' in f for f in file_list)
        has_boto3 = any('boto3' in f for f in file_list)
        
        print(f"Contains index.py: {has_index}")
        print(f"Contains openpyxl: {has_openpyxl}")
        print(f"Contains boto3: {has_boto3}")
        
        if not (has_index and has_openpyxl and has_boto3):
            print("❌ ZIP verification failed")
            return False
        
        print("✅ ZIP verification passed")
    
    # Clean up build directory
    shutil.rmtree(build_dir)
    return True

def deploy_lambda():
    """Deploy the Lambda using AWS CLI"""
    print("🚀 Deploying Lambda...")
    
    zip_file = Path("terraform/import_stocks.zip")
    if not zip_file.exists():
        print(f"❌ ZIP file not found: {zip_file}")
        return False
    
    try:
        # Update the Lambda function code
        run_command([
            "aws", "lambda", "update-function-code",
            "--function-name", "import-stocks",
            "--zip-file", f"fileb://{zip_file}"
        ])
        print("✅ Lambda function code updated successfully")
        
        # Wait a moment for the update to complete
        import time
        time.sleep(5)
        
        # Test the Lambda
        print("🧪 Testing Lambda function...")
        test_payload = {
            "broker": "Zerodha",
            "file_content": "dGVzdA==",  # "test" in base64
            "password": "",
            "file_extension": ".xlsx"
        }
        
        import json
        import tempfile
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            json.dump(test_payload, f)
            test_file = f.name
        
        try:
            result = run_command([
                "aws", "lambda", "invoke",
                "--function-name", "import-stocks",
                "--payload", f"file://{test_file}",
                "--cli-binary-format", "raw-in-base64-out",
                "test_response.json"
            ], capture_output=True)
            
            print("✅ Lambda test completed")
            
            # Check response
            if Path("test_response.json").exists():
                with open("test_response.json", 'r') as f:
                    response = json.load(f)
                print(f"Response: {json.dumps(response, indent=2)}")
                
                if "errorMessage" in response:
                    print(f"❌ Lambda error: {response['errorMessage']}")
                    return False
                else:
                    print("✅ Lambda test successful")
            
        finally:
            # Clean up test files
            if Path(test_file).exists():
                os.unlink(test_file)
            if Path("test_response.json").exists():
                os.unlink("test_response.json")
        
        return True
        
    except subprocess.CalledProcessError as e:
        print(f"❌ Deployment failed: {e}")
        return False

def main():
    """Main function"""
    print("🚀 Fixing import-stocks Lambda")
    print("=" * 50)
    
    # Check prerequisites
    try:
        run_command(["aws", "sts", "get-caller-identity"], capture_output=True)
        print("✅ AWS CLI configured")
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("❌ AWS CLI not configured")
        return False
    
    # Build Lambda
    if not build_import_stocks_lambda():
        print("❌ Lambda build failed")
        return False
    
    # Deploy Lambda
    if not deploy_lambda():
        print("❌ Lambda deployment failed")
        return False
    
    print("\n🎉 SUCCESS!")
    print("✅ import-stocks Lambda has been rebuilt and deployed with openpyxl")
    print("✅ Your Zerodha Excel import should now work!")
    
    return True

if __name__ == "__main__":
    success = main()
    if not success:
        sys.exit(1)