#!/usr/bin/env python3
"""
Script to create a proper Supabase Auth user with password.
"""

import os
import sys
import requests
import json
from pathlib import Path
from dotenv import load_dotenv

# Add the parent directory to sys.path to import app modules
sys.path.append(str(Path(__file__).parent.parent))

# Load environment variables
load_dotenv(Path(__file__).parent.parent / ".env")

# Get Supabase details from environment
supabase_url = os.getenv("SUPABASE_URL")
supabase_service_key = os.getenv("SUPABASE_SERVICE_KEY")

if not supabase_url or not supabase_service_key:
    print("Error: SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables not set")
    sys.exit(1)

def create_supabase_user(email, password, full_name):
    """Create a user in Supabase Auth."""
    url = f"{supabase_url}/auth/v1/admin/users"
    
    headers = {
        "apikey": supabase_service_key,
        "Authorization": f"Bearer {supabase_service_key}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "email": email,
        "password": password,
        "user_metadata": {
            "full_name": full_name
        },
        "email_confirm": True  # Auto-confirm email
    }
    
    try:
        response = requests.post(url, headers=headers, json=payload)
        response.raise_for_status()
        user_data = response.json()
        return user_data
    except requests.exceptions.HTTPError as e:
        print(f"HTTP Error: {e}")
        if response.text:
            print(f"Response: {response.text}")
        sys.exit(1)
    except Exception as e:
        print(f"Error creating user: {e}")
        sys.exit(1)

def main():
    print("Create a new Supabase Auth user")
    print("===============================")
    
    email = input("Enter email address: ")
    password = input("Enter password (min 6 characters): ")
    full_name = input("Enter full name: ")
    
    if len(password) < 6:
        print("Error: Password must be at least 6 characters")
        sys.exit(1)
    
    print(f"\nCreating user with email: {email}...")
    user_data = create_supabase_user(email, password, full_name)
    
    user_id = user_data.get("id")
    if user_id:
        print(f"✅ User created successfully!")
        print(f"User ID: {user_id}")
        print(f"Email: {email}")
        print(f"Full Name: {full_name}")
        
        # Update .env file with the new user ID
        env_path = Path(__file__).parent.parent / ".env"
        with open(env_path, "r") as f:
            env_content = f.read()
        
        if "SUPABASE_USER_ID" in env_content:
            # Replace existing SUPABASE_USER_ID
            lines = env_content.split("\n")
            for i, line in enumerate(lines):
                if line.startswith("SUPABASE_USER_ID="):
                    lines[i] = f"SUPABASE_USER_ID={user_id}"
                    break
            new_env_content = "\n".join(lines)
        else:
            # Add SUPABASE_USER_ID if it doesn't exist
            new_env_content = f"{env_content.rstrip()}\nSUPABASE_USER_ID={user_id}\n"
        
        with open(env_path, "w") as f:
            f.write(new_env_content)
        
        print(f"\n✅ Updated .env file with new user ID")
        print(f"You can now log in with email: {email} and the password you provided")
    else:
        print("❌ Failed to create user")

if __name__ == "__main__":
    main()
