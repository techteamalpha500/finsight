#!/usr/bin/env python3
"""
Build the import-stocks Lambda package with all dependencies
"""

import os
import sys
import subprocess
import shutil
import zipfile
from pathlib import Path

def build_import_stocks_package():
    """Build the import-stocks Lambda package with all dependencies"""
    print("🔧 Building import-stocks Lambda package...")
    
    # Paths
    lambda_src = Path("backend/lambda/import-stocks")
    build_dir = Path("import_stocks_build")
    zip_file = Path("import_stocks_fixed.zip")
    
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
        print(f"📋 Requirements:")
        for line in requirements.split('\n'):
            print(f"  {line}")
        
        try:
            subprocess.run([
                "pip3", "install", "-r", str(requirements_file), 
                "-t", str(build_dir), "--upgrade", "--no-cache-dir"
            ], check=True)
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
    print(f"ZIP size: {zip_file.stat().st_size / (1024*1024):.1f} MB")
    
    # Verify ZIP contents
    print("🔍 Verifying ZIP contents...")
    with zipfile.ZipFile(zip_file, 'r') as zipf:
        file_list = zipf.namelist()
        print(f"Total files: {len(file_list)}")
        
        # Check for critical files
        has_index = any('index.py' in f for f in file_list)
        has_openpyxl = any('openpyxl' in f for f in file_list)
        has_boto3 = any('boto3' in f for f in file_list)
        has_pypdf2 = any('PyPDF2' in f for f in file_list)
        has_pdfplumber = any('pdfplumber' in f for f in file_list)
        
        print(f"Contains index.py: {has_index}")
        print(f"Contains openpyxl: {has_openpyxl}")
        print(f"Contains boto3: {has_boto3}")
        print(f"Contains PyPDF2: {has_pypdf2}")
        print(f"Contains pdfplumber: {has_pdfplumber}")
        
        if not (has_index and has_openpyxl and has_boto3 and has_pypdf2 and has_pdfplumber):
            print("❌ ZIP verification failed")
            return False
        
        print("✅ ZIP verification passed")
        
        # Show some key files
        print("📁 Key files in ZIP:")
        key_files = [f for f in file_list if any(key in f for key in ['index.py', 'openpyxl', 'boto3', 'PyPDF2', 'pdfplumber'])]
        for file in key_files[:10]:  # Show first 10
            print(f"  - {file}")
        if len(key_files) > 10:
            print(f"  ... and {len(key_files) - 10} more key files")
    
    # Clean up build directory
    shutil.rmtree(build_dir)
    return True

def main():
    """Main function"""
    print("🚀 Building import-stocks Lambda Package")
    print("=" * 60)
    
    if build_import_stocks_package():
        print("\n🎉 SUCCESS!")
        print("✅ import-stocks Lambda package built with all dependencies")
        print("✅ File: import_stocks_fixed.zip")
        print("\n📝 Next steps:")
        print("1. Upload import_stocks_fixed.zip to your Lambda function")
        print("2. Test the Zerodha Excel import")
        print("\n🚀 Your Zerodha import should now work!")
        return True
    else:
        print("\n❌ FAILED!")
        print("❌ Could not build Lambda package")
        return False

if __name__ == "__main__":
    success = main()
    if not success:
        sys.exit(1)