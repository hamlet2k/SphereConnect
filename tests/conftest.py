"""
Test configuration and shared fixtures for SphereConnect testing
"""
import pytest
from unittest.mock import Mock
import sys
import os

# Add app directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'app'))


@pytest.fixture
def mock_api_response():
    """Reusable mock for API responses used across all tests"""
    mock = Mock()
    mock.status_code = 200
    mock.json.return_value = {
        "id": "test-id",
        "message": "Success",
        "system_prompt": "Act as a UEE Commander, coordinating Star Citizen guild missions with formal, strategic responses.",
        "name": "UEE Commander",
        "phonetic": "Uniform Echo Echo Commander"
    }
    return mock


@pytest.fixture
def wingman_skill(mock_api_response):
    """Provide WingmanSkill instance with all API calls mocked"""
    from api.src.wingman_skill_poc import WingmanSkill

    skill = WingmanSkill()
    return skill


@pytest.fixture
def sample_voice_commands():
    """Common test voice commands used across multiple tests"""
    return [
        "Create objective: Collect 500 SCU Gold",
        "Assign task Scout Route to Pilot X",
        "Delivered 100 SCU Gold",
        "Schedule task for 20 minutes now"
    ]


@pytest.fixture
def test_guild_data():
    """Sample guild data for testing"""
    return {
        "id": "guild_1",
        "name": "Test UEE Fleet",
        "commander_id": "commander_1"
    }


@pytest.fixture
def test_user_data():
    """Sample user data for testing"""
    return {
        "id": "user_1",
        "name": "Test Pilot",
        "guild_id": "guild_1"
    }