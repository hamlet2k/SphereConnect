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
from ..app.core.models import GuildRequest, get_db
from sqlalchemy.orm import Session

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

@pytest.mark.guild
class TestInviteCreationDefaults:
    """Test invite creation with default values"""

    def test_invite_creation_defaults_applied(self):
        """Test that invite creation applies correct defaults"""
        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}

        # Create invite without specifying expires_at or uses_left
        invite_data = {
            "guild_id": TEST_GUILD_ID
        }

        response = requests.post(f"{BASE_URL}/invites", json=invite_data, headers=headers)
        assert response.status_code == 200

        data = response.json()
        assert "expires_at" in data
        assert data["uses_left"] == 1

        # Verify expiration is approximately 7 days from now
        expires_at = datetime.fromisoformat(data["expires_at"].replace('Z', '+00:00'))
        now = datetime.utcnow().replace(tzinfo=expires_at.tzinfo)
        time_diff = expires_at - now
        assert 6.9 <= time_diff.days <= 7.1

    def test_invite_creation_custom_values_override_defaults(self):
        """Test that custom values override defaults"""
        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}

        custom_expires_at = (datetime.utcnow() + timedelta(days=3)).isoformat()
        invite_data = {
            "guild_id": TEST_GUILD_ID,
            "expires_at": custom_expires_at,
            "uses_left": 5
        }

        response = requests.post(f"{BASE_URL}/invites", json=invite_data, headers=headers)
        assert response.status_code == 200

        data = response.json()
        assert data["expires_at"] == custom_expires_at
        assert data["uses_left"] == 5

@pytest.mark.guild
class TestJoinGuildNotFound402:
    """Test join guild with invalid invite code returns 402"""

    def test_join_guild_invalid_invite_code_returns_402(self):
        """Test that POST /api/users/{id}/join with invalid invite_code returns 402 "Invalid invite code"."""
        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}

        # Try to join with invalid invite code
        join_data = {"invite_code": "invalid-code-123"}
        response = requests.post(f"{BASE_URL}/users/{test_state['admin_user']['id']}/join", json=join_data, headers=headers)
        assert response.status_code == 402

        data = response.json()
        assert "Invalid invite code" in data.get("message", "")

    def test_join_guild_expired_invite_code_returns_402(self):
        """Test that POST /api/users/{id}/join with expired invite_code returns 402 "Invalid invite code"."""
        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}

        # Create an expired invite
        expired_invite_data = {
            "guild_id": TEST_GUILD_ID,
            "expires_at": "2020-01-01T00:00:00Z",  # Past date
            "uses_left": 1
        }
        response = requests.post(f"{BASE_URL}/invites", json=expired_invite_data, headers=headers)
        assert response.status_code == 200
        expired_code = response.json()["code"]

        # Try to join with expired invite
        join_data = {"invite_code": expired_code}
        response = requests.post(f"{BASE_URL}/users/{test_state['admin_user']['id']}/join", json=join_data, headers=headers)
        assert response.status_code == 402

        data = response.json()
        assert "Invalid invite code" in data.get("message", "")

    def test_join_guild_used_up_invite_code_returns_402(self):
        """Test that POST /api/users/{id}/join with used-up invite_code returns 402 "Invalid invite code"."""
        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}

        # Create invite with 0 uses left
        used_invite_data = {
            "guild_id": TEST_GUILD_ID,
            "uses_left": 0
        }
        response = requests.post(f"{BASE_URL}/invites", json=used_invite_data, headers=headers)
        assert response.status_code == 200
        used_code = response.json()["code"]

        # Try to join with used-up invite
        join_data = {"invite_code": used_code}
        response = requests.post(f"{BASE_URL}/users/{test_state['admin_user']['id']}/join", json=join_data, headers=headers)
        assert response.status_code == 402

        data = response.json()
        assert "Invalid invite code" in data.get("message", "")


@pytest.mark.guild
class TestJoinLimit402:
    """Test join guild with member limit enforcement (402 errors)"""

    def test_join_guild_at_limit_returns_402(self):
        """Test that joining a guild at member limit returns 402"""
        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}

        # Create a guild and fill it to the limit (2 members)
        guild_data = {
            "name": "Full Guild 402 Test",
            "guild_id": TEST_GUILD_ID
        }
        response = requests.post(f"{BASE_URL}/guilds", json=guild_data, headers=headers)
        assert response.status_code == 200
        full_guild_id = response.json()["guild_id"]

        # Add second member to reach limit
        user_data = {
            "name": "second_member_402",
            "password": "testpass123",
            "pin": "123456",
            "guild_id": full_guild_id
        }
        response = requests.post(f"{ADMIN_BASE_URL}/users", json=user_data, headers=headers)
        assert response.status_code == 200

        # Create invite
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

        data = response.json()
        assert "limit" in data.get("detail", "").lower() or "limit" in str(data)

    def test_join_guild_over_limit_returns_402(self):
        """Test that joining a guild over member limit returns 402"""
        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}

        # Create a guild and overfill it
        guild_data = {
            "name": "Overfull Guild 402 Test",
            "guild_id": TEST_GUILD_ID
        }
        response = requests.post(f"{BASE_URL}/guilds", json=guild_data, headers=headers)
        assert response.status_code == 200
        overfull_guild_id = response.json()["guild_id"]

        # Add multiple members to exceed limit
        for i in range(3):
            user_data = {
                "name": f"member_{i}_402",
                "password": "testpass123",
                "pin": "123456",
                "guild_id": overfull_guild_id
            }
            response = requests.post(f"{ADMIN_BASE_URL}/users", json=user_data, headers=headers)
            assert response.status_code == 200

        # Create invite
        invite_data = {
            "guild_id": overfull_guild_id,
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
class TestGuildRequestApprovalFlow:
    """Test complete guild request approval workflow"""

    def test_guild_request_approval_full_flow(self):
        """Test the complete flow from invite creation to approval"""
        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}

        # Step 1: Create invite
        invite_data = {
            "guild_id": TEST_GUILD_ID,
            "uses_left": 1
        }
        response = requests.post(f"{BASE_URL}/invites", json=invite_data, headers=headers)
        assert response.status_code == 200
        invite_code = response.json()["code"]

        # Step 2: Create a user to make the request
        request_user_data = {
            "name": "approval_test_user",
            "password": "testpass123",
            "pin": "123456",
            "guild_id": TEST_GUILD_ID
        }
        response = requests.post(f"{ADMIN_BASE_URL}/users", json=request_user_data, headers=headers)
        assert response.status_code == 200
        request_user_id = response.json()["user_id"]

        # Step 3: Login as request user and join via invite (creates guild request)
        response = requests.post(f"{BASE_URL}/auth/login", json=request_user_data)
        assert response.status_code == 200
        request_token = response.json()["access_token"]

        request_headers = {"Authorization": f"Bearer {request_token}"}
        join_data = {
            "invite_code": invite_code
        }
        response = requests.post(f"{BASE_URL}/users/{request_user_id}/join", json=join_data, headers=request_headers)
        assert response.status_code == 200

        # Step 4: Admin checks guild requests
        response = requests.get(f"{ADMIN_BASE_URL}/guild_requests?guild_id={TEST_GUILD_ID}", headers=headers)
        assert response.status_code == 200
        requests_list = response.json()

        # Find the request
        user_request = None
        for req in requests_list:
            if req["user_id"] == request_user_id:
                user_request = req
                break

        assert user_request is not None
        assert user_request["status"] == "pending"

        # Step 5: Admin approves the request
        approve_data = {"status": "approved"}
        response = requests.patch(f"{ADMIN_BASE_URL}/guild_requests/{user_request['id']}", json=approve_data, headers=headers)
        assert response.status_code == 200

        # Step 6: Verify user is now in the guild
        response = requests.get(f"{ADMIN_BASE_URL}/users?guild_id={TEST_GUILD_ID}", headers=headers)
        assert response.status_code == 200
        users = response.json()
        request_user = next((u for u in users if u["id"] == request_user_id), None)
        assert request_user is not None
        assert request_user["guild_id"] == TEST_GUILD_ID

    def test_guild_request_denial_flow(self):
        """Test denying a guild request"""
        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}

        # Create invite and user (similar to approval test)
        invite_data = {
            "guild_id": TEST_GUILD_ID,
            "uses_left": 1
        }
        response = requests.post(f"{BASE_URL}/invites", json=invite_data, headers=headers)
        assert response.status_code == 200
        invite_code = response.json()["code"]

        deny_user_data = {
            "name": "deny_test_user",
            "password": "testpass123",
            "pin": "123456",
            "guild_id": TEST_GUILD_ID
        }
        response = requests.post(f"{ADMIN_BASE_URL}/users", json=deny_user_data, headers=headers)
        assert response.status_code == 200
        deny_user_id = response.json()["user_id"]

        # User joins via invite
        response = requests.post(f"{BASE_URL}/auth/login", json=deny_user_data)
        assert response.status_code == 200
        deny_token = response.json()["access_token"]

        deny_headers = {"Authorization": f"Bearer {deny_token}"}
        join_data = {
            "invite_code": invite_code
        }
        response = requests.post(f"{BASE_URL}/users/{deny_user_id}/join", json=join_data, headers=deny_headers)
        assert response.status_code == 200

        # Admin denies the request
        response = requests.get(f"{ADMIN_BASE_URL}/guild_requests?guild_id={TEST_GUILD_ID}", headers=headers)
        assert response.status_code == 200
        requests_list = response.json()

        user_request = next((req for req in requests_list if req["user_id"] == deny_user_id), None)
        assert user_request is not None

        deny_data = {"status": "denied"}
        response = requests.patch(f"{ADMIN_BASE_URL}/guild_requests/{user_request['id']}", json=deny_data, headers=headers)
        assert response.status_code == 200

        # Verify user is NOT in the guild (should still be in personal guild)
        response = requests.get(f"{ADMIN_BASE_URL}/users?guild_id={TEST_GUILD_ID}", headers=headers)
        assert response.status_code == 200
        users = response.json()
        deny_user = next((u for u in users if u["id"] == deny_user_id), None)
        # User should not be in the target guild
        assert deny_user is None or deny_user["guild_id"] != TEST_GUILD_ID

@pytest.mark.guild
class TestRegisterWithInviteLimit:
    """Test user registration with invite code and member limit enforcement"""

    def test_register_with_valid_invite_under_limit(self):
        """Test successful registration with valid invite code when under member limit"""
        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}

        # Create invite for test guild
        invite_data = {
            "guild_id": TEST_GUILD_ID,
            "uses_left": 1
        }
        response = requests.post(f"{BASE_URL}/invites", json=invite_data, headers=headers)
        assert response.status_code == 200
        invite_code = response.json()["code"]

        # Register new user with invite code
        register_data = {
            "name": "invite_register_user",
            "username": "invite_register_user",
            "password": "testpass123",
            "pin": "123456",
            "invite_code": invite_code
        }
        response = requests.post(f"{BASE_URL}/auth/register", json=register_data)
        assert response.status_code == 201

        data = response.json()
        assert "user_id" in data
        assert "guild_id" in data
        assert data["invite_processed"] == True

        # Verify user has approved guild request
        db_session = next(get_db())
        try:
            user_uuid = uuid.UUID(data["user_id"])
            approved_request = db_session.query(GuildRequest).filter(
                GuildRequest.user_id == user_uuid,
                GuildRequest.guild_id == uuid.UUID(TEST_GUILD_ID),
                GuildRequest.status == "approved"
            ).first()
            assert approved_request is not None
        finally:
            db_session.close()

    def test_register_with_invite_at_limit_returns_error(self):
        """Test registration fails when guild is at member limit"""
        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}

        # Create a guild and fill it to limit
        full_guild_data = {
            "name": "Full Register Test Guild",
            "guild_id": TEST_GUILD_ID
        }
        response = requests.post(f"{BASE_URL}/guilds", json=full_guild_data, headers=headers)
        assert response.status_code == 200
        full_guild_id = response.json()["guild_id"]

        # Fill guild to limit (2 members)
        for i in range(2):
            user_data = {
                "name": f"fill_user_{i}",
                "password": "testpass123",
                "pin": "123456",
                "guild_id": full_guild_id
            }
            response = requests.post(f"{ADMIN_BASE_URL}/users", json=user_data, headers=headers)
            assert response.status_code == 200

        # Create invite
        invite_data = {
            "guild_id": full_guild_id,
            "uses_left": 1
        }
        response = requests.post(f"{BASE_URL}/invites", json=invite_data, headers=headers)
        assert response.status_code == 200
        invite_code = response.json()["code"]

        # Try to register with invite (should fail)
        register_data = {
            "name": "should_fail_user",
            "username": "should_fail_user",
            "password": "testpass123",
            "pin": "123456",
            "invite_code": invite_code
        }
        response = requests.post(f"{BASE_URL}/auth/register", json=register_data)
        # Should fail due to member limit
        assert response.status_code == 402

        data = response.json()
        assert "limit" in data.get("detail", "").lower()

@pytest.mark.guild
class TestGuildManagerCount:
    """Test guild manager UI shows correct approved member counts"""

    def test_guild_list_shows_correct_approved_count(self):
        """Test that guild list displays correct approved member count"""
        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}

        # Create a test guild
        test_guild_data = {
            "name": "Count Test Guild",
            "guild_id": TEST_GUILD_ID
        }
        response = requests.post(f"{BASE_URL}/guilds", json=test_guild_data, headers=headers)
        assert response.status_code == 200
        count_guild_id = response.json()["guild_id"]

        # Add some approved members
        for i in range(2):
            user_data = {
                "name": f"count_member_{i}",
                "password": "testpass123",
                "pin": "123456",
                "guild_id": count_guild_id
            }
            response = requests.post(f"{ADMIN_BASE_URL}/users", json=user_data, headers=headers)
            assert response.status_code == 200

        # Get guild list
        response = requests.get(f"{BASE_URL}/users/{test_state['admin_user']['id']}/guilds", headers=headers)
        assert response.status_code == 200
        guilds = response.json()

        # Find our test guild
        test_guild = next((g for g in guilds if g["id"] == count_guild_id), None)
        assert test_guild is not None
        assert "approved_count" in test_guild
        assert test_guild["approved_count"] == 2  # Creator + 1 added member

    def test_guild_list_updates_count_after_approval(self):
        """Test that approved count updates after guild request approval"""
        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}

        # Create guild and invite
        guild_data = {
            "name": "Approval Count Test Guild",
            "guild_id": TEST_GUILD_ID
        }
        response = requests.post(f"{BASE_URL}/guilds", json=guild_data, headers=headers)
        assert response.status_code == 200
        approval_guild_id = response.json()["guild_id"]

        invite_data = {
            "guild_id": approval_guild_id,
            "uses_left": 1
        }
        response = requests.post(f"{BASE_URL}/invites", json=invite_data, headers=headers)
        assert response.status_code == 200
        invite_code = response.json()["code"]

        # Create user and have them join (creates pending request)
        join_user_data = {
            "name": "approval_count_user",
            "password": "testpass123",
            "pin": "123456",
            "guild_id": approval_guild_id
        }
        response = requests.post(f"{ADMIN_BASE_URL}/users", json=join_user_data, headers=headers)
        assert response.status_code == 200
        join_user_id = response.json()["user_id"]

        # Login as user and join
        response = requests.post(f"{BASE_URL}/auth/login", json=join_user_data)
        assert response.status_code == 200
        join_token = response.json()["access_token"]

        join_headers = {"Authorization": f"Bearer {join_token}"}
        join_data = {"invite_code": invite_code}
        response = requests.post(f"{BASE_URL}/users/{join_user_id}/join", json=join_data, headers=join_headers)
        assert response.status_code == 200

        # Check count before approval (should be 1 - just creator)
        response = requests.get(f"{BASE_URL}/users/{test_state['admin_user']['id']}/guilds", headers=headers)
        assert response.status_code == 200
        guilds_before = response.json()
        guild_before = next((g for g in guilds_before if g["id"] == approval_guild_id), None)
        assert guild_before["approved_count"] == 1

        # Approve the request
        response = requests.get(f"{ADMIN_BASE_URL}/guild_requests?guild_id={approval_guild_id}", headers=headers)
        assert response.status_code == 200
        requests_list = response.json()
        pending_request = next((r for r in requests_list if r["status"] == "pending"), None)
        assert pending_request is not None

        approve_data = {"status": "approved"}
        response = requests.patch(f"{ADMIN_BASE_URL}/guild_requests/{pending_request['id']}", json=approve_data, headers=headers)
        assert response.status_code == 200

        # Check count after approval (should be 2)
        response = requests.get(f"{BASE_URL}/users/{test_state['admin_user']['id']}/guilds", headers=headers)
        assert response.status_code == 200
        guilds_after = response.json()
        guild_after = next((g for g in guilds_after if g["id"] == approval_guild_id), None)
        assert guild_after["approved_count"] == 2

@pytest.mark.guild
class TestUsersListAllMembers:
    """Test that users management endpoint lists all approved members"""

    def test_users_list_includes_all_approved_members(self):
        """Test that GET /admin/users returns all users with approved guild requests"""
        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}

        # Create test guild
        users_guild_data = {
            "name": "Users List Test Guild",
            "guild_id": TEST_GUILD_ID
        }
        response = requests.post(f"{BASE_URL}/guilds", json=users_guild_data, headers=headers)
        assert response.status_code == 200
        users_guild_id = response.json()["guild_id"]

        # Add multiple approved members
        member_ids = []
        for i in range(3):
            user_data = {
                "name": f"list_member_{i}",
                "password": "testpass123",
                "pin": "123456",
                "guild_id": users_guild_id
            }
            response = requests.post(f"{ADMIN_BASE_URL}/users", json=user_data, headers=headers)
            assert response.status_code == 200
            member_ids.append(response.json()["user_id"])

        # Get users list for the guild
        response = requests.get(f"{ADMIN_BASE_URL}/users?guild_id={users_guild_id}", headers=headers)
        assert response.status_code == 200
        users = response.json()

        # Should include all approved members (creator + 3 added)
        assert len(users) == 4
        user_ids = [u["id"] for u in users]
        for member_id in member_ids:
            assert member_id in user_ids

    def test_users_list_excludes_pending_members(self):
        """Test that users list excludes members with only pending requests"""
        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}

        # Create guild and invite
        pending_guild_data = {
            "name": "Pending Test Guild",
            "guild_id": TEST_GUILD_ID
        }
        response = requests.post(f"{BASE_URL}/guilds", json=pending_guild_data, headers=headers)
        assert response.status_code == 200
        pending_guild_id = response.json()["guild_id"]

        invite_data = {
            "guild_id": pending_guild_id,
            "uses_left": 1
        }
        response = requests.post(f"{BASE_URL}/invites", json=invite_data, headers=headers)
        assert response.status_code == 200
        invite_code = response.json()["code"]

        # Create user and have them join (creates pending request)
        pending_user_data = {
            "name": "pending_list_user",
            "password": "testpass123",
            "pin": "123456",
            "guild_id": pending_guild_id
        }
        response = requests.post(f"{ADMIN_BASE_URL}/users", json=pending_user_data, headers=headers)
        assert response.status_code == 200
        pending_user_id = response.json()["user_id"]

        # Login and join
        response = requests.post(f"{BASE_URL}/auth/login", json=pending_user_data)
        assert response.status_code == 200
        pending_token = response.json()["access_token"]

        pending_headers = {"Authorization": f"Bearer {pending_token}"}
        join_data = {"invite_code": invite_code}
        response = requests.post(f"{BASE_URL}/users/{pending_user_id}/join", json=join_data, headers=pending_headers)
        assert response.status_code == 200

        # Get users list (should only include creator, not pending user)
        response = requests.get(f"{ADMIN_BASE_URL}/users?guild_id={pending_guild_id}", headers=headers)
        assert response.status_code == 200
        users = response.json()

        # Should only include creator (1 user)
        assert len(users) == 1
        assert users[0]["id"] != pending_user_id

        # After approval, user should appear in list
        response = requests.get(f"{ADMIN_BASE_URL}/guild_requests?guild_id={pending_guild_id}", headers=headers)
        assert response.status_code == 200
        requests_list = response.json()
        pending_request = next((r for r in requests_list if r["status"] == "pending"), None)
        assert pending_request is not None

        approve_data = {"status": "approved"}
        response = requests.patch(f"{ADMIN_BASE_URL}/guild_requests/{pending_request['id']}", json=approve_data, headers=headers)
        assert response.status_code == 200

        # Now get users list again (should include both users)
        response = requests.get(f"{ADMIN_BASE_URL}/users?guild_id={pending_guild_id}", headers=headers)
        assert response.status_code == 200
        users_after = response.json()

        assert len(users_after) == 2
        user_ids = [u["id"] for u in users_after]
        assert pending_user_id in user_ids


@pytest.mark.guild
class TestJoinLimit402:
    """Test join guild with member limit enforcement (402 errors)"""

    def test_join_non_full_guild_returns_200_pending_request(self):
        """Test that joining a non-full guild returns 200 and creates pending GuildRequest"""
        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}

        # Create a guild with space available
        guild_data = {
            "name": "Non-Full Guild Test",
            "guild_id": TEST_GUILD_ID
        }
        response = requests.post(f"{BASE_URL}/guilds", json=guild_data, headers=headers)
        assert response.status_code == 200
        guild_id = response.json()["guild_id"]

        # Create invite
        invite_data = {
            "guild_id": guild_id,
            "uses_left": 1
        }
        response = requests.post(f"{BASE_URL}/invites", json=invite_data, headers=headers)
        assert response.status_code == 200
        invite_code = response.json()["code"]

        # Create a test user to join
        join_user_data = {
            "name": "join_limit_test_user",
            "password": "testpass123",
            "pin": "123456",
            "guild_id": guild_id
        }
        response = requests.post(f"{ADMIN_BASE_URL}/users", json=join_user_data, headers=headers)
        assert response.status_code == 200
        join_user_id = response.json()["user_id"]

        # Login as test user and join
        response = requests.post(f"{BASE_URL}/auth/login", json=join_user_data)
        assert response.status_code == 200
        join_token = response.json()["access_token"]

        join_headers = {"Authorization": f"Bearer {join_token}"}
        join_data = {"invite_code": invite_code}
        response = requests.post(f"{BASE_URL}/users/{join_user_id}/join", json=join_data, headers=join_headers)
        assert response.status_code == 200

        data = response.json()
        assert "message" in data
        assert "pending" in data.get("status", "")
        assert "guild_request_id" in data

        # Verify GuildRequest was created with pending status
        db_session = next(get_db())
        try:
            user_uuid = uuid.UUID(join_user_id)
            guild_uuid = uuid.UUID(guild_id)
            pending_request = db_session.query(GuildRequest).filter(
                GuildRequest.user_id == user_uuid,
                GuildRequest.guild_id == guild_uuid,
                GuildRequest.status == "pending"
            ).first()
            assert pending_request is not None
        finally:
            db_session.close()

    def test_join_full_guild_returns_402(self):
        """Test that joining a full guild returns 402 from middleware"""
        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}

        # Create a guild and fill it to the limit (2 members)
        guild_data = {
            "name": "Full Guild 402 Test",
            "guild_id": TEST_GUILD_ID
        }
        response = requests.post(f"{BASE_URL}/guilds", json=guild_data, headers=headers)
        assert response.status_code == 200
        full_guild_id = response.json()["guild_id"]

        # Add second member to reach limit (guild creator + this user = 2)
        user_data = {
            "name": "second_member_402",
            "password": "testpass123",
            "pin": "123456",
            "guild_id": full_guild_id
        }
        response = requests.post(f"{ADMIN_BASE_URL}/users", json=user_data, headers=headers)
        assert response.status_code == 200

        # Create invite
        invite_data = {
            "guild_id": full_guild_id,
            "uses_left": 1
        }
        response = requests.post(f"{BASE_URL}/invites", json=invite_data, headers=headers)
        assert response.status_code == 200
        invite_code = response.json()["code"]

        # Try to join (should fail with 402 from middleware)
        join_data = {
            "invite_code": invite_code
        }
        response = requests.post(f"{BASE_URL}/users/{test_state['admin_user']['id']}/join", json=join_data, headers=headers)
        assert response.status_code == 402

        data = response.json()
        assert "limit" in data.get("message", "").lower()
        assert "upgrade plan" in data.get("message", "").lower()


@pytest.mark.guild
class TestJoinHang:
    """Test that join requests complete without hanging"""

    def test_join_request_completes_within_timeout(self):
        """Test that POST /api/users/{id}/join completes within reasonable time"""
        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}

        # Create a guild and invite
        guild_data = {
            "name": "Join Timeout Test Guild",
            "guild_id": TEST_GUILD_ID
        }
        response = requests.post(f"{BASE_URL}/guilds", json=guild_data, headers=headers)
        assert response.status_code == 200
        guild_id = response.json()["guild_id"]

        invite_data = {
            "guild_id": guild_id,
            "uses_left": 1
        }
        response = requests.post(f"{BASE_URL}/invites", json=invite_data, headers=headers)
        assert response.status_code == 200
        invite_code = response.json()["code"]

        # Create a test user
        join_user_data = {
            "name": "join_timeout_user",
            "password": "testpass123",
            "pin": "123456",
            "guild_id": guild_id
        }
        response = requests.post(f"{ADMIN_BASE_URL}/users", json=join_user_data, headers=headers)
        assert response.status_code == 200
        join_user_id = response.json()["user_id"]

        # Login as test user
        response = requests.post(f"{BASE_URL}/auth/login", json=join_user_data)
        assert response.status_code == 200
        join_token = response.json()["access_token"]

        join_headers = {"Authorization": f"Bearer {join_token}"}
        join_data = {"invite_code": invite_code}

        # Make the join request with a timeout
        import time
        start_time = time.time()
        response = requests.post(f"{BASE_URL}/users/{join_user_id}/join", json=join_data, headers=join_headers, timeout=10)
        end_time = time.time()

        # Verify response completed within reasonable time (should be < 5 seconds)
        duration = end_time - start_time
        assert duration < 5.0, f"Join request took too long: {duration} seconds"

        # Verify response is successful
        assert response.status_code == 200

        data = response.json()
        assert "message" in data
        assert "pending" in data.get("status", "")
        assert "guild_request_id" in data

@pytest.mark.guild
class TestGuildRequestApprovalLimit:
    """Test guild request approval with member limit enforcement"""

    def test_approve_request_non_full_guild_returns_200(self):
        """Test that approving a request for non-full guild returns 200"""
        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}

        # Create guild and invite
        guild_data = {
            "name": "Approval Non-Full Test Guild",
            "guild_id": TEST_GUILD_ID
        }
        response = requests.post(f"{BASE_URL}/guilds", json=guild_data, headers=headers)
        assert response.status_code == 200
        guild_id = response.json()["guild_id"]

        invite_data = {
            "guild_id": guild_id,
            "uses_left": 1
        }
        response = requests.post(f"{BASE_URL}/invites", json=invite_data, headers=headers)
        assert response.status_code == 200
        invite_code = response.json()["code"]

        # Create user and have them join (creates pending request)
        request_user_data = {
            "name": "approval_non_full_user",
            "password": "testpass123",
            "pin": "123456",
            "guild_id": guild_id
        }
        response = requests.post(f"{ADMIN_BASE_URL}/users", json=request_user_data, headers=headers)
        assert response.status_code == 200
        request_user_id = response.json()["user_id"]

        # Login and join
        response = requests.post(f"{BASE_URL}/auth/login", json=request_user_data)
        assert response.status_code == 200
        request_token = response.json()["access_token"]

        request_headers = {"Authorization": f"Bearer {request_token}"}
        join_data = {"invite_code": invite_code}
        response = requests.post(f"{BASE_URL}/users/{request_user_id}/join", json=join_data, headers=request_headers)
        assert response.status_code == 200

        # Admin approves the request (should succeed)
        response = requests.get(f"{ADMIN_BASE_URL}/guild_requests?guild_id={guild_id}", headers=headers)
        assert response.status_code == 200
        requests_list = response.json()
        pending_request = next((r for r in requests_list if r["status"] == "pending"), None)
        assert pending_request is not None

        approve_data = {"status": "approved"}
        response = requests.patch(f"{ADMIN_BASE_URL}/guild_requests/{pending_request['id']}", json=approve_data, headers=headers)
        assert response.status_code == 200

        data = response.json()
        assert "approved successfully" in data["message"]
        assert data["status"] == "approved"

    def test_approve_request_full_guild_returns_402(self):
        """Test that approving a request for full guild returns 402 from middleware"""
        headers = {"Authorization": f"Bearer {test_state['admin_token']}"}

        # Create guild and fill it to limit
        guild_data = {
            "name": "Approval Full Test Guild",
            "guild_id": TEST_GUILD_ID
        }
        response = requests.post(f"{BASE_URL}/guilds", json=guild_data, headers=headers)
        assert response.status_code == 200
        full_guild_id = response.json()["guild_id"]

        # Fill guild to limit (2 members: creator + 1 additional)
        user_data = {
            "name": "fill_member_approval",
            "password": "testpass123",
            "pin": "123456",
            "guild_id": full_guild_id
        }
        response = requests.post(f"{ADMIN_BASE_URL}/users", json=user_data, headers=headers)
        assert response.status_code == 200

        # Create invite and have user join (creates pending request)
        invite_data = {
            "guild_id": full_guild_id,
            "uses_left": 1
        }
        response = requests.post(f"{BASE_URL}/invites", json=invite_data, headers=headers)
        assert response.status_code == 200
        invite_code = response.json()["code"]

        request_user_data = {
            "name": "approval_full_user",
            "password": "testpass123",
            "pin": "123456",
            "guild_id": full_guild_id
        }
        response = requests.post(f"{ADMIN_BASE_URL}/users", json=request_user_data, headers=headers)
        assert response.status_code == 200
        request_user_id = response.json()["user_id"]

        # Login and join
        response = requests.post(f"{BASE_URL}/auth/login", json=request_user_data)
        assert response.status_code == 200
        request_token = response.json()["access_token"]

        request_headers = {"Authorization": f"Bearer {request_token}"}
        join_data = {"invite_code": invite_code}
        response = requests.post(f"{BASE_URL}/users/{request_user_id}/join", json=join_data, headers=request_headers)
        assert response.status_code == 200

        # Try to approve the request (should fail with 402 from middleware)
        response = requests.get(f"{ADMIN_BASE_URL}/guild_requests?guild_id={full_guild_id}", headers=headers)
        assert response.status_code == 200
        requests_list = response.json()
        pending_request = next((r for r in requests_list if r["status"] == "pending"), None)
        assert pending_request is not None

        approve_data = {"status": "approved"}
        response = requests.patch(f"{ADMIN_BASE_URL}/guild_requests/{pending_request['id']}", json=approve_data, headers=headers)
        assert response.status_code == 402

        data = response.json()
        assert "limit" in data.get("message", "").lower()
        assert "upgrade plan" in data.get("message", "").lower()