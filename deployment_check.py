#!/usr/bin/env python3
"""
Deployment Readiness Check Script for AI-Todo App
This script checks if your application is ready for deployment by verifying:
1. Required files exist
2. Environment variables are set
3. Dependencies are installed
4. Git repository is clean
"""

import os
import sys
import subprocess
import json
from pathlib import Path

# Colors for terminal output
class Colors:
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'

def print_status(message, status, details=None):
    """Print a status message with color coding"""
    status_color = Colors.OKGREEN if status else Colors.FAIL
    status_text = "✓ PASS" if status else "✗ FAIL"
    print(f"{message:<60} [{status_color}{status_text}{Colors.ENDC}]")
    if details and not status:
        print(f"  {Colors.WARNING}Details: {details}{Colors.ENDC}")
    return status

def check_file_exists(filepath, required=True):
    """Check if a file exists"""
    exists = os.path.exists(filepath)
    status = exists if required else True
    message = f"Checking for {filepath}"
    details = "File not found" if required and not exists else None
    return print_status(message, status, details)

def check_env_vars(env_file, required_vars):
    """Check if required environment variables are set in an env file"""
    if not os.path.exists(env_file):
        return print_status(f"Checking env vars in {env_file}", False, "File not found")
    
    missing_vars = []
    with open(env_file, 'r') as f:
        content = f.read()
        for var in required_vars:
            if var not in content:
                missing_vars.append(var)
    
    status = len(missing_vars) == 0
    details = f"Missing variables: {', '.join(missing_vars)}" if missing_vars else None
    return print_status(f"Checking env vars in {env_file}", status, details)

def check_dependencies(requirements_file):
    """Check if all dependencies in requirements.txt are installed"""
    if not os.path.exists(requirements_file):
        return print_status(f"Checking dependencies in {requirements_file}", False, "File not found")
    
    try:
        # Get installed packages
        installed = subprocess.check_output([sys.executable, '-m', 'pip', 'freeze']).decode('utf-8')
        installed = {line.split('==')[0].lower() for line in installed.split('\n') if line}
        
        # Get required packages
        with open(requirements_file, 'r') as f:
            required = {line.split('==')[0].lower() for line in f.read().split('\n') 
                       if line and not line.startswith('#')}
        
        missing = [pkg for pkg in required if pkg not in installed]
        status = len(missing) == 0
        details = f"Missing packages: {', '.join(missing)}" if missing else None
        return print_status(f"Checking dependencies in {requirements_file}", status, details)
    except Exception as e:
        return print_status(f"Checking dependencies in {requirements_file}", False, str(e))

def check_npm_dependencies(package_json):
    """Check if package.json exists and has required dependencies"""
    if not os.path.exists(package_json):
        return print_status(f"Checking {package_json}", False, "File not found")
    
    try:
        with open(package_json, 'r') as f:
            data = json.load(f)
        
        required_deps = ["react", "next", "@supabase/supabase-js"]
        missing = [dep for dep in required_deps if dep not in data.get('dependencies', {})]
        
        status = len(missing) == 0
        details = f"Missing dependencies: {', '.join(missing)}" if missing else None
        return print_status(f"Checking dependencies in {package_json}", status, details)
    except Exception as e:
        return print_status(f"Checking {package_json}", False, str(e))

def check_git_status():
    """Check if git repository is clean (no uncommitted changes)"""
    try:
        result = subprocess.run(['git', 'status', '--porcelain'], 
                               capture_output=True, text=True, check=True)
        is_clean = not result.stdout.strip()
        details = "Uncommitted changes found" if not is_clean else None
        return print_status("Checking git repository status", is_clean, details)
    except Exception as e:
        return print_status("Checking git repository status", False, str(e))

def main():
    """Main function to run all checks"""
    print(f"\n{Colors.HEADER}===== AI-Todo Deployment Readiness Check ====={Colors.ENDC}\n")
    
    # Define paths
    root_dir = Path(__file__).parent
    frontend_dir = root_dir / "ai-todo-frontend"
    backend_dir = root_dir / "backend"
    
    all_checks_passed = True
    
    # Check required files
    print(f"\n{Colors.BOLD}Checking Required Files:{Colors.ENDC}")
    files_to_check = [
        # Frontend files
        (frontend_dir / "package.json", True),
        (frontend_dir / "next.config.js", True),
        (frontend_dir / ".env.local", True),
        (frontend_dir / "vercel.json", True),
        # Backend files
        (backend_dir / "requirements.txt", True),
        (backend_dir / "Procfile", True),
        (backend_dir / "runtime.txt", True),
        (backend_dir / ".env", True),
        # Deployment files
        (root_dir / "README.md", True),
        (root_dir / "DEPLOYMENT.md", True),
    ]
    
    for filepath, required in files_to_check:
        all_checks_passed &= check_file_exists(filepath, required)
    
    # Check environment variables
    print(f"\n{Colors.BOLD}Checking Environment Variables:{Colors.ENDC}")
    frontend_env_vars = [
        "NEXT_PUBLIC_SUPABASE_URL",
        "NEXT_PUBLIC_SUPABASE_ANON_KEY",
        "NEXT_PUBLIC_API_URL"
    ]
    backend_env_vars = [
        "DATABASE_URL",
        "SUPABASE_URL",
        "SUPABASE_SERVICE_KEY",
        "SUPABASE_JWT_SECRET",
        "OPENAI_API_KEY"
    ]
    
    all_checks_passed &= check_env_vars(frontend_dir / ".env.local", frontend_env_vars)
    all_checks_passed &= check_env_vars(backend_dir / ".env", backend_env_vars)
    
    # Check dependencies
    print(f"\n{Colors.BOLD}Checking Dependencies:{Colors.ENDC}")
    all_checks_passed &= check_dependencies(backend_dir / "requirements.txt")
    all_checks_passed &= check_npm_dependencies(frontend_dir / "package.json")
    
    # Check git status
    print(f"\n{Colors.BOLD}Checking Git Repository:{Colors.ENDC}")
    all_checks_passed &= check_git_status()
    
    # Final result
    print(f"\n{Colors.BOLD}Final Result:{Colors.ENDC}")
    if all_checks_passed:
        print(f"{Colors.OKGREEN}All checks passed! Your application is ready for deployment.{Colors.ENDC}")
    else:
        print(f"{Colors.FAIL}Some checks failed. Please fix the issues before deploying.{Colors.ENDC}")
    
    return 0 if all_checks_passed else 1

if __name__ == "__main__":
    sys.exit(main())
