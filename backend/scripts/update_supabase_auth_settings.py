#!/usr/bin/env python3
"""
Script to update Supabase Auth settings to enforce proper password resets.
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

def get_current_auth_settings():
    """Get current Supabase Auth settings."""
    url = f"{supabase_url}/auth/v1/config"
    
    headers = {
        "apikey": supabase_service_key,
        "Authorization": f"Bearer {supabase_service_key}"
    }
    
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.HTTPError as e:
        print(f"HTTP Error: {e}")
        if response.text:
            print(f"Response: {response.text}")
        sys.exit(1)
    except Exception as e:
        print(f"Error getting auth settings: {e}")
        sys.exit(1)

def update_auth_settings(settings):
    """Update Supabase Auth settings."""
    url = f"{supabase_url}/auth/v1/config"
    
    headers = {
        "apikey": supabase_service_key,
        "Authorization": f"Bearer {supabase_service_key}",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.put(url, headers=headers, json=settings)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.HTTPError as e:
        print(f"HTTP Error: {e}")
        if response.text:
            print(f"Response: {response.text}")
        sys.exit(1)
    except Exception as e:
        print(f"Error updating auth settings: {e}")
        sys.exit(1)

def main():
    print("Update Supabase Auth Settings")
    print("============================")
    
    # Get current settings
    print("Getting current auth settings...")
    current_settings = get_current_auth_settings()
    
    # Display current settings
    print("\nCurrent Auth Settings:")
    print(json.dumps(current_settings, indent=2))
    
    # Update settings to enforce password resets
    new_settings = current_settings.copy()
    
    # Ensure mailer settings exist
    if 'mailer' not in new_settings:
        new_settings['mailer'] = {}
    
    # Update mailer settings
    new_settings['mailer']['email_confirm_required'] = True
    new_settings['mailer']['enable_password_recovery'] = True
    new_settings['mailer']['secure_email_change_enabled'] = True
    
    # Ensure security settings exist
    if 'security' not in new_settings:
        new_settings['security'] = {}
    
    # Critical: This ensures password recovery requires setting a new password
    new_settings['security']['enforce_password_on_recovery'] = True
    
    # Disable magic links for login (if this setting exists)
    if 'external' not in new_settings:
        new_settings['external'] = {}
    if 'email' not in new_settings['external']:
        new_settings['external']['email'] = {}
    
    # Disable magic link login if possible
    new_settings['external']['email']['enable_magic_links'] = False
    
    # Update settings
    print("\nUpdating auth settings...")
    updated_settings = update_auth_settings(new_settings)
    
    print("\n Auth settings updated successfully!")
    print("Password recovery now requires setting a new password.")
    print("Magic link logins have been disabled.")

if __name__ == "__main__":
    main()
