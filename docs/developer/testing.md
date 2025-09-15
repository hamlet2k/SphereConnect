# Testing Guide

This guide covers the testing strategy and practices for SphereConnect, ensuring code quality and reliability.

## Testing Overview

SphereConnect uses pytest for comprehensive testing with a focus on unit tests, integration tests, and performance validation. Our testing strategy emphasizes:

- **Fast feedback** through automated testing
- **Code coverage** tracking and reporting
- **Mocked dependencies** for reliable testing
- **Documentation integration** with MkDocs

### Current Test Structure

```
tests/
├── conftest.py              # Shared fixtures and configuration
├── test_wingman_skill.py    # Wingman-AI core functionality tests
├── test_standalone.py       # Performance and standalone tests
├── test_auth.py            # Authentication system tests
├── test_data.py            # Database operations tests
└── test_performance.py     # Performance benchmarking tests
```

## Quick Start

### Running Tests

```bash
# Install development dependencies
pip install -r requirements-dev.txt

# Run all tests
pytest

# Run with coverage
pytest --cov=app --cov-report=html

# Run specific test file
pytest tests/test_wingman_skill.py -v

# Run performance tests only
pytest tests/test_performance.py
```

### Test Coverage

View coverage reports at: `htmlcov/index.html` (generated after running tests with `--cov-report=html`)

## Unit Testing

### Test Structure

Tests are organized in the `tests/` directory:

```
tests/
├── __init__.py
├── conftest.py              # Pytest fixtures and configuration
├── test_auth.py            # Authentication tests
├── test_data.py            # Data operations tests
├── test_performance.py     # Performance tests
├── test_standalone.py      # Standalone component tests
├── test_wingman_skill.py   # Wingman-AI integration tests
└── integration/            # Integration tests
    ├── __init__.py
    ├── test_api_endpoints.py
    └── test_database_operations.py
```

### Writing Unit Tests

Use pytest with descriptive test names and docstrings:

```python
import pytest
from unittest.mock import Mock, patch
from app.core.models import Objective, User

class TestObjectiveService:
    """Test cases for objective service operations."""

    def test_create_objective_success(self, test_guild, test_user):
        """Test successful objective creation with valid data."""
        from app.services.objective_service import ObjectiveService

        service = ObjectiveService()
        data = {
            "name": "Test Objective",
            "guild_id": test_guild.id,
            "lead_id": test_user.id
        }

        objective = service.create_objective(data)

        assert objective.name == "Test Objective"
        assert objective.guild_id == test_guild.id
        assert objective.lead_id == test_user.id
        assert objective.status == "active"

    def test_create_objective_invalid_name(self, test_guild):
        """Test objective creation fails with invalid name."""
        from app.services.objective_service import ObjectiveService

        service = ObjectiveService()
        data = {
            "name": "",  # Invalid empty name
            "guild_id": test_guild.id
        }

        with pytest.raises(ValueError, match="Name cannot be empty"):
            service.create_objective(data)

    @patch('app.services.objective_service.logger')
    def test_create_objective_logs_success(self, mock_logger, test_guild):
        """Test that successful creation is logged."""
        from app.services.objective_service import ObjectiveService

        service = ObjectiveService()
        data = {
            "name": "Logged Objective",
            "guild_id": test_guild.id
        }

        service.create_objective(data)

        mock_logger.info.assert_called_with(
            "Objective 'Logged Objective' created successfully"
        )
```

### Test Fixtures

Common fixtures in `conftest.py`:

```python
import pytest
from app.core.models import Guild, User
from app.utils.db_utils import get_db_session

@pytest.fixture
def test_guild():
    """Create a test guild."""
    guild = Guild(name="Test Guild", description="For testing")
    with get_db_session() as session:
        session.add(guild)
        session.commit()
        session.refresh(guild)
        yield guild
        # Cleanup
        session.delete(guild)
        session.commit()

@pytest.fixture
def test_user(test_guild):
    """Create a test user."""
    user = User(
        guild_id=test_guild.id,
        name="testuser",
        password="hashed_password"
    )
    with get_db_session() as session:
        session.add(user)
        session.commit()
        session.refresh(user)
        yield user
        # Cleanup
        session.delete(user)
        session.commit()
```

### Mocking External Dependencies

```python
@patch('app.services.wingman_service.WingmanAPI')
def test_voice_command_processing(self, mock_wingman_api, test_user):
    """Test voice command processing with mocked Wingman-AI."""
    from app.services.voice_service import VoiceService

    # Setup mock
    mock_wingman_api.return_value.process_command.return_value = {
        "success": True,
        "response": "Objective created",
        "command_type": "create_objective"
    }

    service = VoiceService()
    result = service.process_command("Create objective: Test", test_user)

    assert result["success"] is True
    assert "Objective created" in result["response"]
    mock_wingman_api.return_value.process_command.assert_called_once()
```

## Integration Testing

### API Endpoint Testing

Test complete request/response cycles:

```python
import pytest
from fastapi.testclient import TestClient
from app.main import app

@pytest.fixture
def client():
    """Test client for API testing."""
    return TestClient(app)

class TestObjectivesAPI:
    """Integration tests for objectives API."""

    def test_create_objective_api(self, client, test_user_token):
        """Test objective creation via API."""
        headers = {"Authorization": f"Bearer {test_user_token}"}
        data = {
            "name": "API Test Objective",
            "description": {
                "brief": "Test objective creation",
                "metrics": {"target": 100}
            },
            "priority": "high"
        }

        response = client.post("/api/objectives", json=data, headers=headers)

        assert response.status_code == 201
        response_data = response.json()
        assert response_data["name"] == "API Test Objective"
        assert response_data["priority"] == "high"
        assert "id" in response_data

    def test_get_objectives_list(self, client, test_user_token):
        """Test retrieving objectives list."""
        headers = {"Authorization": f"Bearer {test_user_token}"}

        response = client.get("/api/objectives", headers=headers)

        assert response.status_code == 200
        data = response.json()
        assert "objectives" in data
        assert "total" in data
        assert isinstance(data["objectives"], list)

    def test_unauthorized_access(self, client):
        """Test that unauthorized requests are rejected."""
        data = {"name": "Unauthorized Objective"}

        response = client.post("/api/objectives", json=data)

        assert response.status_code == 401
        assert "Not authenticated" in response.json()["detail"]
```

### Database Integration Tests

```python
def test_objective_task_relationship(self, test_guild, test_user):
    """Test objective and task relationship integrity."""
    from app.core.models import Objective, Task

    # Create objective
    objective = Objective(
        guild_id=test_guild.id,
        name="Relationship Test Objective",
        lead_id=test_user.id
    )

    # Create task
    task = Task(
        objective_id=objective.id,
        guild_id=test_guild.id,
        name="Test Task"
    )

    with get_db_session() as session:
        session.add(objective)
        session.add(task)
        session.commit()

        # Verify relationship
        loaded_task = session.query(Task).filter_by(id=task.id).first()
        assert loaded_task.objective.name == "Relationship Test Objective"

        # Test cascade delete
        session.delete(objective)
        session.commit()

        # Task should be deleted
        deleted_task = session.query(Task).filter_by(id=task.id).first()
        assert deleted_task is None
```

## End-to-End Testing

### Wingman-AI Integration Tests

```python
def test_voice_to_objective_creation(self, test_guild, test_user):
    """Test complete voice command to objective creation flow."""
    from app.services.voice_service import VoiceService
    from app.core.models import Objective

    service = VoiceService()

    # Simulate voice command
    command = "UEE Commander, create objective: Voice Test Mission"
    result = service.process_command(command, test_user)

    assert result["success"] is True

    # Verify objective was created in database
    with get_db_session() as session:
        objective = session.query(Objective).filter_by(
            name="Voice Test Mission",
            guild_id=test_guild.id
        ).first()

        assert objective is not None
        assert objective.lead_id == test_user.id
        assert objective.status == "active"
```

### User Workflow Tests

```python
def test_complete_user_workflow(self, client, test_user, test_user_token):
    """Test complete user workflow from objective creation to completion."""
    headers = {"Authorization": f"Bearer {test_user_token}"}

    # 1. Create objective
    objective_data = {
        "name": "Complete Workflow Test",
        "description": {
            "brief": "Test complete workflow",
            "metrics": {"progress": 0, "target": 100}
        }
    }

    response = client.post("/api/objectives", json=objective_data, headers=headers)
    assert response.status_code == 201
    objective_id = response.json()["id"]

    # 2. Create task
    task_data = {
        "objective_id": objective_id,
        "name": "Complete Task",
        "description": "Task to complete"
    }

    response = client.post("/api/tasks", json=task_data, headers=headers)
    assert response.status_code == 201
    task_id = response.json()["id"]

    # 3. Update progress
    progress_data = {"progress": 100, "status": "completed"}
    response = client.patch(f"/api/tasks/{task_id}", json=progress_data, headers=headers)
    assert response.status_code == 200

    # 4. Verify objective progress updated
    response = client.get(f"/api/objectives/{objective_id}", headers=headers)
    assert response.status_code == 200
    objective = response.json()
    assert objective["progress"] == 100.0
```

## Performance Testing

### Response Time Tests

```python
import time

def test_api_response_times(self, client, test_user_token):
    """Test API response times are within acceptable limits."""
    headers = {"Authorization": f"Bearer {test_user_token}"}

    start_time = time.time()
    response = client.get("/api/objectives", headers=headers)
    end_time = time.time()

    response_time = end_time - start_time

    assert response.status_code == 200
    assert response_time < 2.0  # Should respond within 2 seconds
```

### Load Testing

```python
import concurrent.futures
import requests

def test_concurrent_objective_creation(self, test_user_token):
    """Test creating multiple objectives concurrently."""
    def create_objective(i):
        data = {"name": f"Concurrent Objective {i}"}
        headers = {"Authorization": f"Bearer {test_user_token}"}
        response = requests.post(
            "http://localhost:8000/api/objectives",
            json=data,
            headers=headers
        )
        return response.status_code

    # Create 10 objectives concurrently
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
        results = list(executor.map(create_objective, range(10)))

    # All should succeed
    assert all(status == 201 for status in results)
```

### Memory Leak Tests

```python
import psutil
import os

def test_memory_usage_stability(self, client, test_user_token):
    """Test that memory usage doesn't grow indefinitely."""
    headers = {"Authorization": f"Bearer {test_user_token}"}
    process = psutil.Process(os.getpid())

    initial_memory = process.memory_info().rss

    # Perform many operations
    for i in range(100):
        data = {"name": f"Memory Test Objective {i}"}
        client.post("/api/objectives", json=data, headers=headers)

    final_memory = process.memory_info().rss
    memory_growth = final_memory - initial_memory

    # Memory growth should be reasonable (less than 50MB)
    assert memory_growth < 50 * 1024 * 1024
```

## Test Automation

### CI/CD Integration

GitHub Actions workflow for automated testing:

```yaml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
    - uses: actions/checkout@v3
    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.11'

    - name: Install dependencies
      run: |
        pip install -r requirements.txt
        pip install pytest pytest-cov

    - name: Run tests
      run: pytest --cov=app --cov-report=xml

    - name: Upload coverage
      uses: codecov/codecov-action@v3
```

### Test Data Management

```python
# tests/conftest.py
@pytest.fixture(scope="session", autouse=True)
def setup_test_database():
    """Set up test database with schema."""
    # Create test database
    # Run migrations
    # Load test data
    yield
    # Cleanup after all tests

@pytest.fixture(autouse=True)
def clean_database():
    """Clean database between tests."""
    # Clear all tables
    # Reset sequences
    yield
```

## Code Coverage

### Coverage Requirements

- **Overall Coverage**: >80%
- **Critical Paths**: >90% (authentication, API endpoints)
- **New Code**: 100% coverage required

### Coverage Configuration

```ini
# pytest.ini
[tool:pytest]
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
addopts =
    --strict-markers
    --strict-config
    --cov=app
    --cov-report=html:htmlcov
    --cov-report=term-missing
    --cov-fail-under=80

[coverage:run]
source = app
omit =
    */tests/*
    */venv/*
    */__pycache__/*

[coverage:report]
exclude_lines =
    pragma: no cover
    def __repr__
    raise AssertionError
    raise NotImplementedError
```

## Test Maintenance

### Flaky Test Management

```python
@pytest.mark.flaky(reruns=3, reruns_delay=2)
def test_unreliable_external_api(self):
    """Test that may fail due to external service."""
    # Test implementation
    pass
```

### Test Organization

- **Unit Tests**: `tests/unit/`
- **Integration Tests**: `tests/integration/`
- **E2E Tests**: `tests/e2e/`
- **Performance Tests**: `tests/performance/`

### Test Naming Conventions

- `test_[function_name]_[scenario]`
- `test_[class_name]_[method_name]_[condition]`
- Use descriptive names that explain what is being tested

## Debugging Test Failures

### Common Issues

1. **Database State**: Tests may depend on specific database state
2. **Async Operations**: Timing issues with async code
3. **External Dependencies**: Network calls or external services
4. **Race Conditions**: Concurrent test execution

### Debugging Tools

```python
# Add debug prints
def test_debug_failure(self):
    result = some_operation()
    print(f"Debug: result = {result}")  # Temporary debug
    assert result is not None

# Use pytest fixtures for debugging
@pytest.fixture
def debug_session():
    """Fixture for debugging test sessions."""
    # Setup debug logging
    # Set breakpoints
    yield
    # Cleanup
```

This comprehensive testing strategy ensures SphereConnect maintains high quality and reliability across all components and use cases.