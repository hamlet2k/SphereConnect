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