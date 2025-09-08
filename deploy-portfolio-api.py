#!/usr/bin/env python3
"""
Individual Deployment Script for portfolio-api Lambda
This script handles deployment of only the portfolio-api Lambda function
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

def check_prerequisites():
    """Check if required tools are installed"""
    print("🔍 Checking prerequisites...")
    
    # Check Terraform
    try:
        run_command(["terraform", "version"], capture_output=True)
        print("✅ Terraform is installed")
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("❌ Terraform is not installed. Please install Terraform first.")
        sys.exit(1)
    
    # Check AWS CLI
    try:
        run_command(["aws", "sts", "get-caller-identity"], capture_output=True)
        print("✅ AWS CLI is configured")
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("❌ AWS CLI is not configured. Please run 'aws configure' first.")
        sys.exit(1)

def build_portfolio_api_package():
    """Build portfolio-api Lambda package with dependencies"""
    print("🔧 Building portfolio-api Lambda package...")
    
    # Paths for portfolio-api
    lambda_src = Path("backend/lambda/portfolio-api-py")
    build_dir = Path("terraform/portfolio_api_build")
    zip_file = Path("terraform/portfolio_api.zip")
    
    if not lambda_src.exists():
        print(f"❌ Lambda source directory not found: {lambda_src}")
        sys.exit(1)
    
    # Clean up previous build
    if build_dir.exists():
        print(f"🧹 Cleaning up previous build directory: {build_dir}")
        shutil.rmtree(build_dir)
    
    if zip_file.exists():
        print(f"🧹 Removing previous zip file: {zip_file}")
        zip_file.unlink()
    
    # Create build directory
    build_dir.mkdir(parents=True, exist_ok=True)
    
    # Copy Lambda source code
    print(f"📁 Copying Lambda source code from {lambda_src} to {build_dir}")
    for item in lambda_src.iterdir():
        if item.is_file():
            shutil.copy2(item, build_dir)
        elif item.is_dir():
            shutil.copytree(item, build_dir / item.name)
    
    # Install dependencies
    requirements_file = build_dir / "requirements.txt"
    if requirements_file.exists():
        print("📦 Installing Python dependencies...")
        run_command([
            "pip3", "install", "-r", str(requirements_file), 
            "-t", str(build_dir), "--upgrade"
        ])
        
        # Verify critical dependencies
        print("🔍 Verifying critical dependencies...")
        critical_deps = ['boto3']
        for dep in critical_deps:
            dep_path = build_dir / dep
            if dep_path.exists():
                print(f"✅ {dep} found")
            else:
                print(f"❌ {dep} not found")
    else:
        print("⚠️  No requirements.txt found, skipping dependency installation")
    
    # Create ZIP file
    print(f"📦 Creating ZIP file: {zip_file}")
    with zipfile.ZipFile(zip_file, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(build_dir):
            for file in files:
                file_path = Path(root) / file
                arcname = file_path.relative_to(build_dir)
                zipf.write(file_path, arcname)
    
    # Verify ZIP contents
    print("🔍 Verifying ZIP contents...")
    with zipfile.ZipFile(zip_file, 'r') as zipf:
        files = zipf.namelist()
        print(f"📊 ZIP contains {len(files)} files")
        
        # Check for critical files
        critical_files = ['index.py']
        for file in critical_files:
            if file in files:
                print(f"✅ {file} found in ZIP")
            else:
                print(f"❌ {file} not found in ZIP")
    
    print(f"✅ portfolio-api package built successfully: {zip_file}")
    return zip_file

def deploy_terraform():
    """Deploy only the portfolio-api Lambda using Terraform"""
    print("🚀 Deploying portfolio-api Lambda with Terraform...")
    
    # Initialize Terraform
    print("🔧 Initializing Terraform...")
    run_command(["terraform", "init"])
    
    # Plan deployment
    print("📋 Planning Terraform deployment...")
    run_command(["terraform", "plan", "-target=aws_lambda_function.portfolio_api"])
    
    # Apply deployment
    print("🚀 Applying Terraform deployment...")
    run_command(["terraform", "apply", "-target=aws_lambda_function.portfolio_api", "-auto-approve"])
    
    print("✅ portfolio-api Lambda deployed successfully!")

def main():
    """Main deployment function"""
    print("🚀 Starting portfolio-api Lambda deployment...")
    print("=" * 60)
    
    # Check prerequisites
    check_prerequisites()
    
    # Build Lambda package
    build_portfolio_api_package()
    
    # Deploy with Terraform
    deploy_terraform()
    
    print("=" * 60)
    print("🎉 portfolio-api Lambda deployment completed successfully!")
    print("📊 You can now test the portfolio API functionality")

if __name__ == "__main__":
    main()