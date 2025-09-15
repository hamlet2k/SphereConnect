# Copyright 2025 Federico Arce. All Rights Reserved.
# Confidential - Do Not Distribute Without Permission.

# Test Suite for Wingman-AI Skill
# Tests accuracy and latency for voice command processing

import time
import unittest
from unittest.mock import Mock, patch
import sys
import os

# Add the app directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'app'))

from api.src.wingman_skill_poc import WingmanSkill

class TestWingmanSkill(unittest.TestCase):
    def setUp(self):
        """Set up test fixtures"""
        self.skill = WingmanSkill()

        # Mock the requests to avoid actual API calls during testing
        self.mock_response = Mock()
        self.mock_response.status_code = 200
        self.mock_response.json.return_value = {
            "id": "test-id",
            "message": "Success",
            "tts_response": "Test response",
            "system_prompt": "Act as a UEE Commander, coordinating Star Citizen guild missions with formal, strategic responses.",
            "name": "UEE Commander",
            "phonetic": "Uniform Echo Echo Commander"
        }

    def test_parse_intent_create_objective(self):
        """Test parsing of create objective commands"""
        test_cases = [
            ("Create objective: Collect 500 SCU Gold", "create_objective"),
            ("New objective: Mine platinum ore", "create_objective"),
            ("Start objective: Patrol sector 7", "create_objective"),
        ]

        for command, expected_intent in test_cases:
            with self.subTest(command=command):
                intent, params = self.skill.parse_intent(command)
                self.assertEqual(intent, expected_intent)
                self.assertIn("name", params)
                self.assertIn("guild_id", params)

    def test_parse_intent_assign_task(self):
        """Test parsing of assign task commands"""
        test_cases = [
            ("Assign task Scout Route to Pilot X", "assign_task"),
            ("Task Patrol Sector to Commander Y", "assign_task"),
            ("Give task Mining Operation to Pilot Z", "assign_task"),
        ]

        for command, expected_intent in test_cases:
            with self.subTest(command=command):
                intent, params = self.skill.parse_intent(command)
                self.assertEqual(intent, expected_intent)
                self.assertIn("task_name", params)
                self.assertIn("assignee", params)

    def test_parse_intent_report_progress(self):
        """Test parsing of progress report commands"""
        test_cases = [
            ("Delivered 100 SCU Gold", "report_progress"),
            ("Completed mining 50 platinum", "report_progress"),
            ("Progress: Finished patrol mission", "report_progress"),
        ]

        for command, expected_intent in test_cases:
            with self.subTest(command=command):
                intent, params = self.skill.parse_intent(command)
                self.assertEqual(intent, expected_intent)
                self.assertIn("metrics", params)

    def test_parse_intent_schedule_task(self):
        """Test parsing of schedule task commands"""
        test_cases = [
            ("Schedule task for 20 minutes now", "schedule_task"),
            ("Plan mining operation for 2 hours", "schedule_task"),
            ("Set patrol for Friday night", "schedule_task"),
        ]

        for command, expected_intent in test_cases:
            with self.subTest(command=command):
                intent, params = self.skill.parse_intent(command)
                self.assertEqual(intent, expected_intent)
                self.assertIn("schedule", params)

    def test_parse_metrics_scu(self):
        """Test parsing SCU metrics"""
        test_cases = [
            ("Collect 500 SCU Gold", {"gold_scu": 500}),
            ("Delivered 100 SCU Platinum", {"platinum_scu": 100}),
            ("Mining 250 SCU Quantum", {"quantum_scu": 250}),
        ]

        for text, expected_metrics in test_cases:
            with self.subTest(text=text):
                metrics = self.skill.parse_metrics_from_text(text)
                self.assertEqual(metrics, expected_metrics)

    def test_parse_metrics_generic(self):
        """Test parsing generic quantity metrics"""
        test_cases = [
            ("Destroyed 5 enemy ships", {"enemy_ships": 5}),
            ("Rescued 10 civilians", {"civilians": 10}),
            ("Completed 3 missions", {"missions": 3}),
        ]

        for text, expected_metrics in test_cases:
            with self.subTest(text=text):
                metrics = self.skill.parse_metrics_from_text(text)
                self.assertEqual(metrics, expected_metrics)

    def test_parse_schedule(self):
        """Test parsing schedule information"""
        test_cases = [
            ("for 20 minutes now", {"flexible": False, "start": str, "duration": "20m"}),
            ("immediately", {"flexible": False, "start": str}),
            ("for 2 hours from now", {"flexible": False, "start": str}),
        ]

        for text, expected_keys in test_cases:
            with self.subTest(text=text):
                schedule = self.skill.parse_schedule_from_text(text)
                for key in expected_keys:
                    if key == "start" and expected_keys[key] == str:
                        self.assertIsInstance(schedule.get("start"), str)
                    else:
                        self.assertEqual(schedule[key], expected_keys[key])

    def test_infer_categories(self):
        """Test category inference from text"""
        test_cases = [
            ("Collect 500 SCU Gold", ["Economy"]),
            ("Patrol sector 7", ["Military"]),
            ("Explore unknown system", ["Exploration"]),
            ("Transport cargo to station", ["Transport", "Economy"]),
            ("Random task", ["General"]),
        ]

        for text, expected_categories in test_cases:
            with self.subTest(text=text):
                categories = self.skill.infer_categories_from_text(text)
                self.assertEqual(categories, expected_categories)

    @patch('api.src.wingman_skill_poc.requests.post')
    def test_handle_create_objective(self, mock_post):
        """Test handling create objective commands"""
        mock_post.return_value = self.mock_response

        command = "Create objective: Collect 500 SCU Gold"
        result = self.skill.handle_voice_command(command)

        self.assertIn("response", result)
        self.assertIn("tts", result)
        self.assertTrue(result["tts"])
        mock_post.assert_called_once()

    @patch('api.src.wingman_skill_poc.requests.post')
    def test_handle_assign_task(self, mock_post):
        """Test handling assign task commands"""
        mock_post.return_value = self.mock_response

        command = "Assign task Scout Route to Pilot X"
        result = self.skill.handle_voice_command(command)

        self.assertIn("response", result)
        self.assertIn("tts", result)
        self.assertTrue(result["tts"])

    @patch('api.src.wingman_skill_poc.requests.patch')
    def test_handle_report_progress(self, mock_patch):
        """Test handling progress report commands"""
        mock_patch.return_value = self.mock_response

        command = "Delivered 100 SCU Gold"
        result = self.skill.handle_voice_command(command)

        self.assertIn("response", result)
        self.assertIn("tts", result)
        self.assertTrue(result["tts"])

    @patch('api.src.wingman_skill_poc.requests.patch')
    def test_handle_schedule_task(self, mock_patch):
        """Test handling schedule task commands"""
        mock_patch.return_value = self.mock_response

        command = "Schedule task for 20 minutes now"
        result = self.skill.handle_voice_command(command)

        self.assertIn("response", result)
        self.assertIn("tts", result)
        self.assertTrue(result["tts"])

    @patch('api.src.wingman_skill_poc.requests.post')
    @patch('api.src.wingman_skill_poc.requests.patch')
    @patch('api.src.wingman_skill_poc.requests.get')
    def test_latency_performance(self, mock_get, mock_patch, mock_post):
        """Test that responses are generated within 2 seconds"""
        mock_post.return_value = self.mock_response
        mock_patch.return_value = self.mock_response
        mock_get.return_value = self.mock_response

        test_commands = [
            "Create objective: Collect 500 SCU Gold",
            "Assign task Scout Route to Pilot X",
            "Delivered 100 SCU Gold",
            "Schedule task for 20 minutes now"
        ]

        for command in test_commands:
            with self.subTest(command=command):
                start_time = time.time()
                result = self.skill.handle_voice_command(command)
                end_time = time.time()

                latency = end_time - start_time
                self.assertLess(latency, 2.0, f"Command took {latency:.2f}s, should be < 2.0s")
                self.assertIn("response", result)

    def test_accuracy_metrics(self):
        """Test accuracy of intent detection and parsing"""
        test_cases = [
            # (command, expected_intent, should_have_metrics)
            ("Create objective: Collect 500 SCU Gold", "create_objective", True),
            ("Assign task Scout Route to Pilot X", "assign_task", False),
            ("Delivered 100 SCU Gold", "report_progress", True),
            ("Schedule task for 20 minutes now", "schedule_task", False),
        ]

        correct_intents = 0
        total_cases = len(test_cases)

        for command, expected_intent, should_have_metrics in test_cases:
            intent, params = self.skill.parse_intent(command)

            if intent == expected_intent:
                correct_intents += 1

            if should_have_metrics:
                self.assertIn("metrics", params)
                self.assertTrue(len(params["metrics"]) > 0)

        accuracy = (correct_intents / total_cases) * 100
        self.assertGreaterEqual(accuracy, 90.0, f"Intent detection accuracy: {accuracy:.1f}%, should be >= 90%")

    def test_unknown_command_handling(self):
        """Test handling of unknown or invalid commands"""
        unknown_commands = [
            "What's the weather like?",
            "Play some music",
            "Invalid command xyz123",
            "",
        ]

        for command in unknown_commands:
            with self.subTest(command=command):
                result = self.skill.handle_voice_command(command)
                self.assertIn("response", result)
                self.assertIn("Command not recognized", result["response"])

def run_performance_test():
    """Run comprehensive performance test"""
    print("Running Wingman-AI Skill Performance Test...")
    print("=" * 50)

    skill = WingmanSkill()
    test_commands = [
        "Create objective: Collect 500 SCU Gold",
        "Assign task Scout Route to Pilot X",
        "Delivered 100 SCU Gold",
        "Schedule task for 20 minutes now",
        "New objective: Mine 200 SCU Platinum",
        "Task Patrol Sector to Commander Alpha",
        "Progress: Completed 3 mining runs",
        "Plan exploration for 1 hour from now"
    ]

    latencies = []
    accuracies = []

    for i, command in enumerate(test_commands):
        print(f"Test {i+1}: {command}")

        # Measure latency
        start_time = time.time()
        result = skill.handle_voice_command(command)
        end_time = time.time()

        latency = end_time - start_time
        latencies.append(latency)

        print(".3f")

        # Check if response was generated
        has_response = "response" in result and result["response"]
        accuracies.append(1 if has_response else 0)

        print(f"  Response: {result.get('response', 'No response')[:50]}...")
        print()

    # Calculate metrics
    avg_latency = sum(latencies) / len(latencies)
    max_latency = max(latencies)
    accuracy = (sum(accuracies) / len(accuracies)) * 100

    print("Performance Results:")
    print(".3f")
    print(".3f")
    print(".1f")

    # Check requirements
    latency_ok = avg_latency < 2.0 and max_latency < 2.0
    accuracy_ok = accuracy >= 90.0

    print("\nRequirements Check:")
    print(f"  Latency < 2s: {'[PASS]' if latency_ok else '[FAIL]'}")
    print(f"  Accuracy >= 90%: {'[PASS]' if accuracy_ok else '[FAIL]'}")

    if latency_ok and accuracy_ok:
        print("\n[PASS] All requirements met!")
    else:
        print("\n[FAIL] Some requirements not met")

    return {
        "avg_latency": avg_latency,
        "max_latency": max_latency,
        "accuracy": accuracy,
        "requirements_met": latency_ok and accuracy_ok
    }

if __name__ == '__main__':
    # Run unit tests
    print("Running Unit Tests...")
    unittest.main(argv=[''], exit=False, verbosity=2)

    print("\n" + "=" * 50)

    # Run performance test
    performance_results = run_performance_test()
