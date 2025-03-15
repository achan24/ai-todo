"""
Test script for the DeepSeek LLM integration via OpenRouter
This script tests the direct integration with the OpenRouter API using DeepSeek model
"""

import os
import sys
import json
import requests
from dotenv import load_dotenv

# Add the parent directory to sys.path to allow imports from app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Load environment variables from backend/.env file
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"))

from app.core.config import settings

def test_deepseek_via_openrouter():
    """Test direct integration with DeepSeek LLM via OpenRouter"""
    print("\n=== Testing DeepSeek LLM via OpenRouter ===")
    
    # Check if OpenRouter API key is set
    if not settings.OPENROUTER_API_KEY:
        print("Error: OPENROUTER_API_KEY environment variable not set")
        print("Make sure to set it in the backend/.env file")
        return
    
    # Create a simple prompt
    prompt = "What are the top 5 productivity tips for software developers?"
    
    # Call OpenRouter API with DeepSeek model
    url = "https://openrouter.ai/api/v1/chat/completions"
    
    headers = {
        "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://ai-todo-app.com",
        "X-Title": "AI-Todo App",
    }
    
    payload = {
        "model": "deepseek/deepseek-r1-zero:free",
        "messages": [
            {"role": "system", "content": "You are a helpful AI assistant."},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.7,
        "max_tokens": 500
    }
    
    try:
        print(f"Sending request to OpenRouter API with prompt: {prompt}")
        response = requests.post(url, headers=headers, json=payload)
        
        if response.status_code != 200:
            print(f"Error: OpenRouter API returned status {response.status_code}")
            print(f"Response: {response.text}")
            return
        
        result = response.json()
        
        # Extract the assistant's message
        if "choices" in result and len(result["choices"]) > 0:
            message = result["choices"][0]["message"]
            content = message.get("content", "")
            
            print("\nDeepSeek LLM Response:")
            print(content)
            
            # Print some metadata about the response
            if "usage" in result:
                usage = result["usage"]
                print("\nToken Usage:")
                print(f"Prompt tokens: {usage.get('prompt_tokens', 'N/A')}")
                print(f"Completion tokens: {usage.get('completion_tokens', 'N/A')}")
                print(f"Total tokens: {usage.get('total_tokens', 'N/A')}")
            
            return content
        else:
            print("Error: No choices in OpenRouter API response")
            print(f"Full response: {json.dumps(result, indent=2)}")
            return None
    except Exception as e:
        print(f"Error: {e}")
        return None

if __name__ == "__main__":
    test_deepseek_via_openrouter()
