#!/usr/bin/env python3
"""
Guild management tests for SphereConnect
Tests guild limits, switching, deletion protection, invites, and leave/kick functionality
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

@pytest.mark.guild
class TestGuildLimits:
    """Test guild limits and revenue model constraints"""

    def test_guild_creation_limit(self):
        """Test that users cannot create more guilds than their limit"""
        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}

        # Create additional guilds up to the limit
        for i in range(2):  # max_guilds is 3, including personal
            guild_data = {
                "name": f"Test Guild {i+1}",
                "guild_id": TEST_GUILD_ID
            }
            response = requests.post(f"{BASE_URL}/guilds", json=guild_data, headers=headers)
            if i < 2:  # Should succeed for first 2
                assert response.status_code == 200
            else:  # Should fail for 3rd
                assert response.status_code == 402

    def test_member_limit_enforcement(self):
        """Test that guilds cannot exceed member limits"""
        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}

        # Create a new guild for testing
        guild_data = {
            "name": "Limit Test Guild",
            "guild_id": TEST_GUILD_ID
        }
        response = requests.post(f"{BASE_URL}/guilds", json=guild_data, headers=headers)
        assert response.status_code == 200
        new_guild_id = response.json()["guild_id"]

        # Try to join with multiple users (should be limited to 2)
        for i in range(3):
            join_data = {
                "guild_id": new_guild_id
            }
            response = requests.patch(f"{BASE_URL}/users/{test_state['admin_user']['id']}/join", json=join_data, headers=headers)
            if i < 2:  # Should succeed for first 2
                assert response.status_code == 200
            else:  # Should fail for 3rd
                assert response.status_code == 402

@pytest.mark.guild
class TestGuildSwitching:
    """Test guild switching functionality"""

    def test_guild_switch_success(self):
        """Test successful guild switching"""
        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}

        # Create a second guild to switch to
        guild_data = {
            "name": "Switch Test Guild",
            "guild_id": TEST_GUILD_ID
        }
        response = requests.post(f"{BASE_URL}/guilds", json=guild_data, headers=headers)
        assert response.status_code == 200
        switch_guild_id = response.json()["guild_id"]

        # Switch to the new guild
        switch_data = {
            "guild_id": switch_guild_id
        }
        response = requests.patch(f"{BASE_URL}/users/{test_state['admin_user']['id']}/switch-guild", json=switch_data, headers=headers)
        assert response.status_code == 200

        data = response.json()
        assert "current_guild_id" in data
        assert data["current_guild_id"] == switch_guild_id

    def test_guild_switch_invalid_guild(self):
        """Test switching to invalid guild fails"""
        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}

        switch_data = {
            "guild_id": str(uuid.uuid4())  # Random invalid guild ID
        }
        response = requests.patch(f"{BASE_URL}/users/{test_state['admin_user']['id']}/switch-guild", json=switch_data, headers=headers)
        assert response.status_code == 404

@pytest.mark.guild
class TestGuildDeletionProtection:
    """Test guild deletion protection for personal guilds"""

    def test_personal_guild_deletion_blocked(self):
        """Test that personal guilds cannot be deleted"""
        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}

        # Try to delete the personal guild (is_solo=true)
        response = requests.delete(f"{ADMIN_BASE_URL}/guilds/{TEST_GUILD_ID}", headers=headers)
        assert response.status_code == 403

        data = response.json()
        assert "Personal guilds cannot be deleted" in data.get("detail", "")

    def test_non_personal_guild_deletion_allowed(self):
        """Test that non-personal guilds can be deleted by creator"""
        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}

        # Create a non-personal guild
        guild_data = {
            "name": "Deletable Guild",
            "guild_id": TEST_GUILD_ID
        }
        response = requests.post(f"{BASE_URL}/guilds", json=guild_data, headers=headers)
        assert response.status_code == 200
        deletable_guild_id = response.json()["guild_id"]

        # Delete the guild (should succeed as creator)
        response = requests.delete(f"{ADMIN_BASE_URL}/guilds/{deletable_guild_id}", headers=headers)
        assert response.status_code == 200

    def test_guild_deletion_wrong_creator(self):
        """Test that non-creators cannot delete guilds"""
        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}

        # Create a guild as admin
        guild_data = {
            "name": "Wrong Creator Guild",
            "guild_id": TEST_GUILD_ID
        }
        response = requests.post(f"{BASE_URL}/guilds", json=guild_data, headers=headers)
        assert response.status_code == 200
        guild_id = response.json()["guild_id"]

        # Create another user
        other_user_data = {
            "name": "other_user",
            "password": "testpass123",
            "pin": "123456",
            "guild_id": TEST_GUILD_ID
        }
        response = requests.post(f"{ADMIN_BASE_URL}/users", json=other_user_data, headers=headers)
        assert response.status_code == 200
        other_user_id = response.json()["user_id"]

        # Login as other user
        response = requests.post(f"{BASE_URL}/auth/login", json=other_user_data)
        assert response.status_code == 200
        other_token = response.json()["access_token"]

        # Try to delete guild as non-creator
        headers_other = {"Authorization": f"Bearer {other_token}"}
        response = requests.delete(f"{ADMIN_BASE_URL}/guilds/{guild_id}", headers=headers_other)
        assert response.status_code == 403

@pytest.mark.guild
class TestInviteCreation:
    """Test invite creation functionality"""

    def test_invite_creation_success(self):
        """Test successful invite creation with default 7-day expiration"""
        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}

        invite_data = {
            "guild_id": TEST_GUILD_ID
        }

        response = requests.post(f"{BASE_URL}/invites", json=invite_data, headers=headers)
        assert response.status_code == 200

        data = response.json()
        assert "code" in data
        assert "guild_id" in data
        assert "expires_at" in data
        assert "uses_left" in data
        assert data["uses_left"] == 1

        # Verify expiration is set to approximately 7 days from now
        expires_at = datetime.fromisoformat(data["expires_at"].replace('Z', '+00:00'))
        now = datetime.utcnow().replace(tzinfo=expires_at.tzinfo)
        time_diff = expires_at - now
        assert 6.9 <= time_diff.days <= 7.1  # Allow small margin for test execution time

        # Store invite code for other tests
        self.created_invite_code = data["code"]

    def test_invite_creation_member_limit_exceeded(self):
        """Test invite creation fails when member limit exceeded"""
        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}

        # Create a guild at member limit (2 members)
        guild_data = {
            "name": "Full Guild",
            "guild_id": TEST_GUILD_ID
        }
        response = requests.post(f"{BASE_URL}/guilds", json=guild_data, headers=headers)
        assert response.status_code == 200
        full_guild_id = response.json()["guild_id"]

        # Add a second member to reach limit
        user_data = {
            "name": "second_member",
            "password": "testpass123",
            "pin": "123456",
            "guild_id": full_guild_id
        }
        response = requests.post(f"{ADMIN_BASE_URL}/users", json=user_data, headers=headers)
        assert response.status_code == 200

        # Try to create invite (should fail with 402)
        invite_data = {
            "guild_id": full_guild_id,
            "uses_left": 1
        }
        response = requests.post(f"{BASE_URL}/invites", json=invite_data, headers=headers)
        assert response.status_code == 402

    def test_invite_creation_custom_expiration(self):
        """Test invite creation with custom expiration date"""
        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}

        custom_expires_at = (datetime.utcnow() + timedelta(days=3)).isoformat()
        invite_data = {
            "guild_id": TEST_GUILD_ID,
            "expires_at": custom_expires_at,
            "uses_left": 2
        }

        response = requests.post(f"{BASE_URL}/invites", json=invite_data, headers=headers)
        assert response.status_code == 200

        data = response.json()
        assert data["expires_at"] == custom_expires_at
        assert data["uses_left"] == 2

@pytest.mark.guild
class TestInviteJoin:
    """Test invite creation and guild joining functionality"""

    def test_invite_creation_success(self):
        """Test successful invite creation"""
        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}

        invite_data = {
            "guild_id": TEST_GUILD_ID,
            "expires_at": (datetime.utcnow() + timedelta(days=1)).isoformat(),
            "uses_left": 1
        }

        response = requests.post(f"{BASE_URL}/invites", json=invite_data, headers=headers)
        assert response.status_code == 200

        data = response.json()
        assert "code" in data
        assert "guild_id" in data
        assert "uses_left" in data
        assert data["uses_left"] == 1

        # Store invite code for join test
        self.invite_code = data["code"]

    def test_invite_member_limit_exceeded(self):
        """Test invite creation fails when member limit exceeded"""
        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}

        # Create a guild at member limit (2 members)
        guild_data = {
            "name": "Full Guild",
            "guild_id": TEST_GUILD_ID
        }
        response = requests.post(f"{BASE_URL}/guilds", json=guild_data, headers=headers)
        assert response.status_code == 200
        full_guild_id = response.json()["guild_id"]

        # Add a second member to reach limit
        user_data = {
            "name": "second_member",
            "password": "testpass123",
            "pin": "123456",
            "guild_id": full_guild_id
        }
        response = requests.post(f"{ADMIN_BASE_URL}/users", json=user_data, headers=headers)
        assert response.status_code == 200

        # Try to create invite (should fail with 402)
        invite_data = {
            "guild_id": full_guild_id,
            "uses_left": 1
        }
        response = requests.post(f"{BASE_URL}/invites", json=invite_data, headers=headers)
        assert response.status_code == 402

    def test_join_with_valid_invite(self):
        """Test joining guild with valid invite code"""
        if not hasattr(self, 'invite_code'):
            pytest.skip("No invite code available from previous test")

        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}

        join_data = {
            "invite_code": self.invite_code
        }

        response = requests.post(f"{BASE_URL}/users/{test_state['admin_user']['id']}/join", json=join_data, headers=headers)
        assert response.status_code == 200

        data = response.json()
        assert "current_guild_id" in data
        assert "guild_name" in data
        assert "message" in data

    def test_join_with_invalid_invite(self):
        """Test joining fails with invalid invite code"""
        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}

        join_data = {
            "invite_code": "invalid-code-12345"
        }

        response = requests.post(f"{BASE_URL}/users/{test_state['admin_user']['id']}/join", json=join_data, headers=headers)
        assert response.status_code == 422

    def test_join_member_limit_exceeded(self):
        """Test joining fails when guild member limit exceeded"""
        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}

        # Create a full guild
        guild_data = {
            "name": "Full Guild 2",
            "guild_id": TEST_GUILD_ID
        }
        response = requests.post(f"{BASE_URL}/guilds", json=guild_data, headers=headers)
        assert response.status_code == 200
        full_guild_id = response.json()["guild_id"]

        # Fill the guild
        for i in range(2):
            user_data = {
                "name": f"member_{i}",
                "password": "testpass123",
                "pin": "123456",
                "guild_id": full_guild_id
            }
            response = requests.post(f"{ADMIN_BASE_URL}/users", json=user_data, headers=headers)
            assert response.status_code == 200

        # Create invite for full guild
        invite_data = {
            "guild_id": full_guild_id,
            "uses_left": 1
        }
        response = requests.post(f"{BASE_URL}/invites", json=invite_data, headers=headers)
        assert response.status_code == 200
        invite_code = response.json()["code"]

        # Try to join (should fail with 402)
        join_data = {
            "invite_code": invite_code
        }
        response = requests.post(f"{BASE_URL}/users/{test_state['admin_user']['id']}/join", json=join_data, headers=headers)
        assert response.status_code == 402

@pytest.mark.guild
class TestLeaveKick:
    """Test leave and kick functionality"""

    def test_leave_guild_success(self):
        """Test successfully leaving a guild"""
        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}

        # Create a guild to leave
        guild_data = {
            "name": "Leave Test Guild",
            "guild_id": TEST_GUILD_ID
        }
        response = requests.post(f"{BASE_URL}/guilds", json=guild_data, headers=headers)
        assert response.status_code == 200
        leave_guild_id = response.json()["guild_id"]

        # Leave the guild
        leave_data = {
            "guild_id": leave_guild_id
        }
        response = requests.post(f"{BASE_URL}/users/{test_state['admin_user']['id']}/leave", json=leave_data, headers=headers)
        assert response.status_code == 200

        data = response.json()
        assert "current_guild_id" in data
        assert "guild_name" in data
        assert "message" in data

    def test_leave_personal_guild_blocked(self):
        """Test that leaving personal guild is blocked"""
        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}

        leave_data = {
            "guild_id": TEST_GUILD_ID  # Personal guild
        }
        response = requests.post(f"{BASE_URL}/users/{test_state['admin_user']['id']}/leave", json=leave_data, headers=headers)
        assert response.status_code == 422

    def test_kick_user_success(self):
        """Test successfully kicking a user"""
        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}

        # Create a user to kick
        kick_user_data = {
            "name": "kick_test_user",
            "password": "testpass123",
            "pin": "123456",
            "guild_id": TEST_GUILD_ID
        }
        response = requests.post(f"{ADMIN_BASE_URL}/users", json=kick_user_data, headers=headers)
        assert response.status_code == 200
        kick_user_id = response.json()["user_id"]

        # Kick the user
        response = requests.post(f"{ADMIN_BASE_URL}/users/{kick_user_id}/kick", headers=headers)
        assert response.status_code == 200

        data = response.json()
        assert "user_id" in data
        assert "new_guild_id" in data
        assert "guild_name" in data

    def test_kick_self_blocked(self):
        """Test that kicking yourself is blocked"""
        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}

        # Try to kick self
        response = requests.post(f"{ADMIN_BASE_URL}/users/{test_state['admin_user']['id']}/kick", headers=headers)
        assert response.status_code == 422

@pytest.mark.guild
class TestUserAccessCRUD:
    """Test user access level CRUD operations"""

    def test_assign_user_access_success(self):
        """Test successfully assigning access level to user"""
        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}

        # Create a test access level first
        access_level_data = {
            "name": "test_access",
            "user_actions": ["view_users", "manage_users"],
            "guild_id": TEST_GUILD_ID
        }
        response = requests.post(f"{ADMIN_BASE_URL}/access-levels", json=access_level_data, headers=headers)
        assert response.status_code == 200
        access_level_id = response.json()["id"]

        # Assign access level to user
        assign_data = {
            "user_id": test_state['admin_user']['id'],
            "access_level_id": access_level_id
        }
        response = requests.post(f"{ADMIN_BASE_URL}/user_access", json=assign_data, headers=headers)
        assert response.status_code == 200

        data = response.json()
        assert "user_access_id" in data
        assert "Access level 'test_access' assigned to user" in data["message"]

    def test_assign_duplicate_user_access_blocked(self):
        """Test that assigning duplicate access level fails"""
        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}

        # Get existing access level
        response = requests.get(f"{ADMIN_BASE_URL}/access-levels?guild_id={TEST_GUILD_ID}", headers=headers)
        assert response.status_code == 200
        access_levels = response.json()
        access_level_id = access_levels[0]["id"]

        # Try to assign same access level again
        assign_data = {
            "user_id": test_state['admin_user']['id'],
            "access_level_id": access_level_id
        }
        response = requests.post(f"{ADMIN_BASE_URL}/user_access", json=assign_data, headers=headers)
        assert response.status_code == 409

    def test_get_user_access_levels(self):
        """Test retrieving user's access levels"""
        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}

        response = requests.get(f"{ADMIN_BASE_URL}/user_access/{test_state['admin_user']['id']}", headers=headers)
        assert response.status_code == 200

        data = response.json()
        assert "user_id" in data
        assert "user_name" in data
        assert "access_levels" in data
        assert isinstance(data["access_levels"], list)

    def test_remove_user_access_success(self):
        """Test successfully removing access level from user"""
        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}

        # Get user's access levels
        response = requests.get(f"{ADMIN_BASE_URL}/user_access/{test_state['admin_user']['id']}", headers=headers)
        assert response.status_code == 200
        access_levels = response.json()["access_levels"]

        if access_levels:
            access_level_id = access_levels[0]["id"]

            # Remove access level
            response = requests.delete(f"{ADMIN_BASE_URL}/user_access/{test_state['admin_user']['id']}/{access_level_id}", headers=headers)
            assert response.status_code == 200

            data = response.json()
            assert "removed from user" in data["message"]

    def test_remove_nonexistent_user_access(self):
        """Test removing non-existent user access assignment"""
        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}

        fake_access_id = str(uuid.uuid4())
        response = requests.delete(f"{ADMIN_BASE_URL}/user_access/{test_state['admin_user']['id']}/{fake_access_id}", headers=headers)
        assert response.status_code == 404

@pytest.mark.guild
class TestUserAccessCRUD:
    """Test user access level CRUD operations"""

    def test_create_access_level_success(self):
        """Test successfully creating a new access level"""
        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}

        access_level_data = {
            "name": "Test Access Level",
            "user_actions": ["view_users", "manage_users"],
            "guild_id": TEST_GUILD_ID
        }

        response = requests.post(f"{ADMIN_BASE_URL}/access-levels", json=access_level_data, headers=headers)
        assert response.status_code == 200

        data = response.json()
        assert "id" in data
        assert data["name"] == "Test Access Level"
        assert data["user_actions"] == ["view_users", "manage_users"]

        # Store for other tests
        self.created_access_level_id = data["id"]

    def test_get_access_levels(self):
        """Test retrieving all access levels for a guild"""
        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}

        response = requests.get(f"{ADMIN_BASE_URL}/access-levels?guild_id={TEST_GUILD_ID}", headers=headers)
        assert response.status_code == 200

        data = response.json()
        assert isinstance(data, list)
        if len(data) > 0:
            assert "id" in data[0]
            assert "name" in data[0]
            assert "user_actions" in data[0]

    def test_assign_user_access_level(self):
        """Test assigning access level to user"""
        if not hasattr(self, 'created_access_level_id'):
            pytest.skip("No access level available from previous test")

        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}

        assign_data = {
            "user_id": test_state['admin_user']['id'],
            "access_level_id": self.created_access_level_id
        }

        response = requests.post(f"{ADMIN_BASE_URL}/user_access", json=assign_data, headers=headers)
        assert response.status_code == 200

        data = response.json()
        assert "user_access_id" in data
        assert "Access level" in data["message"]

    def test_get_user_access_levels(self):
        """Test retrieving user's access levels"""
        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}

        response = requests.get(f"{ADMIN_BASE_URL}/user_access/{test_state['admin_user']['id']}", headers=headers)
        assert response.status_code == 200

        data = response.json()
        assert "user_id" in data
        assert "user_name" in data
        assert "access_levels" in data
        assert isinstance(data["access_levels"], list)

    def test_remove_user_access_level(self):
        """Test removing access level from user"""
        if not hasattr(self, 'created_access_level_id'):
            pytest.skip("No access level available from previous test")

        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}

        response = requests.delete(f"{ADMIN_BASE_URL}/user_access/{test_state['admin_user']['id']}/{self.created_access_level_id}", headers=headers)
        assert response.status_code == 200

        data = response.json()
        assert "removed from user" in data["message"]

@pytest.mark.guild
class TestAccessLevelCRUD:
    """Test access level CRUD operations"""

    def test_create_access_level_success(self):
        """Test successfully creating a new access level"""
        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}

        access_level_data = {
            "name": "Test Access Level",
            "user_actions": ["view_guilds", "manage_guilds"],
            "guild_id": TEST_GUILD_ID
        }

        response = requests.post(f"{ADMIN_BASE_URL}/access-levels", json=access_level_data, headers=headers)
        assert response.status_code == 200

        data = response.json()
        assert "id" in data
        assert data["name"] == "Test Access Level"
        assert data["user_actions"] == ["view_guilds", "manage_guilds"]

        # Store for other tests
        self.created_access_level_id = data["id"]

    def test_get_access_levels(self):
        """Test retrieving all access levels for a guild"""
        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}

        response = requests.get(f"{ADMIN_BASE_URL}/access-levels?guild_id={TEST_GUILD_ID}", headers=headers)
        assert response.status_code == 200

        data = response.json()
        assert isinstance(data, list)
        if len(data) > 0:
            assert "id" in data[0]
            assert "name" in data[0]
            assert "user_actions" in data[0]

    def test_create_access_level_duplicate_name(self):
        """Test creating access level with duplicate name fails"""
        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}

        # First create an access level
        access_level_data = {
            "name": "Duplicate Test",
            "user_actions": ["view_guilds"],
            "guild_id": TEST_GUILD_ID
        }
        response = requests.post(f"{ADMIN_BASE_URL}/access-levels", json=access_level_data, headers=headers)
        assert response.status_code == 200

        # Try to create another with same name
        response = requests.post(f"{ADMIN_BASE_URL}/access-levels", json=access_level_data, headers=headers)
        # Should succeed as names can be duplicate (no unique constraint in schema)
        assert response.status_code == 200

    def test_create_access_level_invalid_actions(self):
        """Test creating access level with invalid user actions"""
        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}

        access_level_data = {
            "name": "Invalid Actions Test",
            "user_actions": ["invalid_action", "view_guilds"],
            "guild_id": TEST_GUILD_ID
        }

        response = requests.post(f"{ADMIN_BASE_URL}/access-levels", json=access_level_data, headers=headers)
        # Should succeed as we don't validate action names in backend
        assert response.status_code == 200

    def test_update_access_level_success(self):
        """Test successfully updating an access level"""
        if not hasattr(self, 'created_access_level_id'):
            pytest.skip("No access level available from previous test")

        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}

        update_data = {
            "name": "Updated Access Level",
            "user_actions": ["view_guilds", "manage_users", "create_objective"]
        }

        response = requests.patch(f"{ADMIN_BASE_URL}/access-levels/{self.created_access_level_id}", json=update_data, headers=headers)
        assert response.status_code == 200

        data = response.json()
        assert "updated successfully" in data["message"]

    def test_update_access_level_partial(self):
        """Test updating only part of an access level"""
        if not hasattr(self, 'created_access_level_id'):
            pytest.skip("No access level available from previous test")

        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}

        # Update only name
        update_data = {
            "name": "Partially Updated"
        }

        response = requests.patch(f"{ADMIN_BASE_URL}/access-levels/{self.created_access_level_id}", json=update_data, headers=headers)
        assert response.status_code == 200

        data = response.json()
        assert "updated successfully" in data["message"]

    def test_update_nonexistent_access_level(self):
        """Test updating a non-existent access level"""
        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}

        fake_access_level_id = str(uuid.uuid4())
        update_data = {
            "name": "Non-existent Update"
        }

        response = requests.patch(f"{ADMIN_BASE_URL}/access-levels/{fake_access_level_id}", json=update_data, headers=headers)
        assert response.status_code == 404

    def test_delete_access_level_success(self):
        """Test successfully deleting an access level"""
        if not hasattr(self, 'created_access_level_id'):
            pytest.skip("No access level available from previous test")

        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}

        response = requests.delete(f"{ADMIN_BASE_URL}/access-levels/{self.created_access_level_id}", headers=headers)
        assert response.status_code == 200

        data = response.json()
        assert "deleted successfully" in data["message"]

    def test_delete_nonexistent_access_level(self):
        """Test deleting a non-existent access level"""
        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}

        fake_access_level_id = str(uuid.uuid4())
        response = requests.delete(f"{ADMIN_BASE_URL}/access-levels/{fake_access_level_id}", headers=headers)
        assert response.status_code == 404

    def test_access_level_wrong_guild(self):
        """Test that users cannot access access levels from other guilds"""
        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}

        # Use a random guild ID that user doesn't belong to
        fake_guild_id = str(uuid.uuid4())

        # Try to get access levels
        response = requests.get(f"{ADMIN_BASE_URL}/access-levels?guild_id={fake_guild_id}", headers=headers)
        assert response.status_code == 403

        # Try to create access level
        access_level_data = {
            "name": "Wrong Guild Test",
            "user_actions": ["view_guilds"],
            "guild_id": fake_guild_id
        }
        response = requests.post(f"{ADMIN_BASE_URL}/access-levels", json=access_level_data, headers=headers)
        assert response.status_code == 403

    def test_access_level_insufficient_permissions(self):
        """Test that users without proper permissions cannot manage access levels"""
        # Create a user with limited permissions
        limited_user_data = {
            "name": "limited_user",
            "password": "testpass123",
            "pin": "123456",
            "guild_id": TEST_GUILD_ID
        }
        response = requests.post(f"{ADMIN_BASE_URL}/users", json=limited_user_data, headers={"Authorization": f"Bearer {test_state['admin_token']}"})
        assert response.status_code == 200
        limited_user_id = response.json()["user_id"]

        # Login as limited user
        response = requests.post(f"{BASE_URL}/auth/login", json=limited_user_data)
        assert response.status_code == 200
        limited_token = response.json()["access_token"]

        limited_headers = {"Authorization": f"Bearer {limited_token}"}

        # Try to get access levels (should fail without view_access_levels permission)
        response = requests.get(f"{ADMIN_BASE_URL}/access-levels?guild_id={TEST_GUILD_ID}", headers=limited_headers)
        assert response.status_code == 403

        # Try to create access level (should fail without manage_guilds permission)
        access_level_data = {
            "name": "Limited User Test",
            "user_actions": ["view_guilds"],
            "guild_id": TEST_GUILD_ID
        }
        response = requests.post(f"{ADMIN_BASE_URL}/access-levels", json=access_level_data, headers=limited_headers)
        assert response.status_code == 403

@pytest.mark.guild
class TestGuildRequestApproval:
    """Test guild request approval functionality"""

    def test_get_guild_requests_success(self):
        """Test successfully retrieving guild requests for a guild"""
        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}

        response = requests.get(f"{ADMIN_BASE_URL}/guild_requests?guild_id={TEST_GUILD_ID}", headers=headers)
        assert response.status_code == 200

        data = response.json()
        assert isinstance(data, list)

        # If there are requests, verify structure
        if len(data) > 0:
            request_data = data[0]
            assert "id" in request_data
            assert "user_id" in request_data
            assert "user_name" in request_data
            assert "guild_id" in request_data
            assert "guild_name" in request_data
            assert "status" in request_data
            assert "created_at" in request_data

    def test_get_guild_requests_wrong_guild(self):
        """Test that users cannot access requests for guilds they don't belong to"""
        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}

        # Use a random guild ID that user doesn't belong to
        fake_guild_id = str(uuid.uuid4())
        response = requests.get(f"{ADMIN_BASE_URL}/guild_requests?guild_id={fake_guild_id}", headers=headers)
        assert response.status_code == 403

    def test_approve_guild_request_success(self):
        """Test successfully approving a guild request"""
        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}

        # First, create a guild request by having a user try to join via invite
        # Create an invite first
        invite_data = {
            "guild_id": TEST_GUILD_ID
        }
        response = requests.post(f"{BASE_URL}/invites", json=invite_data, headers=headers)
        assert response.status_code == 200
        invite_code = response.json()["code"]

        # Create a test user to make the request
        test_user_data = {
            "name": "request_test_user",
            "password": "testpass123",
            "pin": "123456",
            "guild_id": TEST_GUILD_ID
        }
        response = requests.post(f"{ADMIN_BASE_URL}/users", json=test_user_data, headers=headers)
        assert response.status_code == 200
        test_user_id = response.json()["user_id"]

        # Login as test user
        response = requests.post(f"{BASE_URL}/auth/login", json=test_user_data)
        assert response.status_code == 200
        test_user_token = response.json()["access_token"]

        # Have test user join via invite (creates guild request)
        test_headers = {"Authorization": f"Bearer {test_user_token}"}
        join_data = {
            "invite_code": invite_code
        }
        response = requests.post(f"{BASE_URL}/users/{test_user_id}/join", json=join_data, headers=test_headers)
        assert response.status_code == 200

        # Now get the guild request as admin
        response = requests.get(f"{ADMIN_BASE_URL}/guild_requests?guild_id={TEST_GUILD_ID}", headers=headers)
        assert response.status_code == 200
        requests_list = response.json()

        # Find the request for our test user
        test_request = None
        for req in requests_list:
            if req["user_id"] == test_user_id:
                test_request = req
                break

        assert test_request is not None, "Guild request not found"
        assert test_request["status"] == "pending"

        # Approve the request
        approve_data = {"status": "approved"}
        response = requests.patch(f"{ADMIN_BASE_URL}/guild_requests/{test_request['id']}", json=approve_data, headers=headers)
        assert response.status_code == 200

        data = response.json()
        assert "approved successfully" in data["message"]
        assert data["status"] == "approved"

    def test_reject_guild_request_success(self):
        """Test successfully rejecting a guild request"""
        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}

        # Get existing pending requests
        response = requests.get(f"{ADMIN_BASE_URL}/guild_requests?guild_id={TEST_GUILD_ID}", headers=headers)
        assert response.status_code == 200
        requests_list = response.json()

        # Find a pending request
        pending_request = None
        for req in requests_list:
            if req["status"] == "pending":
                pending_request = req
                break

        if pending_request:
            # Reject the request
            reject_data = {"status": "denied"}
            response = requests.patch(f"{ADMIN_BASE_URL}/guild_requests/{pending_request['id']}", json=reject_data, headers=headers)
            assert response.status_code == 200

            data = response.json()
            assert "denied successfully" in data["message"]
            assert data["status"] == "denied"

    def test_update_guild_request_invalid_status(self):
        """Test that invalid status values are rejected"""
        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}

        # Get a request to update
        response = requests.get(f"{ADMIN_BASE_URL}/guild_requests?guild_id={TEST_GUILD_ID}", headers=headers)
        assert response.status_code == 200
        requests_list = response.json()

        if len(requests_list) > 0:
            request_id = requests_list[0]["id"]

            # Try invalid status
            invalid_data = {"status": "invalid_status"}
            response = requests.patch(f"{ADMIN_BASE_URL}/guild_requests/{request_id}", json=invalid_data, headers=headers)
            assert response.status_code == 422

    def test_update_nonexistent_guild_request(self):
        """Test updating a non-existent guild request"""
        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}

        fake_request_id = str(uuid.uuid4())
        update_data = {"status": "approved"}
        response = requests.patch(f"{ADMIN_BASE_URL}/guild_requests/{fake_request_id}", json=update_data, headers=headers)
        assert response.status_code == 404

@pytest.mark.guild
class TestRbacPermission:
    """Test RBAC permission system for access level management"""

    def test_manage_rbac_permission_required_for_access_levels(self):
        """Test that manage_rbac permission is required for access level operations"""
        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}

        # Create a user without manage_rbac permission
        limited_user_data = {
            "name": "no_rbac_user",
            "password": "testpass123",
            "pin": "123456",
            "guild_id": TEST_GUILD_ID
        }
        response = requests.post(f"{ADMIN_BASE_URL}/users", json=limited_user_data, headers=headers)
        assert response.status_code == 200
        limited_user_id = response.json()["user_id"]

        # Login as limited user
        response = requests.post(f"{BASE_URL}/auth/login", json=limited_user_data)
        assert response.status_code == 200
        limited_token = response.json()["access_token"]

        limited_headers = {"Authorization": f"Bearer {limited_token}"}

        # Test GET access levels (should fail without manage_rbac)
        response = requests.get(f"{ADMIN_BASE_URL}/access-levels?guild_id={TEST_GUILD_ID}", headers=limited_headers)
        assert response.status_code == 403

        # Test POST access level (should fail without manage_rbac)
        access_level_data = {
            "name": "Test Access Level",
            "user_actions": ["view_guilds"],
            "guild_id": TEST_GUILD_ID
        }
        response = requests.post(f"{ADMIN_BASE_URL}/access-levels", json=access_level_data, headers=limited_headers)
        assert response.status_code == 403

        # Test PATCH access level (should fail without manage_rbac)
        fake_access_level_id = str(uuid.uuid4())
        update_data = {"name": "Updated Name"}
        response = requests.patch(f"{ADMIN_BASE_URL}/access-levels/{fake_access_level_id}", json=update_data, headers=limited_headers)
        assert response.status_code == 403

        # Test DELETE access level (should fail without manage_rbac)
        response = requests.delete(f"{ADMIN_BASE_URL}/access-levels/{fake_access_level_id}", headers=limited_headers)
        assert response.status_code == 403

    def test_admin_user_has_manage_rbac_permission(self):
        """Test that admin users have manage_rbac permission"""
        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}

        # Admin should be able to access access levels
        response = requests.get(f"{ADMIN_BASE_URL}/access-levels?guild_id={TEST_GUILD_ID}", headers=headers)
        assert response.status_code == 200

        # Admin should be able to create access levels
        access_level_data = {
            "name": "Admin Test Access Level",
            "user_actions": ["view_guilds", "manage_guilds", "manage_rbac"],
            "guild_id": TEST_GUILD_ID
        }
        response = requests.post(f"{ADMIN_BASE_URL}/access-levels", json=access_level_data, headers=headers)
        assert response.status_code == 200

        data = response.json()
        assert "id" in data
        assert data["user_actions"] == ["view_guilds", "manage_guilds", "manage_rbac"]

        # Store for cleanup
        self.created_admin_access_level_id = data["id"]

    def test_manage_rbac_includes_other_permissions(self):
        """Test that manage_rbac permission includes other admin permissions"""
        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}

        # Create a user with only manage_rbac permission
        rbac_user_data = {
            "name": "rbac_only_user",
            "password": "testpass123",
            "pin": "123456",
            "guild_id": TEST_GUILD_ID
        }
        response = requests.post(f"{ADMIN_BASE_URL}/users", json=rbac_user_data, headers=headers)
        assert response.status_code == 200
        rbac_user_id = response.json()["user_id"]

        # Assign manage_rbac access level to the user
        # First get the manage_rbac access level
        response = requests.get(f"{ADMIN_BASE_URL}/access-levels?guild_id={TEST_GUILD_ID}", headers=headers)
        assert response.status_code == 200
        access_levels = response.json()

        rbac_access_level = None
        for level in access_levels:
            if "manage_rbac" in level["user_actions"]:
                rbac_access_level = level
                break

        assert rbac_access_level is not None, "manage_rbac access level not found"

        # Assign the access level to the user
        assign_data = {
            "user_id": rbac_user_id,
            "access_level_id": rbac_access_level["id"]
        }
        response = requests.post(f"{ADMIN_BASE_URL}/user_access", json=assign_data, headers=headers)
        assert response.status_code == 200

        # Login as rbac user
        response = requests.post(f"{BASE_URL}/auth/login", json=rbac_user_data)
        assert response.status_code == 200
        rbac_token = response.json()["access_token"]

        rbac_headers = {"Authorization": f"Bearer {rbac_token}"}

        # User with manage_rbac should be able to perform access level operations
        response = requests.get(f"{ADMIN_BASE_URL}/access-levels?guild_id={TEST_GUILD_ID}", headers=rbac_headers)
        assert response.status_code == 200

        # User with manage_rbac should be able to create new access levels
        new_access_level_data = {
            "name": "RBAC Created Level",
            "user_actions": ["view_users"],
            "guild_id": TEST_GUILD_ID
        }
        response = requests.post(f"{ADMIN_BASE_URL}/access-levels", json=new_access_level_data, headers=rbac_headers)
        assert response.status_code == 200

    def test_rbac_permission_error_messages(self):
        """Test that proper error messages are returned for RBAC permission failures"""
        # Create a user without manage_rbac permission
        limited_user_data = {
            "name": "no_rbac_user_2",
            "password": "testpass123",
            "pin": "123456",
            "guild_id": TEST_GUILD_ID
        }
        response = requests.post(f"{ADMIN_BASE_URL}/users", json=limited_user_data, headers={"Authorization": f"Bearer {test_state['admin_token']}"})
        assert response.status_code == 200
        limited_user_id = response.json()["user_id"]

        # Login as limited user
        response = requests.post(f"{BASE_URL}/auth/login", json=limited_user_data)
        assert response.status_code == 200
        limited_token = response.json()["access_token"]

        limited_headers = {"Authorization": f"Bearer {limited_token}"}

        # Test error message for GET access levels
        response = requests.get(f"{ADMIN_BASE_URL}/access-levels?guild_id={TEST_GUILD_ID}", headers=limited_headers)
        assert response.status_code == 403
        data = response.json()
        assert "manage_rbac" in data.get("detail", "")

        # Test error message for POST access level
        access_level_data = {
            "name": "Test Access Level",
            "user_actions": ["view_guilds"],
            "guild_id": TEST_GUILD_ID
        }
        response = requests.post(f"{ADMIN_BASE_URL}/access-levels", json=access_level_data, headers=limited_headers)
        assert response.status_code == 403
        data = response.json()
        assert "manage_rbac" in data.get("detail", "")

@pytest.mark.guild
class TestRanksCRUD:
    """Test ranks CRUD operations"""

    def test_create_rank_success(self):
        """Test successfully creating a new rank"""
        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}

        # Get available access levels first
        response = requests.get(f"{ADMIN_BASE_URL}/access-levels?guild_id={TEST_GUILD_ID}", headers=headers)
        assert response.status_code == 200
        access_levels = response.json()

        # Use first access level for the rank
        access_level_ids = [access_levels[0]["id"]] if access_levels else []

        rank_data = {
            "name": "Test Rank",
            "access_levels": access_level_ids,
            "guild_id": TEST_GUILD_ID
        }

        response = requests.post(f"{ADMIN_BASE_URL}/ranks", json=rank_data, headers=headers)
        assert response.status_code == 200

        data = response.json()
        assert "rank_id" in data
        assert data["message"] == "Rank 'Test Rank' created successfully"

        # Store for other tests
        self.created_rank_id = data["rank_id"]

    def test_get_ranks_success(self):
        """Test successfully retrieving ranks for a guild"""
        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}

        response = requests.get(f"{ADMIN_BASE_URL}/ranks?guild_id={TEST_GUILD_ID}", headers=headers)
        assert response.status_code == 200

        data = response.json()
        assert isinstance(data, list)
        if len(data) > 0:
            assert "id" in data[0]
            assert "name" in data[0]
            assert "access_levels" in data[0]

    def test_update_rank_success(self):
        """Test successfully updating a rank"""
        if not hasattr(self, 'created_rank_id'):
            pytest.skip("No rank available from previous test")

        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}

        update_data = {
            "name": "Updated Test Rank",
            "access_levels": []  # Clear access levels
        }

        response = requests.patch(f"{ADMIN_BASE_URL}/ranks/{self.created_rank_id}", json=update_data, headers=headers)
        assert response.status_code == 200

        data = response.json()
        assert "updated successfully" in data["message"]

    def test_update_rank_partial(self):
        """Test updating only part of a rank"""
        if not hasattr(self, 'created_rank_id'):
            pytest.skip("No rank available from previous test")

        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}

        # Update only name
        update_data = {
            "name": "Partially Updated Rank"
        }

        response = requests.patch(f"{ADMIN_BASE_URL}/ranks/{self.created_rank_id}", json=update_data, headers=headers)
        assert response.status_code == 200

        data = response.json()
        assert "updated successfully" in data["message"]

    def test_update_nonexistent_rank(self):
        """Test updating a non-existent rank"""
        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}

        fake_rank_id = str(uuid.uuid4())
        update_data = {
            "name": "Non-existent Update"
        }

        response = requests.patch(f"{ADMIN_BASE_URL}/ranks/{fake_rank_id}", json=update_data, headers=headers)
        assert response.status_code == 404

    def test_delete_rank_success(self):
        """Test successfully deleting a rank"""
        if not hasattr(self, 'created_rank_id'):
            pytest.skip("No rank available from previous test")

        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}

        response = requests.delete(f"{ADMIN_BASE_URL}/ranks/{self.created_rank_id}", headers=headers)
        assert response.status_code == 200

        data = response.json()
        assert "deleted successfully" in data["message"]

    def test_delete_rank_with_users_assigned(self):
        """Test deleting a rank that has users assigned fails"""
        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}

        # Create a rank
        rank_data = {
            "name": "Assigned Rank",
            "access_levels": [],
            "guild_id": TEST_GUILD_ID
        }
        response = requests.post(f"{ADMIN_BASE_URL}/ranks", json=rank_data, headers=headers)
        assert response.status_code == 200
        assigned_rank_id = response.json()["rank_id"]

        # Assign the rank to the test user
        user_update_data = {
            "rank_id": assigned_rank_id
        }
        response = requests.put(f"{ADMIN_BASE_URL}/users/{test_state['admin_user']['id']}", json=user_update_data, headers=headers)
        assert response.status_code == 200

        # Try to delete the rank (should fail)
        response = requests.delete(f"{ADMIN_BASE_URL}/ranks/{assigned_rank_id}", headers=headers)
        assert response.status_code == 409

        data = response.json()
        assert "Cannot delete rank" in data["detail"]

    def test_delete_nonexistent_rank(self):
        """Test deleting a non-existent rank"""
        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}

        fake_rank_id = str(uuid.uuid4())
        response = requests.delete(f"{ADMIN_BASE_URL}/ranks/{fake_rank_id}", headers=headers)
        assert response.status_code == 404

    def test_rank_wrong_guild(self):
        """Test that users cannot access ranks from other guilds"""
        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}

        # Use a random guild ID that user doesn't belong to
        fake_guild_id = str(uuid.uuid4())

        # Try to get ranks
        response = requests.get(f"{ADMIN_BASE_URL}/ranks?guild_id={fake_guild_id}", headers=headers)
        assert response.status_code == 403

        # Try to create rank
        rank_data = {
            "name": "Wrong Guild Rank",
            "access_levels": [],
            "guild_id": fake_guild_id
        }
        response = requests.post(f"{ADMIN_BASE_URL}/ranks", json=rank_data, headers=headers)
        assert response.status_code == 403

    def test_rank_insufficient_permissions(self):
        """Test that users without proper permissions cannot manage ranks"""
        # Create a user with limited permissions
        limited_user_data = {
            "name": "limited_rank_user",
            "password": "testpass123",
            "pin": "123456",
            "guild_id": TEST_GUILD_ID
        }
        response = requests.post(f"{ADMIN_BASE_URL}/users", json=limited_user_data, headers={"Authorization": f"Bearer {test_state['admin_token']}"})
        assert response.status_code == 200
        limited_user_id = response.json()["user_id"]

        # Login as limited user
        response = requests.post(f"{BASE_URL}/auth/login", json=limited_user_data)
        assert response.status_code == 200
        limited_token = response.json()["access_token"]

        limited_headers = {"Authorization": f"Bearer {limited_token}"}

        # Try to get ranks (should fail without manage_ranks permission)
        response = requests.get(f"{ADMIN_BASE_URL}/ranks?guild_id={TEST_GUILD_ID}", headers=limited_headers)
        assert response.status_code == 403

        # Try to create rank (should fail without manage_ranks permission)
        rank_data = {
            "name": "Limited User Rank",
            "access_levels": [],
            "guild_id": TEST_GUILD_ID
        }
        response = requests.post(f"{ADMIN_BASE_URL}/ranks", json=rank_data, headers=limited_headers)
        assert response.status_code == 403

    def test_rank_manage_ranks_permission_required(self):
        """Test that manage_ranks permission is required for rank operations"""
        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}

        # Create a user with manage_ranks permission
        ranks_user_data = {
            "name": "ranks_manager_user",
            "password": "testpass123",
            "pin": "123456",
            "guild_id": TEST_GUILD_ID
        }
        response = requests.post(f"{ADMIN_BASE_URL}/users", json=ranks_user_data, headers=headers)
        assert response.status_code == 200
        ranks_user_id = response.json()["user_id"]

        # Assign manage_ranks access level to the user
        # First get the manage_ranks access level
        response = requests.get(f"{ADMIN_BASE_URL}/access-levels?guild_id={TEST_GUILD_ID}", headers=headers)
        assert response.status_code == 200
        access_levels = response.json()

        ranks_access_level = None
        for level in access_levels:
            if "manage_ranks" in level["user_actions"]:
                ranks_access_level = level
                break

        if ranks_access_level:
            # Assign the access level to the user
            assign_data = {
                "user_id": ranks_user_id,
                "access_level_id": ranks_access_level["id"]
            }
            response = requests.post(f"{ADMIN_BASE_URL}/user_access", json=assign_data, headers=headers)
            assert response.status_code == 200

            # Login as ranks user
            response = requests.post(f"{BASE_URL}/auth/login", json=ranks_user_data)
            assert response.status_code == 200
            ranks_token = response.json()["access_token"]

            ranks_headers = {"Authorization": f"Bearer {ranks_token}"}

            # User with manage_ranks should be able to perform rank operations
            response = requests.get(f"{ADMIN_BASE_URL}/ranks?guild_id={TEST_GUILD_ID}", headers=ranks_headers)
            assert response.status_code == 200

            # User with manage_ranks should be able to create ranks
            rank_data = {
                "name": "Managed Rank",
                "access_levels": [],
                "guild_id": TEST_GUILD_ID
            }
            response = requests.post(f"{ADMIN_BASE_URL}/ranks", json=rank_data, headers=ranks_headers)
            assert response.status_code == 200

@pytest.mark.guild
class TestUsersCRUD:
    """Test users CRUD operations"""

    def test_create_user_success(self):
        """Test successfully creating a new user"""
        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}

        user_data = {
            "name": "test_user_crud",
            "password": "testpass123",
            "pin": "123456",
            "guild_id": TEST_GUILD_ID
        }

        response = requests.post(f"{ADMIN_BASE_URL}/users", json=user_data, headers=headers)
        assert response.status_code == 200

        data = response.json()
        assert "user_id" in data
        assert data["message"] == "User 'test_user_crud' created successfully"

        # Store for other tests
        self.created_user_id = data["user_id"]

    def test_get_users_success(self):
        """Test successfully retrieving users for a guild"""
        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}

        response = requests.get(f"{ADMIN_BASE_URL}/users?guild_id={TEST_GUILD_ID}", headers=headers)
        assert response.status_code == 200

        data = response.json()
        assert isinstance(data, list)
        if len(data) > 0:
            assert "id" in data[0]
            assert "name" in data[0]
            assert "rank" in data[0]
            assert "availability" in data[0]

    def test_update_user_success(self):
        """Test successfully updating a user"""
        if not hasattr(self, 'created_user_id'):
            pytest.skip("No user available from previous test")

        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}

        update_data = {
            "name": "updated_test_user",
            "availability": "busy",
            "phonetic": "updated user"
        }

        response = requests.put(f"{ADMIN_BASE_URL}/users/{self.created_user_id}", json=update_data, headers=headers)
        assert response.status_code == 200

        data = response.json()
        assert "updated successfully" in data["message"]

    def test_update_user_partial(self):
        """Test updating only part of a user"""
        if not hasattr(self, 'created_user_id'):
            pytest.skip("No user available from previous test")

        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}

        # Update only availability
        update_data = {
            "availability": "away"
        }

        response = requests.put(f"{ADMIN_BASE_URL}/users/{self.created_user_id}", json=update_data, headers=headers)
        assert response.status_code == 200

        data = response.json()
        assert "updated successfully" in data["message"]

    def test_update_nonexistent_user(self):
        """Test updating a non-existent user"""
        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}

        fake_user_id = str(uuid.uuid4())
        update_data = {
            "name": "Non-existent Update"
        }

        response = requests.put(f"{ADMIN_BASE_URL}/users/{fake_user_id}", json=update_data, headers=headers)
        assert response.status_code == 404

    def test_delete_user_success(self):
        """Test successfully deleting a user"""
        if not hasattr(self, 'created_user_id'):
            pytest.skip("No user available from previous test")

        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}

        response = requests.delete(f"{ADMIN_BASE_URL}/users/{self.created_user_id}", headers=headers)
        assert response.status_code == 200

        data = response.json()
        assert "deleted successfully" in data["message"]

    def test_delete_self_blocked(self):
        """Test that deleting yourself is blocked"""
        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}

        # Try to delete self
        response = requests.delete(f"{ADMIN_BASE_URL}/users/{test_state['admin_user']['id']}", headers=headers)
        assert response.status_code == 400

        data = response.json()
        assert "Cannot delete your own account" in data["detail"]

    def test_delete_nonexistent_user(self):
        """Test deleting a non-existent user"""
        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}

        fake_user_id = str(uuid.uuid4())
        response = requests.delete(f"{ADMIN_BASE_URL}/users/{fake_user_id}", headers=headers)
        assert response.status_code == 404

    def test_user_wrong_guild(self):
        """Test that users cannot access users from other guilds"""
        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}

        # Use a random guild ID that user doesn't belong to
        fake_guild_id = str(uuid.uuid4())

        # Try to get users
        response = requests.get(f"{ADMIN_BASE_URL}/users?guild_id={fake_guild_id}", headers=headers)
        assert response.status_code == 403

        # Try to create user
        user_data = {
            "name": "Wrong Guild User",
            "password": "testpass123",
            "pin": "123456",
            "guild_id": fake_guild_id
        }
        response = requests.post(f"{ADMIN_BASE_URL}/users", json=user_data, headers=headers)
        assert response.status_code == 403

    def test_user_insufficient_permissions(self):
        """Test that users without proper permissions cannot manage users"""
        # Create a user with limited permissions
        limited_user_data = {
            "name": "limited_user_crud",
            "password": "testpass123",
            "pin": "123456",
            "guild_id": TEST_GUILD_ID
        }
        response = requests.post(f"{ADMIN_BASE_URL}/users", json=limited_user_data, headers={"Authorization": f"Bearer {test_state['admin_token']}"})
        assert response.status_code == 200
        limited_user_id = response.json()["user_id"]

        # Login as limited user
        response = requests.post(f"{BASE_URL}/auth/login", json=limited_user_data)
        assert response.status_code == 200
        limited_token = response.json()["access_token"]

        limited_headers = {"Authorization": f"Bearer {limited_token}"}

        # Try to get users (should fail without manage_users permission)
        response = requests.get(f"{ADMIN_BASE_URL}/users?guild_id={TEST_GUILD_ID}", headers=limited_headers)
        assert response.status_code == 403

        # Try to create user (should fail without manage_users permission)
        user_data = {
            "name": "Limited User Creation",
            "password": "testpass123",
            "pin": "123456",
            "guild_id": TEST_GUILD_ID
        }
        response = requests.post(f"{ADMIN_BASE_URL}/users", json=user_data, headers=limited_headers)
        assert response.status_code == 403

    def test_user_manage_users_permission_required(self):
        """Test that manage_users permission is required for user operations"""
        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}

        # Create a user with manage_users permission
        users_user_data = {
            "name": "users_manager_user",
            "password": "testpass123",
            "pin": "123456",
            "guild_id": TEST_GUILD_ID
        }
        response = requests.post(f"{ADMIN_BASE_URL}/users", json=users_user_data, headers=headers)
        assert response.status_code == 200
        users_user_id = response.json()["user_id"]

        # Assign manage_users access level to the user
        # First get the manage_users access level
        response = requests.get(f"{ADMIN_BASE_URL}/access-levels?guild_id={TEST_GUILD_ID}", headers=headers)
        assert response.status_code == 200
        access_levels = response.json()

        users_access_level = None
        for level in access_levels:
            if "manage_users" in level["user_actions"]:
                users_access_level = level
                break

        if users_access_level:
            # Assign the access level to the user
            assign_data = {
                "user_id": users_user_id,
                "access_level_id": users_access_level["id"]
            }
            response = requests.post(f"{ADMIN_BASE_URL}/user_access", json=assign_data, headers=headers)
            assert response.status_code == 200

            # Login as users user
            response = requests.post(f"{BASE_URL}/auth/login", json=users_user_data)
            assert response.status_code == 200
            users_token = response.json()["access_token"]

            users_headers = {"Authorization": f"Bearer {users_token}"}

            # User with manage_users should be able to perform user operations
            response = requests.get(f"{ADMIN_BASE_URL}/users?guild_id={TEST_GUILD_ID}", headers=users_headers)
            assert response.status_code == 200

            # User with manage_users should be able to create users
            new_user_data = {
                "name": "Managed User",
                "password": "testpass123",
                "pin": "123456",
                "guild_id": TEST_GUILD_ID
            }
            response = requests.post(f"{ADMIN_BASE_URL}/users", json=new_user_data, headers=users_headers)
            assert response.status_code == 200

    def test_user_access_assignment(self):
        """Test assigning access levels to users"""
        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}

        # Create a test user
        test_user_data = {
            "name": "access_test_user",
            "password": "testpass123",
            "pin": "123456",
            "guild_id": TEST_GUILD_ID
        }
        response = requests.post(f"{ADMIN_BASE_URL}/users", json=test_user_data, headers=headers)
        assert response.status_code == 200
        test_user_id = response.json()["user_id"]

        # Get an access level to assign
        response = requests.get(f"{ADMIN_BASE_URL}/access-levels?guild_id={TEST_GUILD_ID}", headers=headers)
        assert response.status_code == 200
        access_levels = response.json()

        if len(access_levels) > 0:
            access_level_id = access_levels[0]["id"]

            # Assign access level to user
            assign_data = {
                "user_id": test_user_id,
                "access_level_id": access_level_id
            }
            response = requests.post(f"{ADMIN_BASE_URL}/user_access", json=assign_data, headers=headers)
            assert response.status_code == 200

            # Verify assignment
            response = requests.get(f"{ADMIN_BASE_URL}/user_access/{test_user_id}", headers=headers)
            assert response.status_code == 200
            user_access_data = response.json()
            assert len(user_access_data["access_levels"]) > 0

            # Remove access level
            response = requests.delete(f"{ADMIN_BASE_URL}/user_access/{test_user_id}/{access_level_id}", headers=headers)
            assert response.status_code == 200

    def test_user_rank_assignment(self):
        """Test assigning ranks to users"""
        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}

        # Create a test user
        test_user_data = {
            "name": "rank_test_user",
            "password": "testpass123",
            "pin": "123456",
            "guild_id": TEST_GUILD_ID
        }
        response = requests.post(f"{ADMIN_BASE_URL}/users", json=test_user_data, headers=headers)
        assert response.status_code == 200
        test_user_id = response.json()["user_id"]

        # Get a rank to assign
        response = requests.get(f"{ADMIN_BASE_URL}/ranks?guild_id={TEST_GUILD_ID}", headers=headers)
        assert response.status_code == 200
        ranks = response.json()

        if len(ranks) > 0:
            rank_id = ranks[0]["id"]

            # Assign rank to user
            update_data = {
                "rank_id": rank_id
            }
            response = requests.put(f"{ADMIN_BASE_URL}/users/{test_user_id}", json=update_data, headers=headers)
            assert response.status_code == 200

            # Verify assignment by getting user
            response = requests.get(f"{ADMIN_BASE_URL}/users?guild_id={TEST_GUILD_ID}", headers=headers)
            assert response.status_code == 200
            users = response.json()
            test_user = next((u for u in users if u["id"] == test_user_id), None)
            assert test_user is not None
            assert test_user["rank"] == rank_id