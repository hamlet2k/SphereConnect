# Copyright 2025 [Your Legal Name]. All Rights Reserved.
# Confidential - Do Not Distribute Without Permission.

# Wingman-AI Skill for ConnectSphere
# Handles voice commands for Star Citizen guild mission coordination

import requests
import json
import re
import uuid
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, Tuple

class WingmanSkill:
    def __init__(self, base_url: str = "http://localhost:8000/api"):
        self.base_url = base_url
        self.default_guild_id = "guild_1"  # Default for demo purposes
        self.intent_patterns = {
            "create_objective": [
                r"create objective[:\s]*(.+)",
                r"new objective[:\s]*(.+)",
                r"start objective[:\s]*(.+)"
            ],
            "assign_task": [
                r"assign task (.+) to (.+)",
                r"task (.+) for (.+)",
                r"give task (.+) to (.+)"
            ],
            "report_progress": [
                r"(?:delivered|completed|finished) (.+)",
                r"progress[:\s]*(.+)",
                r"update[:\s]*(.+)"
            ],
            "schedule_task": [
                r"schedule (.+) for (.+)",
                r"plan (.+) (.+)",
                r"set (.+) (.+)"
            ]
        }

    def handle_voice_command(self, command_text: str, user_id: str = "demo_user") -> Dict[str, Any]:
        """
        Main entry point for processing voice commands
        Returns TTS response and command execution result
        """
        headers = {"Authorization": f"Bearer {user_id}"}

        # Detect intent and extract parameters
        intent, params = self.parse_intent(command_text)

        if not intent:
            return self.tts_response("Command not recognized. Please try again.", "Not a ConnectSphere command")

        # Get or create AI Commander persona
        commander = self.get_ai_commander(params.get('guild_id', self.default_guild_id), headers)
        system_prompt = commander.get("system_prompt", "Act as a UEE Commander...")

        try:
            if intent == "create_objective":
                return self.handle_create_objective(params, headers, system_prompt)

            elif intent == "assign_task":
                return self.handle_assign_task(params, headers, system_prompt)

            elif intent == "report_progress":
                return self.handle_report_progress(params, headers, system_prompt)

            elif intent == "schedule_task":
                return self.handle_schedule_task(params, headers, system_prompt)

            else:
                return self.tts_response("Unknown command type", system_prompt)

        except Exception as e:
            return self.tts_response(f"Error processing command: {str(e)}", system_prompt)

    def parse_intent(self, command_text: str) -> Tuple[Optional[str], Dict[str, Any]]:
        """Parse voice command to detect intent and extract parameters"""
        command_lower = command_text.lower()

        # Check for create objective patterns
        for pattern in self.intent_patterns["create_objective"]:
            match = re.search(pattern, command_lower, re.IGNORECASE)
            if match:
                objective_name = match.group(1).strip()
                metrics = self.parse_metrics_from_text(command_text)
                return "create_objective", {
                    "name": objective_name,
                    "description": command_text,
                    "metrics": metrics,
                    "guild_id": self.default_guild_id
                }

        # Check for assign task patterns
        for pattern in self.intent_patterns["assign_task"]:
            match = re.search(pattern, command_lower, re.IGNORECASE)
            if match:
                task_name = match.group(1).strip()
                assignee = match.group(2).strip()
                return "assign_task", {
                    "task_name": task_name,
                    "assignee": assignee,
                    "guild_id": self.default_guild_id
                }

        # Check for progress report patterns
        for pattern in self.intent_patterns["report_progress"]:
            match = re.search(pattern, command_lower, re.IGNORECASE)
            if match:
                progress_text = match.group(1).strip()
                metrics = self.parse_metrics_from_text(progress_text)
                return "report_progress", {
                    "progress_text": progress_text,
                    "metrics": metrics,
                    "guild_id": self.default_guild_id
                }

        # Check for schedule task patterns
        for pattern in self.intent_patterns["schedule_task"]:
            match = re.search(pattern, command_lower, re.IGNORECASE)
            if match:
                task_ref = match.group(1).strip()
                schedule_text = match.group(2).strip()
                schedule = self.parse_schedule_from_text(schedule_text)
                return "schedule_task", {
                    "task_reference": task_ref,
                    "schedule_text": schedule_text,
                    "schedule": schedule,
                    "guild_id": self.default_guild_id
                }

        return None, {}

    def parse_metrics_from_text(self, text: str) -> Dict[str, Any]:
        """Parse resource metrics from voice command text"""
        metrics = {}

        # Parse SCU amounts (e.g., "500 SCU Gold", "100 SCU Platinum")
        scu_pattern = r'(\d+)\s*SCU\s*([a-zA-Z]+)'
        scu_matches = re.findall(scu_pattern, text, re.IGNORECASE)
        for match in scu_matches:
            amount = int(match[0])
            resource_type = match[1].lower()
            metrics[f"{resource_type}_scu"] = amount

        # Parse generic quantities (e.g., "10 ships", "5 mining drones")
        quantity_pattern = r'(\d+)\s+([a-zA-Z\s]+?)(?:\s|$|,)'
        quantity_matches = re.findall(quantity_pattern, text, re.IGNORECASE)
        for match in quantity_matches:
            amount = int(match[0])
            item_type = match[1].strip().lower().replace(' ', '_')
            if item_type and not any(scu in item_type for scu in ['scu', 'gold', 'platinum', 'quantum']):
                metrics[item_type] = amount

        return metrics

    def parse_schedule_from_text(self, text: str) -> Dict[str, Any]:
        """Parse scheduling information from voice command text"""
        schedule = {"flexible": True, "timezone": "UTC"}

        # Parse time durations (e.g., "20 minutes", "2 hours")
        duration_patterns = [
            (r'(\d+)\s*minute', 'minutes'),
            (r'(\d+)\s*hour', 'hours'),
            (r'(\d+)\s*day', 'days')
        ]

        for pattern, unit in duration_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                amount = int(match.group(1))  # Use group(1) instead of match[0]
                if "now" in text.lower() or "from now" in text.lower():
                    if unit == 'minutes':
                        schedule["start"] = (datetime.utcnow() + timedelta(minutes=amount)).isoformat()
                    elif unit == 'hours':
                        schedule["start"] = (datetime.utcnow() + timedelta(hours=amount)).isoformat()
                    elif unit == 'days':
                        schedule["start"] = (datetime.utcnow() + timedelta(days=amount)).isoformat()
                    schedule["flexible"] = False
                    break

        # Parse specific times
        if "immediately" in text.lower() or "right now" in text.lower():
            schedule["start"] = datetime.utcnow().isoformat()
            schedule["flexible"] = False

        return schedule

    def get_ai_commander(self, guild_id: str, headers: Dict[str, str]) -> Dict[str, Any]:
        """Fetch AI Commander configuration for the guild"""
        try:
            response = requests.get(f"{self.base_url}/guilds/{guild_id}/ai_commanders", headers=headers)
            if response.status_code == 200:
                return response.json()
            else:
                # Return default commander
                return {
                    "name": "UEE Commander",
                    "system_prompt": "Act as a UEE Commander, coordinating Star Citizen guild missions with formal, strategic responses.",
                    "phonetic": "Uniform Echo Echo Commander"
                }
        except Exception:
            return {
                "name": "UEE Commander",
                "system_prompt": "Act as a UEE Commander, coordinating Star Citizen guild missions with formal, strategic responses.",
                "phonetic": "Uniform Echo Echo Commander"
            }

    def handle_create_objective(self, params: Dict[str, Any], headers: Dict[str, str], system_prompt: str) -> Dict[str, Any]:
        """Handle objective creation commands"""
        payload = {
            "name": params.get("name", "Unnamed Objective"),
            "description": {
                "brief": params.get("description", ""),
                "tactical": "",
                "classified": "",
                "metrics": params.get("metrics", {})
            },
            "categories": self.infer_categories_from_text(params.get("description", "")),
            "priority": "Medium",
            "applicable_rank": "Recruit",
            "guild_id": params.get("guild_id", self.default_guild_id)
        }

        response = requests.post(f"{self.base_url}/objectives", json=payload, headers=headers)
        if response.status_code == 200:
            result = response.json()
            return self.tts_response(f"Objective '{payload['name']}' created successfully", system_prompt)
        else:
            return self.tts_response(f"Failed to create objective: {response.text}", system_prompt)

    def handle_assign_task(self, params: Dict[str, Any], headers: Dict[str, str], system_prompt: str) -> Dict[str, Any]:
        """Handle task assignment commands"""
        # First, create the task
        task_payload = {
            "name": params.get("task_name", "Unnamed Task"),
            "objective_id": str(uuid.uuid4()),  # This should be linked to an objective
            "description": f"Assigned to {params.get('assignee', 'Unknown')}",
            "guild_id": params.get("guild_id", self.default_guild_id),
            "priority": "Medium"
        }

        task_response = requests.post(f"{self.base_url}/tasks", json=task_payload, headers=headers)
        if task_response.status_code != 200:
            return self.tts_response(f"Failed to create task: {task_response.text}", system_prompt)

        task_data = task_response.json()
        task_id = task_data.get("id")

        # Then assign it
        assign_payload = {
            "task_id": task_id,
            "user_id": str(uuid.uuid4()),  # This should be resolved from assignee name
            "squad_id": None
        }

        assign_response = requests.post(f"{self.base_url}/tasks/assign", json=assign_payload, headers=headers)
        if assign_response.status_code == 200:
            return self.tts_response(f"Task '{task_payload['name']}' assigned to {params.get('assignee', 'pilot')}", system_prompt)
        else:
            return self.tts_response(f"Failed to assign task: {assign_response.text}", system_prompt)

    def handle_report_progress(self, params: Dict[str, Any], headers: Dict[str, str], system_prompt: str) -> Dict[str, Any]:
        """Handle progress reporting commands"""
        # Find the most recent objective to update
        try:
            objectives_response = requests.get(f"{self.base_url}/objectives/recent", headers=headers)
            if objectives_response.status_code == 200:
                objectives = objectives_response.json()
                if objectives:
                    objective_id = objectives[0]["id"]
                else:
                    return self.tts_response("No active objectives found", system_prompt)
            else:
                return self.tts_response("Could not retrieve objectives", system_prompt)
        except:
            # Fallback to a demo objective ID
            objective_id = str(uuid.uuid4())

        payload = {
            "metrics": params.get("metrics", {})
        }

        response = requests.patch(f"{self.base_url}/objectives/{objective_id}/progress", json=payload, headers=headers)
        if response.status_code == 200:
            metrics = params.get("metrics", {})
            return self.tts_response(f"Progress updated: {metrics}", system_prompt)
        else:
            return self.tts_response(f"Failed to update progress: {response.text}", system_prompt)

    def handle_schedule_task(self, params: Dict[str, Any], headers: Dict[str, str], system_prompt: str) -> Dict[str, Any]:
        """Handle task scheduling commands"""
        # Find the task to schedule (simplified - would need better task lookup)
        task_id = str(uuid.uuid4())  # This should be resolved from task_reference

        payload = {
            "schedule": params.get("schedule", {})
        }

        response = requests.patch(f"{self.base_url}/tasks/{task_id}/schedule", json=payload, headers=headers)
        if response.status_code == 200:
            schedule = params.get("schedule", {})
            return self.tts_response(f"Task scheduled successfully", system_prompt)
        else:
            return self.tts_response(f"Failed to schedule task: {response.text}", system_prompt)

    def infer_categories_from_text(self, text: str) -> list:
        """Infer objective categories from command text"""
        categories = []
        text_lower = text.lower()

        if any(word in text_lower for word in ['gold', 'platinum', 'quantum', 'scu', 'mining', 'trade']):
            categories.append("Economy")
        if any(word in text_lower for word in ['patrol', 'defend', 'military', 'combat']):
            categories.append("Military")
        if any(word in text_lower for word in ['explore', 'scan', 'survey']):
            categories.append("Exploration")
        if any(word in text_lower for word in ['transport', 'cargo', 'delivery']):
            categories.append("Transport")

        return categories if categories else ["General"]

    def tts_response(self, text: str, system_prompt: str = "") -> Dict[str, Any]:
        """Format response for TTS output"""
        return {
            "response": text,
            "tts": True,
            "system_prompt": system_prompt,
            "timestamp": datetime.utcnow().isoformat()
        }

# Convenience function for backward compatibility
def handle_voice_command(command_text: str, user_id: str = "demo_user") -> Dict[str, Any]:
    """Legacy function for backward compatibility"""
    skill = WingmanSkill()
    return skill.handle_voice_command(command_text, user_id)

# Example usage and testing
if __name__ == "__main__":
    skill = WingmanSkill()

    # Test commands
    test_commands = [
        "Create objective: Collect 500 SCU Gold",
        "Assign task Scout Route to Pilot X",
        "Delivered 100 SCU Gold",
        "Schedule task for 20 minutes now"
    ]

    for command in test_commands:
        print(f"\nCommand: {command}")
        result = skill.handle_voice_command(command)
        print(f"Response: {result['response']}")
