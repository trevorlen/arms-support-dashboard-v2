#!/usr/bin/env python3
"""
Authentication System Test Script
Tests all authentication and user management endpoints
"""

import requests
import json

BASE_URL = "http://localhost:7071/api"

def print_test(name):
    print(f"\n{'='*60}")
    print(f"{name}")
    print('='*60)

def test_login():
    print_test("1. Testing Login")
    response = requests.post(
        f"{BASE_URL}/auth/login",
        json={"username": "admin", "password": "admin123"}
    )

    if response.status_code == 200:
        data = response.json()
        print(f"[OK] Login successful!")
        print(f"  User: {data['user']['username']} ({data['user']['role']})")
        print(f"  Token: {data['token'][:30]}...")
        return data['token']
    else:
        print(f"[FAIL] Login failed: {response.status_code}")
        print(f"  Error: {response.text}")
        return None

def test_me(token):
    print_test("2. Testing Get Current User")
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/auth/me", headers=headers)

    if response.status_code == 200:
        data = response.json()
        print(f"✓ Get current user successful!")
        print(f"  User: {data['user']['full_name']} ({data['user']['role']})")
        return True
    else:
        print(f"✗ Get current user failed: {response.status_code}")
        print(f"  Error: {response.text}")
        return False

def test_list_users(token):
    print_test("3. Testing List Users (Admin Only)")
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/users", headers=headers)

    if response.status_code == 200:
        data = response.json()
        print(f"✓ List users successful!")
        print(f"  Found {len(data['users'])} user(s):")
        for user in data['users']:
            print(f"    - {user['username']} ({user['role']}) - {user['full_name']}")
        return True
    else:
        print(f"✗ List users failed: {response.status_code}")
        print(f"  Error: {response.text}")
        return False

def test_create_user(token):
    print_test("4. Testing Create User (Admin Only)")
    headers = {"Authorization": f"Bearer {token}"}
    new_user = {
        "username": "testuser",
        "password": "testpass123",
        "full_name": "Test User",
        "role": "Viewer"
    }
    response = requests.post(
        f"{BASE_URL}/users",
        json=new_user,
        headers=headers
    )

    if response.status_code == 201:
        data = response.json()
        print(f"✓ Create user successful!")
        print(f"  Created: {data['user']['username']} ({data['user']['role']})")
        return data['user']['id']
    else:
        print(f"✗ Create user failed: {response.status_code}")
        print(f"  Error: {response.text}")
        return None

def test_update_user(token, user_id):
    print_test("5. Testing Update User (Admin Only)")
    headers = {"Authorization": f"Bearer {token}"}
    updates = {
        "full_name": "Test User Updated",
        "role": "Manager"
    }
    response = requests.put(
        f"{BASE_URL}/users/{user_id}",
        json=updates,
        headers=headers
    )

    if response.status_code == 200:
        data = response.json()
        print(f"✓ Update user successful!")
        print(f"  Updated: {data['user']['full_name']} ({data['user']['role']})")
        return True
    else:
        print(f"✗ Update user failed: {response.status_code}")
        print(f"  Error: {response.text}")
        return False

def test_delete_user(token, user_id):
    print_test("6. Testing Delete User (Admin Only)")
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.delete(
        f"{BASE_URL}/users/{user_id}",
        headers=headers
    )

    if response.status_code == 200:
        data = response.json()
        print(f"✓ Delete user successful!")
        print(f"  Message: {data['message']}")
        return True
    else:
        print(f"✗ Delete user failed: {response.status_code}")
        print(f"  Error: {response.text}")
        return False

def test_logout(token):
    print_test("7. Testing Logout")
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.post(f"{BASE_URL}/auth/logout", headers=headers)

    if response.status_code == 200:
        data = response.json()
        print(f"✓ Logout successful!")
        print(f"  Message: {data['message']}")
        return True
    else:
        print(f"✗ Logout failed: {response.status_code}")
        print(f"  Error: {response.text}")
        return False

def test_invalid_credentials():
    print_test("8. Testing Invalid Credentials")
    response = requests.post(
        f"{BASE_URL}/auth/login",
        json={"username": "admin", "password": "wrongpassword"}
    )

    if response.status_code == 401:
        print(f"✓ Correctly rejected invalid credentials!")
        return True
    else:
        print(f"✗ Expected 401, got: {response.status_code}")
        return False

def main():
    print("\n" + "="*60)
    print("AUTHENTICATION SYSTEM TEST")
    print("="*60)

    # Test 1: Login
    token = test_login()
    if not token:
        print("\n✗ Cannot continue without valid token")
        return

    # Test 2: Get current user
    test_me(token)

    # Test 3: List users
    test_list_users(token)

    # Test 4: Create user
    new_user_id = test_create_user(token)

    if new_user_id:
        # Test 5: Update user
        test_update_user(token, new_user_id)

        # Test 6: Delete user
        test_delete_user(token, new_user_id)

    # Test 7: Logout
    test_logout(token)

    # Test 8: Invalid credentials
    test_invalid_credentials()

    print("\n" + "="*60)
    print("TESTING COMPLETE")
    print("="*60 + "\n")

if __name__ == "__main__":
    main()

