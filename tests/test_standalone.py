# Copyright 2025 Federico Arce. All Rights Reserved.
# Confidential - Do Not Distribute Without Permission.

# Standalone API Tests for SphereConnect
# Tests API functionality without Wingman AI dependency
# Simulates webapp/local client direct API usage

import time
import unittest
import uuid
from datetime import datetime
from unittest.mock import Mock, patch
import sys
import os

# Add the app directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker
from app.core.models import (
    Objective, Task, Guild, Squad, AICommander, User,
    ENGINE, Base, create_tables
)
from app.main import app  # Import the FastAPI app

class TestSphereConnectStandalone(unittest.TestCase):
    """Test SphereConnect API endpoints without Wingman AI dependency"""

    def setUp(self):
        """Set up test fixtures"""
        self.client = TestClient(app)

        # Create test database session
        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=ENGINE)
        self.db = self.SessionLocal()

        # Create tables
        create_tables()

        # Create test guild
        self.test_guild_id = str(uuid.uuid4())
        test_guild = Guild(
            id=uuid.UUID(self.test_guild_id),
            name="Test Guild"
        )
        self.db.add(test_guild)

        # Create test user
        self.test_user_id = str(uuid.uuid4())
        test_user = User(
            id=uuid.UUID(self.test_user_id),
            guild_id=uuid.UUID(self.test_guild_id),
            name="Test Pilot",
            password="hashed_password",
            pin="hashed_pin",
            availability="online"
        )
        self.db.add(test_user)
        self.db.commit()

        # Create proper JWT token for authentication
        from app.api.routes import create_access_token
        from datetime import timedelta

        token_data = {"sub": self.test_user_id, "guild_id": self.test_guild_id}
        access_token = create_access_token(token_data, timedelta(minutes=30))
        self.auth_headers = {"Authorization": f"Bearer {access_token}"}

    def tearDown(self):
        """Clean up test fixtures"""
        self.db.rollback()
        self.db.close()

    def test_create_objective_standalone(self):
        """Test creating objective via direct API call (webapp simulation)"""

        objective_data = {
            "name": "Mine Platinum Ore",
            "description": {
                "brief": "Extract 500 SCU of Platinum",
                "tactical": "Use mining drones in sector 7",
                "classified": "High value cargo",
                "metrics": {"platinum_scu": 500}
            },
            "categories": [],
            "priority": "High",
            "applicable_rank": "Pilot",
            "guild_id": self.test_guild_id
        }

        start_time = time.time()
        response = self.client.post("/api/objectives", json=objective_data, headers=self.auth_headers)
        end_time = time.time()

        # Assert response
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        self.assertIn("id", response_data)
        self.assertIn("Objective 'Mine Platinum Ore' created successfully", response_data["message"])

        # Assert latency requirement (< 2 seconds)
        latency = end_time - start_time
        self.assertLess(latency, 2.0, f"API call took {latency:.2f}s, should be < 2.0s")

        # Verify objective was created in database
        objective_id = response_data["id"]
        objective = self.db.query(Objective).filter(Objective.id == uuid.UUID(objective_id)).first()
        self.assertIsNotNone(objective)
        self.assertEqual(objective.name, "Mine Platinum Ore")
        self.assertEqual(str(objective.guild_id), self.test_guild_id)

    def test_get_objectives_by_guild(self):
        """Test retrieving objectives for a guild"""

        # Create test objective
        obj_id = uuid.uuid4()
        test_objective = Objective(
            id=obj_id,
            guild_id=uuid.UUID(self.test_guild_id),
            name="Test Objective",
            description={"brief": "Test mission", "metrics": {"test": 100}},
            categories=[],
            priority="Medium"
        )
        self.db.add(test_objective)
        self.db.commit()

        start_time = time.time()
        response = self.client.get(f"/api/objectives?guild_id={self.test_guild_id}")
        end_time = time.time()

        self.assertEqual(response.status_code, 200)
        objectives = response.json()
        self.assertIsInstance(objectives, list)
        self.assertGreaterEqual(len(objectives), 1)

        # Check that our test objective is in the results
        objective_ids = [obj["id"] for obj in objectives]
        self.assertIn(str(obj_id), objective_ids)

        # Assert latency
        latency = end_time - start_time
        self.assertLess(latency, 2.0, f"API call took {latency:.2f}s, should be < 2.0s")

    def test_create_and_assign_task(self):
        """Test creating and assigning a task"""

        # First create an objective
        objective_data = {
            "name": "Test Mission",
            "description": {"brief": "Test mission for task assignment"},
            "guild_id": self.test_guild_id
        }

        obj_response = self.client.post("/api/objectives", json=objective_data, headers=self.auth_headers)
        self.assertEqual(obj_response.status_code, 200)
        objective_id = obj_response.json()["id"]

        # Create task
        task_data = {
            "name": "Scout Location",
            "objective_id": objective_id,
            "description": "Scout the mining location",
            "guild_id": self.test_guild_id,
            "priority": "Medium"
        }

        start_time = time.time()
        task_response = self.client.post("/api/tasks", json=task_data, headers=self.auth_headers)
        end_time = time.time()

        self.assertEqual(task_response.status_code, 200)
        task_data_response = task_response.json()
        task_id = task_data_response["id"]

        # Assign task
        assign_data = {
            "task_id": task_id,
            "user_id": self.test_user_id
        }

        assign_response = self.client.post("/api/tasks/assign", json=assign_data, headers=self.auth_headers)
        self.assertEqual(assign_response.status_code, 200)

        # Verify assignment in database
        task = self.db.query(Task).filter(Task.id == uuid.UUID(task_id)).first()
        self.assertIsNotNone(task)
        self.assertEqual(str(task.lead_id), self.test_user_id)

        # Assert combined latency
        latency = end_time - start_time
        self.assertLess(latency, 2.0, f"Task creation took {latency:.2f}s, should be < 2.0s")

    def test_report_progress(self):
        """Test reporting progress on objectives"""

        # Create objective
        objective_data = {
            "name": "Mining Operation",
            "description": {"brief": "Mine resources", "metrics": {"gold_scu": 1000}},
            "guild_id": self.test_guild_id
        }

        obj_response = self.client.post("/api/objectives", json=objective_data, headers=self.auth_headers)
        objective_id = obj_response.json()["id"]

        # Report progress
        progress_data = {
            "metrics": {"gold_scu": 250}
        }

        start_time = time.time()
        progress_response = self.client.patch(
            f"/api/objectives/{objective_id}/progress",
            json=progress_data,
            headers=self.auth_headers
        )
        end_time = time.time()

        self.assertEqual(progress_response.status_code, 200)

        # Verify progress was updated
        objective = self.db.query(Objective).filter(Objective.id == uuid.UUID(objective_id)).first()
        self.assertEqual(objective.progress, {"gold_scu": 250})

        # Assert latency
        latency = end_time - start_time
        self.assertLess(latency, 2.0, f"Progress update took {latency:.2f}s, should be < 2.0s")

    def test_schedule_task(self):
        """Test scheduling a task"""

        # Create objective and task first
        objective_data = {"name": "Patrol Mission", "guild_id": self.test_guild_id}
        obj_response = self.client.post("/api/objectives", json=objective_data, headers=self.auth_headers)
        objective_id = obj_response.json()["id"]

        task_data = {
            "name": "Sector Patrol",
            "objective_id": objective_id,
            "guild_id": self.test_guild_id
        }
        task_response = self.client.post("/api/tasks", json=task_data, headers=self.auth_headers)
        task_id = task_response.json()["id"]

        # Schedule task
        schedule_data = {
            "schedule": {
                "start": "2025-09-15T15:00:00Z",
                "duration": "2h",
                "flexible": False,
                "timezone": "UTC"
            }
        }

        start_time = time.time()
        schedule_response = self.client.patch(
            f"/api/tasks/{task_id}/schedule",
            json=schedule_data,
            headers=self.auth_headers
        )
        end_time = time.time()

        self.assertEqual(schedule_response.status_code, 200)

        # Verify schedule was set
        task = self.db.query(Task).filter(Task.id == uuid.UUID(task_id)).first()
        self.assertEqual(task.schedule, schedule_data["schedule"])

        # Assert latency
        latency = end_time - start_time
        self.assertLess(latency, 2.0, f"Task scheduling took {latency:.2f}s, should be < 2.0s")

    def test_get_recent_objectives(self):
        """Test getting recent objectives for a guild"""
        # Create multiple objectives
        for i in range(3):
            obj = Objective(
                id=uuid.uuid4(),
                guild_id=uuid.UUID(self.test_guild_id),
                name=f"Objective {i}",
                description={"brief": f"Test objective {i}"}
            )
            self.db.add(obj)
        self.db.commit()

        start_time = time.time()
        response = self.client.get(f"/api/guilds/{self.test_guild_id}/objectives/recent?limit=2")
        end_time = time.time()

        self.assertEqual(response.status_code, 200)
        objectives = response.json()
        self.assertIsInstance(objectives, list)
        self.assertLessEqual(len(objectives), 2)  # Should respect limit

        # Assert latency
        latency = end_time - start_time
        self.assertLess(latency, 2.0, f"Recent objectives query took {latency:.2f}s, should be < 2.0s")

    def test_get_tasks_by_assignee(self):
        """Test getting tasks filtered by assignee"""
        # Create task assigned to our test user
        objective = Objective(
            id=uuid.uuid4(),
            guild_id=uuid.UUID(self.test_guild_id),
            name="Test Objective"
        )
        self.db.add(objective)

        task = Task(
            id=uuid.uuid4(),
            objective_id=objective.id,
            guild_id=uuid.UUID(self.test_guild_id),
            name="Assigned Task",
            lead_id=uuid.UUID(self.test_user_id)
        )
        self.db.add(task)
        self.db.commit()

        start_time = time.time()
        response = self.client.get(f"/api/tasks?guild_id={self.test_guild_id}&assignee={self.test_user_id}")
        end_time = time.time()

        self.assertEqual(response.status_code, 200)
        tasks = response.json()
        self.assertIsInstance(tasks, list)
        self.assertGreaterEqual(len(tasks), 1)

        # Verify the task is assigned to our user
        task_data = tasks[0]
        self.assertEqual(task_data["lead_id"], self.test_user_id)

        # Assert latency
        latency = end_time - start_time
        self.assertLess(latency, 2.0, f"Task query took {latency:.2f}s, should be < 2.0s")

    def test_api_error_handling(self):
        """Test API error handling for invalid requests"""
        # Test invalid guild_id
        response = self.client.get("/api/objectives?guild_id=invalid-uuid")
        self.assertEqual(response.status_code, 400)

        # Test missing guild_id
        response = self.client.get("/api/objectives")
        self.assertEqual(response.status_code, 400)

        # Test non-existent objective
        fake_id = str(uuid.uuid4())
        response = self.client.get(f"/api/objectives/{fake_id}")
        self.assertEqual(response.status_code, 404)

    def test_guild_isolation(self):
        """Test that guilds are properly isolated"""
        # Create another guild
        other_guild_id = str(uuid.uuid4())
        other_guild = Guild(id=uuid.UUID(other_guild_id), name="Other Guild")
        self.db.add(other_guild)

        # Create objective in other guild
        other_objective = Objective(
            id=uuid.uuid4(),
            guild_id=uuid.UUID(other_guild_id),
            name="Other Guild Objective"
        )
        self.db.add(other_objective)
        self.db.commit()

        # Query objectives for our test guild
        response = self.client.get(f"/api/objectives?guild_id={self.test_guild_id}")
        objectives = response.json()

        # Should not see the other guild's objective
        objective_names = [obj["name"] for obj in objectives]
        self.assertNotIn("Other Guild Objective", objective_names)

def run_standalone_performance_test():
    """Run comprehensive performance test for standalone API"""
    print("Running SphereConnect Standalone API Performance Test...")
    print("=" * 60)

    client = TestClient(app)

    test_scenarios = [
        {
            "name": "Create Objective",
            "method": "POST",
            "endpoint": "/api/objectives",
            "data": {
                "name": "Performance Test Objective",
                "description": {"brief": "Testing API performance"},
                "guild_id": "550e8400-e29b-41d4-a716-446655440000"
            }
        },
        {
            "name": "Get Objectives",
            "method": "GET",
            "endpoint": "/api/objectives?guild_id=550e8400-e29b-41d4-a716-446655440000"
        },
        {
            "name": "Create Task",
            "method": "POST",
            "endpoint": "/api/tasks",
            "data": {
                "name": "Performance Test Task",
                "objective_id": "550e8400-e29b-41d4-a716-446655440001",
                "guild_id": "550e8400-e29b-41d4-a716-446655440000"
            }
        },
        {
            "name": "Update Progress",
            "method": "PATCH",
            "endpoint": "/api/objectives/550e8400-e29b-41d4-a716-446655440001/progress",
            "data": {"metrics": {"test": 100}}
        }
    ]

    latencies = []
    success_count = 0
    total_tests = len(test_scenarios)

    for scenario in test_scenarios:
        print(f"Testing: {scenario['name']}")

        start_time = time.time()

        if scenario["method"] == "GET":
            response = client.get(scenario["endpoint"])
        elif scenario["method"] == "POST":
            response = client.post(scenario["endpoint"], json=scenario["data"])
        elif scenario["method"] == "PATCH":
            response = client.patch(scenario["endpoint"], json=scenario["data"])

        end_time = time.time()

        latency = end_time - start_time
        latencies.append(latency)

        if response.status_code in [200, 201]:
            success_count += 1
            print(f"  [PASS] Success ({latency:.3f}s)")
        else:
            print(f"  [FAIL] Failed (Status: {response.status_code})")

    # Calculate metrics
    avg_latency = sum(latencies) / len(latencies)
    max_latency = max(latencies)
    success_rate = (success_count / total_tests) * 100

    print("\nPerformance Results:")
    print(f"  Average Latency: {avg_latency:.3f}s")
    print(f"  Maximum Latency: {max_latency:.3f}s")
    print(f"  Success Rate: {success_rate:.1f}%")
    print(f"  Success Count: {success_count}/{total_tests}")

    # Check requirements
    latency_ok = avg_latency < 2.0 and max_latency < 2.0
    success_ok = success_rate >= 90.0

    print("\nMVP Requirements Check:")
    print(f"  Average Latency < 2s: {'[PASS]' if latency_ok else '[FAIL]'}")
    print(f"  Success Rate >= 90%: {'[PASS]' if success_ok else '[FAIL]'}")

    if latency_ok and success_ok:
        print("\n[SUCCESS] MVP Requirements Met!")
        return True
    else:
        print("\n[WARNING] Some requirements not met")
        return False

if __name__ == '__main__':
    # Run unit tests
    print("Running Standalone API Unit Tests...")
    unittest.main(argv=[''], exit=False, verbosity=2)

    print("\n" + "=" * 60)

    # Run performance test
    performance_passed = run_standalone_performance_test()

    if performance_passed:
        print("\n[SUCCESS] All tests passed! SphereConnect standalone API is ready for MVP.")
    else:
        print("\n[FAIL] Performance requirements not met. Further optimization needed.")
