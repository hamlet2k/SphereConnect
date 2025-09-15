#!/usr/bin/env python3
"""
Test script for authentication system
"""
import requests
import json
import uuid

# Configuration
BASE_URL = "http://localhost:8000/api"

def test_user_registration():
    """Test user registration (would need to be implemented)"""
    print("Note: User registration endpoint not implemented yet")
    print("For testing, manually create a user in the database first")

def test_login():
    """Test user login"""
    print("\n=== Testing User Login ===")

    # Test data - replace with actual user data
    login_data = {
        "name": "testuser",  # Replace with actual username
        "password": "testpass",  # Replace with actual password
        "guild_id": str(uuid.uuid4())  # Replace with actual guild ID
    }

    try:
        response = requests.post(f"{BASE_URL}/auth/login", json=login_data)
        print(f"Status Code: {response.status_code}")

        if response.status_code == 200:
            data = response.json()
            print("Login successful!")
            print(f"Token: {data['access_token'][:50]}...")
            print(f"Expires in: {data['expires_in']} seconds")
            return data['access_token']
        else:
            print(f"Login failed: {response.text}")
            return None

    except Exception as e:
        print(f"Error during login: {e}")
        return None

def test_user_registration():
    """Test user registration"""
    print("\n=== Testing User Registration ===")

    user_data = {
        "name": "testuser2",  # Different user for testing
        "password": "testpass123",
        "pin": "987654",
        "guild_id": str(uuid.uuid4()),  # Replace with actual guild ID
        "phonetic": "test user"
    }

    try:
        response = requests.post(f"{BASE_URL}/auth/register", json=user_data)
        print(f"Status Code: {response.status_code}")

        if response.status_code == 200:
            data = response.json()
            print("User registration successful!")
            print(f"User ID: {data['user_id']}")
            return data['user_id']
        else:
            print(f"User registration failed: {response.text}")
            return None

    except Exception as e:
        print(f"Error during user registration: {e}")
        return None

def test_pin_verification(token, user_id):
    """Test PIN verification"""
    print("\n=== Testing PIN Verification ===")

    headers = {"Authorization": f"Bearer {token}"}

    pin_data = {
        "user_id": user_id,
        "pin": "987654"  # PIN from registration
    }

    try:
        response = requests.post(f"{BASE_URL}/auth/verify-pin", json=pin_data, headers=headers)
        print(f"Status Code: {response.status_code}")

        if response.status_code == 200:
            print("PIN verification successful!")
        else:
            print(f"PIN verification failed: {response.text}")

    except Exception as e:
        print(f"Error during PIN verification: {e}")

def test_mfa_setup(token, user_id):
    """Test MFA setup"""
    print("\n=== Testing MFA Setup ===")

    headers = {"Authorization": f"Bearer {token}"}

    mfa_data = {
        "user_id": user_id
    }

    try:
        response = requests.post(f"{BASE_URL}/auth/mfa/setup", json=mfa_data, headers=headers)
        print(f"Status Code: {response.status_code}")

        if response.status_code == 200:
            data = response.json()
            print("MFA setup successful!")
            print(f"Provisioning URI: {data['provisioning_uri']}")
            return data['secret']
        else:
            print(f"MFA setup failed: {response.text}")
            return None

    except Exception as e:
        print(f"Error during MFA setup: {e}")
        return None

def test_token_refresh(token):
    """Test token refresh"""
    print("\n=== Testing Token Refresh ===")

    refresh_data = {
        "refresh_token": token  # Using access token as refresh for simplicity
    }

    try:
        response = requests.post(f"{BASE_URL}/auth/refresh", json=refresh_data)
        print(f"Status Code: {response.status_code}")

        if response.status_code == 200:
            data = response.json()
            print("Token refresh successful!")
            print(f"New Token: {data['access_token'][:50]}...")
            return data['access_token']
        else:
            print(f"Token refresh failed: {response.text}")
            return None

    except Exception as e:
        print(f"Error during token refresh: {e}")
        return None

def test_protected_endpoint(token):
    """Test accessing a protected endpoint"""
    print("\n=== Testing Protected Endpoint ===")

    headers = {"Authorization": f"Bearer {token}"}

    # Test creating an objective
    objective_data = {
        "name": "Test Objective",
        "description": "Test objective for authentication",
        "guild_id": str(uuid.uuid4())  # Replace with actual guild ID
    }

    try:
        response = requests.post(f"{BASE_URL}/objectives", json=objective_data, headers=headers)
        print(f"Status Code: {response.status_code}")

        if response.status_code == 200:
            print("Protected endpoint access successful!")
            data = response.json()
            print(f"Created objective: {data['id']}")
        else:
            print(f"Protected endpoint access failed: {response.text}")

    except Exception as e:
        print(f"Error accessing protected endpoint: {e}")

def main():
    """Main test function"""
    print("SphereConnect Authentication Test")
    print("=" * 40)

    # Test user registration
    registered_user_id = test_user_registration()

    # Test login
    token = test_login()

    if token and registered_user_id:
        # Test PIN verification
        test_pin_verification(token, registered_user_id)

        # Test MFA setup
        mfa_secret = test_mfa_setup(token, registered_user_id)

        # Test token refresh
        new_token = test_token_refresh(token)
        if new_token:
            token = new_token  # Use refreshed token

        # Test protected endpoint
        test_protected_endpoint(token)
    else:
        print("Cannot proceed with tests - login or registration failed")

if __name__ == "__main__":
    main()