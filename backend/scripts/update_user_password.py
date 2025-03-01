#!/usr/bin/env python3
"""
Script to update the password for an existing Supabase user.
"""

import os
import sys
import requests
from pathlib import Path
from dotenv import load_dotenv

# Add the parent directory to sys.path to import app modules
sys.path.append(str(Path(__file__).parent.parent))

# Load environment variables
load_dotenv(Path(__file__).parent.parent / ".env")

# Get Supabase details from environment
supabase_url = os.getenv("SUPABASE_URL")
supabase_service_key = os.getenv("SUPABASE_SERVICE_KEY")
supabase_user_id = os.getenv("SUPABASE_USER_ID")

if not supabase_url or not supabase_service_key:
    print("Error: SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables not set")
    sys.exit(1)

if not supabase_user_id:
    print("Error: SUPABASE_USER_ID environment variable not set")
    sys.exit(1)

def update_user_password(user_id, password):
    """Update password for a Supabase user."""
    url = f"{supabase_url}/auth/v1/admin/users/{user_id}"
    
    headers = {
        "apikey": supabase_service_key,
        "Authorization": f"Bearer {supabase_service_key}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "password": password
    }
    
    try:
        response = requests.put(url, headers=headers, json=payload)
        response.raise_for_status()
        return True
    except requests.exceptions.HTTPError as e:
        print(f"HTTP Error: {e}")
        if response.text:
            print(f"Response: {response.text}")
        return False
    except Exception as e:
        print(f"Error updating user password: {e}")
        return False

def main():
    print("Update password for existing Supabase user")
    print("=========================================")
    
    print(f"User ID: {supabase_user_id}")
    
    # Get user email from Supabase
    url = f"{supabase_url}/auth/v1/admin/users/{supabase_user_id}"
    headers = {
        "apikey": supabase_service_key,
        "Authorization": f"Bearer {supabase_service_key}"
    }
    
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        user_data = response.json()
        email = user_data.get("email", "Unknown")
        print(f"Email: {email}")
    except Exception as e:
        print(f"Error fetching user details: {e}")
        email = "Unknown"
    
    password = input("Enter new password (min 6 characters): ")
    
    if len(password) < 6:
        print("Error: Password must be at least 6 characters")
        sys.exit(1)
    
    print(f"\nUpdating password for user {email}...")
    success = update_user_password(supabase_user_id, password)
    
    if success:
        print(f"✅ Password updated successfully!")
        print(f"You can now log in with email: {email} and your new password")
    else:
        print("❌ Failed to update password")

if __name__ == "__main__":
    main()
