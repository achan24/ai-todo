#!/usr/bin/env python3
"""
Test script for SambaNova API integration.
This script tests the SambaNova API key and connection directly.
"""

import os
import json
import requests
import sys
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Get API key from environment
api_key = os.getenv("SAMBANOVA_API_KEY")
api_url = os.getenv("SAMBANOVA_API_URL", "https://api.sambanova.ai/v1")

if not api_key:
    print("Error: SAMBANOVA_API_KEY environment variable is not set.")
    print("Please create a .env file in the backend directory with your API key.")
    sys.exit(1)

print(f"Using API key: {api_key[:5]}...{api_key[-5:]} (masked for security)")
print(f"Using API URL: {api_url}")

def test_chat_api():
    """Test the SambaNova chat API endpoint."""
    print("\n=== Testing Chat API ===")
    
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {api_key}'
    }
    
    payload = {
        'messages': [
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": "Hello, can you help me break down a task?"}
        ],
        'model': 'Meta-Llama-3.1-405B-Instruct',
        'stream': False,
        'temperature': 0.7,
        'max_tokens': 500
    }
    
    try:
        print("Sending request to SambaNova API...")
        response = requests.post(
            f"{api_url}/chat/completions", 
            headers=headers, 
            json=payload
        )
        
        print(f"Response status code: {response.status_code}")
        
        if response.status_code == 200:
            print("Success! API key is working correctly.")
            result = response.json()
            print("\nAPI Response:")
            print(json.dumps(result, indent=2))
            return True
        else:
            print(f"Error: {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"Exception occurred: {str(e)}")
        return False

if __name__ == "__main__":
    test_chat_api()
