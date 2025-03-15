"""
Test script for DeepSeek LLM API via OpenRouter
This script tests the DeepSeek-R1-Zero model through OpenRouter's API

Before running:
1. Create an account at https://openrouter.ai/ if you don't have one
2. Get your API key from https://openrouter.ai/keys
3. Add your API key to the backend/.env file
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

# Get API key from environment variables
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
if not OPENROUTER_API_KEY or OPENROUTER_API_KEY == "your_api_key_here":
    print("Error: OPENROUTER_API_KEY environment variable not set or has default value")
    print("\nTo set up the API key:")
    print("1. Create an account at https://openrouter.ai/ if you don't have one")
    print("2. Get your API key from https://openrouter.ai/keys")
    print("3. Update the backend/.env file with your API key:")
    print("\nOPENROUTER_API_KEY=your_actual_api_key_here\n")
    sys.exit(1)

def clean_response(text):
    """Clean up the response text by removing special formatting like \boxed{}"""
    # Remove \boxed{ at the beginning and } at the end if present
    if text.startswith("\\boxed{") and text.endswith("}"):
        text = text[len("\\boxed{"):].rstrip("}")
    
    # Remove any other formatting or escape characters as needed
    text = text.strip()
    
    return text

def test_deepseek_completion():
    """Test DeepSeek completion API via OpenRouter using requests"""
    
    url = "https://openrouter.ai/api/v1/chat/completions"
    
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://ai-todo-app.com",  # Replace with your app URL
        "X-Title": "AI-Todo App",  # Replace with your app name
    }
    
    # Test prompt
    prompt = "You are an AI assistant for a todo app. Generate 3 productivity tips for someone with ADHD."
    
    # Message payload
    payload = {
        "model": "deepseek/deepseek-r1-zero:free",  # DeepSeek R1 Zero model
        "messages": [
            {"role": "system", "content": "You are a helpful AI assistant."},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.7,
        "max_tokens": 800  # Increased from 300 to get a complete response
    }
    
    print(f"Testing DeepSeek R1 Zero completion API...")
    print(f"Prompt: {prompt}")
    print("Waiting for response...")
    
    try:
        response = requests.post(url, headers=headers, json=payload)
        
        if response.status_code != 200:
            print(f"Error: {response.status_code}")
            print(response.text)
            return
        
        result = response.json()
        
        # Pretty print the response
        print("\nResponse:")
        print(json.dumps(result, indent=2))
        
        # Extract and print just the assistant's message
        if "choices" in result and len(result["choices"]) > 0:
            message = result["choices"][0]["message"]
            content = message.get("content", "")
            
            # Check if content is empty but reasoning is available
            if not content and "reasoning" in message:
                content = message["reasoning"]
                print("\nContent was empty, using reasoning field instead:")
            else:
                print("\nAssistant's response:")
            
            # Clean up the response text
            cleaned_content = clean_response(content)
            print(cleaned_content)
        
        # Print usage information
        if "usage" in result:
            print("\nToken usage:")
            print(f"Prompt tokens: {result['usage']['prompt_tokens']}")
            print(f"Completion tokens: {result['usage']['completion_tokens']}")
            print(f"Total tokens: {result['usage']['total_tokens']}")
            
    except Exception as e:
        print(f"Error making request: {e}")

def test_deepseek_with_custom_prompt(prompt):
    """Test DeepSeek with a custom prompt using requests"""
    
    url = "https://openrouter.ai/api/v1/chat/completions"
    
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://ai-todo-app.com",  # Replace with your app URL
        "X-Title": "AI-Todo App",  # Replace with your app name
    }
    
    # Message payload
    payload = {
        "model": "deepseek/deepseek-r1-zero:free",  # DeepSeek R1 Zero model
        "messages": [
            {"role": "system", "content": "You are a helpful AI assistant for a todo app."},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.7,
        "max_tokens": 800  # Increased from 500 to get a complete response
    }
    
    print(f"Testing DeepSeek R1 Zero with custom prompt...")
    print(f"Prompt: {prompt}")
    print("Waiting for response...")
    
    try:
        response = requests.post(url, headers=headers, json=payload)
        
        if response.status_code != 200:
            print(f"Error: {response.status_code}")
            print(response.text)
            return
        
        result = response.json()
        
        # Extract and print just the assistant's message
        if "choices" in result and len(result["choices"]) > 0:
            message = result["choices"][0]["message"]
            content = message.get("content", "")
            
            # Check if content is empty but reasoning is available
            if not content and "reasoning" in message:
                content = message["reasoning"]
                print("\nContent was empty, using reasoning field instead:")
            else:
                print("\nAssistant's response:")
            
            # Clean up the response text
            cleaned_content = clean_response(content)
            print(cleaned_content)
        
        # Print usage information
        if "usage" in result:
            print("\nToken usage:")
            print(f"Prompt tokens: {result['usage']['prompt_tokens']}")
            print(f"Completion tokens: {result['usage']['completion_tokens']}")
            print(f"Total tokens: {result['usage']['total_tokens']}")
            
    except Exception as e:
        print(f"Error making request: {e}")

def main():
    """Main function to run the tests"""
    
    # Check if a custom prompt was provided as a command-line argument
    if len(sys.argv) > 1:
        custom_prompt = " ".join(sys.argv[1:])
        test_deepseek_with_custom_prompt(custom_prompt)
    else:
        # Run the default test
        test_deepseek_completion()

if __name__ == "__main__":
    main()
