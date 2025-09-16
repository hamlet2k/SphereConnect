#!/usr/bin/env python3
"""
Comprehensive test suite for SphereConnect admin CRUD operations
Tests authentication, RBAC, and CRUD operations for all entities
"""

import pytest
import requests
import json
import uuid
from datetime import datetime, timedelta
import jwt

# Configuration
BASE_URL = "http://localhost:8000/api"
ADMIN_BASE_URL = f"{BASE_URL}/admin"
SECRET_KEY = "your-secret-key-change-in-production"
ALGORITHM = "HS256"

# Test data
TEST_GUILD_ID = str(uuid.uuid4())
TEST_USER_DATA = {
    "name": "test_admin",
    "password": "testpass123",
    "pin": "123456",
    "guild_id": TEST_GUILD_ID
}

# Global test state
test_state = {
    "admin_token": None,
    "admin_user": None,
    "test_guild_id": TEST_GUILD_ID,
    "created_users": [],
    "created_ranks": [],
    "created_objectives": [],
    "created_tasks": [],
    "created_squads": []
}

class TestAdminAuthentication:
    """Test admin authentication and RBAC"""

    def test_admin_login_success(self):
        """Test successful admin login"""
        response = requests.post(f"{BASE_URL}/auth/login", json=TEST_USER_DATA)
        assert response.status_code == 200

        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["guild_id"] == TEST_GUILD_ID

        # Store token in global state for subsequent tests
        test_state["admin_token"] = data["access_token"]
        test_state["admin_user"] = data["user"]

    def test_admin_access_denied_without_token(self):
        """Test that admin endpoints require authentication"""
        response = requests.get(f"{ADMIN_BASE_URL}/users?guild_id={TEST_GUILD_ID}")
        assert response.status_code == 401

    def test_admin_access_denied_wrong_guild(self):
        """Test that admin cannot access other guilds"""
        wrong_guild_id = str(uuid.uuid4())
        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}

        response = requests.get(f"{ADMIN_BASE_URL}/users?guild_id={wrong_guild_id}", headers=headers)
        assert response.status_code == 403

    def test_insufficient_permissions(self):
        """Test access denied for insufficient permissions"""
        # Create a regular user (non-admin)
        regular_user_data = {
            "name": "regular_user",
            "password": "testpass123",
            "pin": "123456",
            "guild_id": TEST_GUILD_ID
        }

        # Login as regular user
        response = requests.post(f"{BASE_URL}/auth/login", json=regular_user_data)
        assert response.status_code == 200
        regular_token = response.json()["access_token"]

        headers = {"Authorization": f"Bearer {regular_token}"}

        # Try to access admin endpoint
        response = requests.get(f"{ADMIN_BASE_URL}/users?guild_id={TEST_GUILD_ID}", headers=headers)
        assert response.status_code == 403

class TestUserManagement:
    """Test user CRUD operations"""

    def test_get_users(self):
        """Test retrieving users for a guild"""
        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}

        response = requests.get(f"{ADMIN_BASE_URL}/users?guild_id={TEST_GUILD_ID}", headers=headers)
        assert response.status_code == 200

        data = response.json()
        assert isinstance(data, list)
        # Should contain at least the admin user
        assert len(data) >= 1

    def test_create_user(self):
        """Test creating a new user"""
        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}

        new_user_data = {
            "name": "test_user_2",
            "password": "newpass123",
            "pin": "654321",
            "guild_id": TEST_GUILD_ID
        }

        response = requests.post(f"{ADMIN_BASE_URL}/users", json=new_user_data, headers=headers)
        assert response.status_code == 200

        data = response.json()
        assert "user_id" in data
        assert "message" in data
        test_state["created_users"].append(data["user_id"])

    def test_create_duplicate_user(self):
        """Test creating a user with existing name fails"""
        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}

        duplicate_user_data = {
            "name": "test_user_2",  # Same name as above
            "password": "differentpass",
            "pin": "111111",
            "guild_id": TEST_GUILD_ID
        }

        response = requests.post(f"{ADMIN_BASE_URL}/users", json=duplicate_user_data, headers=headers)
        assert response.status_code == 409

    def test_update_user(self):
        """Test updating a user"""
        if not test_state["created_users"]:
            pytest.skip("No user created to update")

        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}
        user_id = test_state["created_users"][0]

        update_data = {
            "name": "updated_test_user",
            "availability": "online"
        }

        response = requests.put(f"{ADMIN_BASE_URL}/users/{user_id}", json=update_data, headers=headers)
        assert response.status_code == 200

        data = response.json()
        assert "message" in data

    def test_delete_user(self):
        """Test deleting a user"""
        if not test_state["created_users"]:
            pytest.skip("No user created to delete")

        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}
        user_id = test_state["created_users"].pop(0)

        response = requests.delete(f"{ADMIN_BASE_URL}/users/{user_id}", headers=headers)
        assert response.status_code == 200

        data = response.json()
        assert "message" in data

    def test_delete_nonexistent_user(self):
        """Test deleting a non-existent user"""
        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}
        fake_user_id = str(uuid.uuid4())

        response = requests.delete(f"{ADMIN_BASE_URL}/users/{fake_user_id}", headers=headers)
        assert response.status_code == 404

class TestRankManagement:
    """Test rank CRUD operations"""

    def test_get_ranks(self):
        """Test retrieving ranks for a guild"""
        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}

        response = requests.get(f"{ADMIN_BASE_URL}/ranks?guild_id={TEST_GUILD_ID}", headers=headers)
        assert response.status_code == 200

        data = response.json()
        assert isinstance(data, list)

    def test_create_rank(self):
        """Test creating a new rank"""
        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}

        rank_data = {
            "name": "Sergeant",
            "access_levels": ["view_users", "manage_tasks"],
            "guild_id": TEST_GUILD_ID
        }

        response = requests.post(f"{ADMIN_BASE_URL}/ranks", json=rank_data, headers=headers)
        assert response.status_code == 200

        data = response.json()
        assert "rank_id" in data
        test_state["created_ranks"].append(data["rank_id"])

class TestObjectiveManagement:
    """Test objective CRUD operations"""

    def test_get_objectives(self):
        """Test retrieving objectives for a guild"""
        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}

        response = requests.get(f"{ADMIN_BASE_URL}/objectives?guild_id={TEST_GUILD_ID}", headers=headers)
        assert response.status_code == 200

        data = response.json()
        assert isinstance(data, list)

    def test_create_objective(self):
        """Test creating a new objective"""
        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}

        objective_data = {
            "name": "Test Objective",
            "description": {
                "brief": "Test objective description",
                "tactical": "Tactical information",
                "classified": "Classified information",
                "metrics": {"progress": 0}
            },
            "categories": ["Economy"],
            "priority": "High",
            "applicable_rank": "Sergeant",
            "guild_id": TEST_GUILD_ID
        }

        response = requests.post(f"{ADMIN_BASE_URL}/objectives", json=objective_data, headers=headers)
        assert response.status_code == 200

        data = response.json()
        assert "objective_id" in data
        test_state["created_objectives"].append(data["objective_id"])

class TestTaskManagement:
    """Test task CRUD operations"""

    def test_get_tasks(self):
        """Test retrieving tasks for a guild"""
        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}

        response = requests.get(f"{ADMIN_BASE_URL}/tasks?guild_id={TEST_GUILD_ID}", headers=headers)
        assert response.status_code == 200

        data = response.json()
        assert isinstance(data, list)

    def test_create_task(self):
        """Test creating a new task"""
        if not test_state["created_objectives"]:
            pytest.skip("No objective created to assign task to")

        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}
        objective_id = test_state["created_objectives"][0]

        task_data = {
            "name": "Test Task",
            "description": "Test task description",
            "objective_id": objective_id,
            "priority": "Medium",
            "self_assignment": True,
            "max_assignees": 3,
            "guild_id": TEST_GUILD_ID
        }

        response = requests.post(f"{ADMIN_BASE_URL}/tasks", json=task_data, headers=headers)
        assert response.status_code == 200

        data = response.json()
        assert "task_id" in data
        test_state["created_tasks"].append(data["task_id"])

class TestSquadManagement:
    """Test squad CRUD operations"""

    def test_get_squads(self):
        """Test retrieving squads for a guild"""
        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}

        response = requests.get(f"{ADMIN_BASE_URL}/squads?guild_id={TEST_GUILD_ID}", headers=headers)
        assert response.status_code == 200

        data = response.json()
        assert isinstance(data, list)

    def test_create_squad(self):
        """Test creating a new squad"""
        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}

        squad_data = {
            "name": "Alpha Squad",
            "guild_id": TEST_GUILD_ID
        }

        response = requests.post(f"{ADMIN_BASE_URL}/squads", json=squad_data, headers=headers)
        assert response.status_code == 200

        data = response.json()
        assert "squad_id" in data
        test_state["created_squads"].append(data["squad_id"])

class TestAccessLevelManagement:
    """Test access level operations"""

    def test_get_access_levels(self):
        """Test retrieving access levels for a guild"""
        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}

        response = requests.get(f"{ADMIN_BASE_URL}/access-levels?guild_id={TEST_GUILD_ID}", headers=headers)
        assert response.status_code == 200

        data = response.json()
        assert isinstance(data, list)

class TestObjectiveCategoryManagement:
    """Test objective category CRUD operations"""

    def test_get_objective_categories(self):
        """Test retrieving objective categories for a guild"""
        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}

        response = requests.get(f"{ADMIN_BASE_URL}/objective-categories?guild_id={TEST_GUILD_ID}", headers=headers)
        assert response.status_code == 200

        data = response.json()
        assert isinstance(data, list)

    def test_create_objective_category(self):
        """Test creating a new objective category"""
        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}

        category_data = {
            "name": "Exploration",
            "description": "Exploration and discovery objectives",
            "guild_id": TEST_GUILD_ID
        }

        response = requests.post(f"{ADMIN_BASE_URL}/objective-categories", json=category_data, headers=headers)
        assert response.status_code == 200

        data = response.json()
        assert "category_id" in data

class TestErrorHandling:
    """Test error handling and edge cases"""

    def test_invalid_guild_id(self):
        """Test handling of invalid guild ID"""
        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}

        response = requests.get(f"{ADMIN_BASE_URL}/users?guild_id=invalid-uuid", headers=headers)
        assert response.status_code == 400

    def test_expired_token(self):
        """Test handling of expired JWT token"""
        # Create an expired token
        admin_user = test_state.get('admin_user')
        if not admin_user:
            pytest.skip("No admin user available for expired token test")

        expired_payload = {
            "sub": admin_user["id"],
            "guild_id": TEST_GUILD_ID,
            "exp": datetime.utcnow() - timedelta(hours=1)  # Expired 1 hour ago
        }
        expired_token = jwt.encode(expired_payload, SECRET_KEY, algorithm=ALGORITHM)

        headers = {"Authorization": f"Bearer {expired_token}"}

        response = requests.get(f"{ADMIN_BASE_URL}/users?guild_id={TEST_GUILD_ID}", headers=headers)
        assert response.status_code == 401

    def test_malformed_json(self):
        """Test handling of malformed JSON"""
        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}

        response = requests.post(
            f"{ADMIN_BASE_URL}/users",
            data="invalid json",
            headers={**headers, "Content-Type": "application/json"}
        )
        assert response.status_code == 422

class TestRBAC:
    """Test Role-Based Access Control"""

    def test_admin_only_endpoints(self):
        """Test that certain endpoints require admin access"""
        # Create a non-admin user
        non_admin_data = {
            "name": "non_admin_user",
            "password": "testpass123",
            "pin": "123456",
            "guild_id": TEST_GUILD_ID
        }

        # Login as non-admin
        response = requests.post(f"{BASE_URL}/auth/login", json=non_admin_data)
        assert response.status_code == 200
        non_admin_token = response.json()["access_token"]

        headers = {"Authorization": f"Bearer {non_admin_token}"}

        # Try admin-only operations
        response = requests.post(f"{ADMIN_BASE_URL}/users", json=non_admin_data, headers=headers)
        assert response.status_code == 403

        response = requests.post(f"{ADMIN_BASE_URL}/objectives", json={
            "name": "Test Objective",
            "guild_id": TEST_GUILD_ID
        }, headers=headers)
        assert response.status_code == 403

class TestDataValidation:
    """Test input validation"""

    def test_required_fields(self):
        """Test that required fields are validated"""
        headers = {"Authorization": f"Bearer {self.admin_token}"}

        # Missing required fields
        incomplete_data = {
            "guild_id": TEST_GUILD_ID
            # Missing name, password, pin
        }

        response = requests.post(f"{ADMIN_BASE_URL}/users", json=incomplete_data, headers=headers)
        assert response.status_code == 422

    def test_field_constraints(self):
        """Test field constraints and validation"""
        headers = {"Authorization": f"Bearer {self.admin_token}"}

        # Invalid PIN length
        invalid_data = {
            "name": "test_user",
            "password": "password123",
            "pin": "123",  # Too short
            "guild_id": TEST_GUILD_ID
        }

        response = requests.post(f"{ADMIN_BASE_URL}/users", json=invalid_data, headers=headers)
        assert response.status_code == 422

def setup_test_data():
    """Setup test data before running tests"""
    # Create test guild and admin user
    # This would typically be done in conftest.py or a setup fixture
    pass

def teardown_test_data():
    """Clean up test data after tests"""
    # Clean up test data
    pass

if __name__ == "__main__":
    # Run tests
    print("Running SphereConnect Admin CRUD Tests")
    print("=" * 50)

    # Setup
    setup_test_data()

    try:
        # Run test classes
        test_auth = TestAdminAuthentication()
        test_auth.test_admin_login_success()

        test_users = TestUserManagement()
        test_users.admin_token = test_auth.admin_token
        test_users.admin_user = test_auth.admin_user

        test_users.test_get_users()
        test_users.test_create_user()
        test_users.test_create_duplicate_user()
        test_users.test_update_user()
        test_users.test_delete_user()
        test_users.test_delete_nonexistent_user()

        test_ranks = TestRankManagement()
        test_ranks.admin_token = test_auth.admin_token
        test_ranks.test_get_ranks()
        test_ranks.test_create_rank()

        test_objectives = TestObjectiveManagement()
        test_objectives.admin_token = test_auth.admin_token
        test_objectives.test_get_objectives()
        test_objectives.test_create_objective()

        test_tasks = TestTaskManagement()
        test_tasks.admin_token = test_auth.admin_token
        test_tasks.new_objective_id = test_objectives.new_objective_id
        test_tasks.test_get_tasks()
        test_tasks.test_create_task()

        test_squads = TestSquadManagement()
        test_squads.admin_token = test_auth.admin_token
        test_squads.test_get_squads()
        test_squads.test_create_squad()

        test_access_levels = TestAccessLevelManagement()
        test_access_levels.admin_token = test_auth.admin_token
        test_access_levels.test_get_access_levels()

        test_categories = TestObjectiveCategoryManagement()
        test_categories.admin_token = test_auth.admin_token
        test_categories.test_get_objective_categories()
        test_categories.test_create_objective_category()

        test_errors = TestErrorHandling()
        test_errors.admin_token = test_auth.admin_token
        test_errors.admin_user = test_auth.admin_user
        test_errors.test_invalid_guild_id()
        test_errors.test_expired_token()
        test_errors.test_malformed_json()

        test_rbac = TestRBAC()
        test_rbac.admin_token = test_auth.admin_token
        test_rbac.test_admin_only_endpoints()

        test_validation = TestDataValidation()
        test_validation.admin_token = test_auth.admin_token
        test_validation.test_required_fields()
        test_validation.test_field_constraints()

        print("✅ All tests passed!")

    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()

    finally:
        # Cleanup
        teardown_test_data()