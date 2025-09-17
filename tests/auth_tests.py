#!/usr/bin/env python3
"""
Authentication tests for SphereConnect
Tests user registration and login functionality
"""

import pytest
import requests
import json
import uuid
from datetime import datetime, timedelta
import jwt

# Configuration
BASE_URL = "http://localhost:8000/api"
SECRET_KEY = "your-secret-key-change-in-production"
ALGORITHM = "HS256"

# Test data
TEST_GUILD_ID = str(uuid.uuid4())

# Global test state
test_state = {
    "admin_token": None,
    "admin_user": None,
    "test_guild_id": None,
    "created_users": [],
    "created_ranks": [],
    "created_objectives": [],
    "created_tasks": [],
    "created_squads": []
}

@pytest.mark.auth
class TestRegistration:
    """Test user registration functionality"""

    def test_registration_success(self):
        """Test successful user registration"""
        registration_data = {
            "name": "new_test_user",
            "password": "testpass123",
            "pin": "123456"
        }

        response = requests.post(f"{BASE_URL}/auth/register", json=registration_data)
        assert response.status_code == 201

        data = response.json()
        assert "user_id" in data
        assert "guild_id" in data
        assert "rank" in data
        assert data["rank"] == "CO"

        # Store for cleanup
        # test_state["created_users"].append(data["user_id"])

    def test_registration_duplicate_username(self):
        """Test registration fails with duplicate username"""
        registration_data = {
            "name": "new_test_user",  # Same as above
            "password": "differentpass",
            "pin": "654321"
        }

        response = requests.post(f"{BASE_URL}/auth/register", json=registration_data)
        assert response.status_code == 409

    def test_registration_invalid_password(self):
        """Test registration fails with invalid password"""
        registration_data = {
            "name": "invalid_pass_user",
            "password": "123",  # Too short
            "pin": "123456"
        }

        response = requests.post(f"{BASE_URL}/auth/register", json=registration_data)
        assert response.status_code == 422

    def test_registration_invalid_pin(self):
        """Test registration fails with invalid PIN"""
        registration_data = {
            "name": "invalid_pin_user",
            "password": "validpass123",
            "pin": "123"  # Too short
        }

        response = requests.post(f"{BASE_URL}/auth/register", json=registration_data)
        assert response.status_code == 422

    def test_registration_with_invite_code(self):
        """Test registration with valid invite code"""
        # First create an invite
        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}
        invite_data = {
            "guild_id": TEST_GUILD_ID,
            "expires_at": (datetime.utcnow() + timedelta(days=1)).isoformat()
        }

        response = requests.post(f"{BASE_URL}/invites", json=invite_data, headers=headers)
        assert response.status_code == 200
        invite_code = response.json()["code"]

        # Register with invite code
        registration_data = {
            "name": "invited_user",
            "password": "testpass123",
            "pin": "123456",
            "invite_code": invite_code
        }

        response = requests.post(f"{BASE_URL}/auth/register", json=registration_data)
        assert response.status_code == 201

        data = response.json()
        assert data["invite_processed"] == True

@pytest.mark.auth
class TestLogin:
    """Test user login functionality"""

    def test_login_success(self):
        """Test successful login"""
        login_data = {
            "name": "new_test_user",
            "password": "testpass123"
        }

        response = requests.post(f"{BASE_URL}/auth/login", json=login_data)
        assert response.status_code == 200

        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert "current_guild_id" in data
        assert "guild_name" in data
        assert "user" in data

    def test_login_invalid_credentials(self):
        """Test login fails with invalid credentials"""
        login_data = {
            "name": "new_test_user",
            "password": "wrongpassword"
        }

        response = requests.post(f"{BASE_URL}/auth/login", json=login_data)
        assert response.status_code == 401

    def test_login_nonexistent_user(self):
        """Test login fails for non-existent user"""
        login_data = {
            "name": "nonexistent_user",
            "password": "testpass123"
        }

        response = requests.post(f"{BASE_URL}/auth/login", json=login_data)
        assert response.status_code == 401

    def test_login_account_locked(self):
        """Test login fails when account is locked"""
        # This would require setting up a locked account first
        # For now, just test the endpoint exists
        login_data = {
            "name": "new_test_user",
            "password": "testpass123"
        }

        response = requests.post(f"{BASE_URL}/auth/login", json=login_data)
        # Should succeed (not locked) or return 423 if locked
        assert response.status_code in [200, 423]

    def test_refresh_token(self):
        """Test token refresh functionality"""
        # First login to get tokens
        login_data = {
            "name": "new_test_user",
            "password": "testpass123"
        }

        response = requests.post(f"{BASE_URL}/auth/login", json=login_data)
        assert response.status_code == 200
        refresh_token = response.json()["refresh_token"]

        # Use refresh token
        refresh_data = {
            "refresh_token": refresh_token
        }

        response = requests.post(f"{BASE_URL}/auth/refresh", json=refresh_data)
        assert response.status_code == 200

        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert "current_guild_id" in data
        assert "guild_name" in data