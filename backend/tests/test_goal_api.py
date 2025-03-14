#!/usr/bin/env python3
"""
Script to test the goal API endpoints and retrieve tasks for goals
"""
import requests
import json
import sys

API_BASE_URL = "http://localhost:8005/api"

def get_all_goals():
    """Retrieve all goals from the API"""
    response = requests.get(f"{API_BASE_URL}/goals")
    if response.status_code == 200:
        return response.json()
    else:
        print(f"Error retrieving goals: {response.status_code}")
        return None

def get_goal_by_id(goal_id):
    """Retrieve a specific goal by ID"""
    response = requests.get(f"{API_BASE_URL}/goals/{goal_id}")
    if response.status_code == 200:
        return response.json()
    else:
        print(f"Error retrieving goal {goal_id}: {response.status_code}")
        return None

def get_tasks_for_goal(goal_id):
    """Retrieve all tasks for a specific goal"""
    response = requests.get(f"{API_BASE_URL}/goals/{goal_id}/tasks")
    if response.status_code == 200:
        return response.json()
    else:
        print(f"Error retrieving tasks for goal {goal_id}: {response.status_code}")
        return None

def get_all_tasks():
    """Retrieve all tasks from the API"""
    response = requests.get(f"{API_BASE_URL}/tasks")
    if response.status_code == 200:
        return response.json()
    else:
        print(f"Error retrieving tasks: {response.status_code}")
        return None

def get_task_by_id(task_id):
    """Retrieve a specific task by ID"""
    response = requests.get(f"{API_BASE_URL}/tasks/{task_id}")
    if response.status_code == 200:
        return response.json()
    else:
        print(f"Error retrieving task {task_id}: {response.status_code}")
        return None

def find_goal_by_name(name):
    """Find a goal by its name"""
    goals = get_all_goals()
    if goals:
        for goal in goals:
            if goal["title"].lower() == name.lower():
                return goal
    return None

def print_json(data):
    """Pretty print JSON data"""
    print(json.dumps(data, indent=2))

def main():
    """Main function to run the script"""
    if len(sys.argv) < 2:
        print("Usage: python test_goal_api.py [command] [args]")
        print("Commands:")
        print("  goals - List all goals")
        print("  goal [id] - Get a specific goal by ID")
        print("  goal_tasks [id] - Get tasks for a specific goal")
        print("  find_goal [name] - Find a goal by name")
        print("  tasks - List all tasks")
        print("  task [id] - Get a specific task by ID")
        print("  starred - List all starred tasks")
        return

    command = sys.argv[1]
    
    if command == "goals":
        goals = get_all_goals()
        if goals:
            print(f"Found {len(goals)} goals:")
            for goal in goals:
                print(f"ID: {goal['id']}, Title: {goal['title']}")
    
    elif command == "goal" and len(sys.argv) > 2:
        goal_id = int(sys.argv[2])
        goal = get_goal_by_id(goal_id)
        if goal:
            print_json(goal)
    
    elif command == "goal_tasks" and len(sys.argv) > 2:
        goal_id = int(sys.argv[2])
        tasks = get_tasks_for_goal(goal_id)
        if tasks:
            print(f"Found {len(tasks)} tasks for goal {goal_id}:")
            for task in tasks:
                print(f"ID: {task['id']}, Title: {task['title']}, Starred: {task['is_starred']}")
    
    elif command == "find_goal" and len(sys.argv) > 2:
        goal_name = sys.argv[2]
        goal = find_goal_by_name(goal_name)
        if goal:
            print(f"Found goal: ID: {goal['id']}, Title: {goal['title']}")
            print_json(goal)
        else:
            print(f"No goal found with name: {goal_name}")
    
    elif command == "tasks":
        tasks = get_all_tasks()
        if tasks:
            print(f"Found {len(tasks)} tasks:")
            for task in tasks:
                print(f"ID: {task['id']}, Title: {task['title']}, Starred: {task['is_starred']}")
    
    elif command == "task" and len(sys.argv) > 2:
        task_id = int(sys.argv[2])
        task = get_task_by_id(task_id)
        if task:
            print_json(task)
    
    elif command == "starred":
        tasks = get_all_tasks()
        if tasks:
            starred_tasks = [task for task in tasks if task.get('is_starred', False)]
            print(f"Found {len(starred_tasks)} starred tasks:")
            for task in starred_tasks:
                print(f"ID: {task['id']}, Title: {task['title']}")
                print(f"  Goal ID: {task.get('goal_id')}, Parent ID: {task.get('parent_id')}")
    
    else:
        print("Invalid command or missing arguments")

if __name__ == "__main__":
    main()
