import os
import json
import asyncio
import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Any, Dict, Tuple
import aiohttp
from aiohttp import ClientError
from api.enums import LogType
from api.interface import SettingsConfig, SkillConfig, WingmanInitializationError
from services.benchmark import Benchmark
from skills.skill_base import Skill

if TYPE_CHECKING:
    from wingmen.open_ai_wingman import OpenAiWingman


class SphereConnect(Skill):
    """Skill for Star Citizen guild coordination via SphereConnect API."""

    def __init__(
        self,
        config: SkillConfig,
        settings: SettingsConfig,
        wingman: "OpenAiWingman",
    ) -> None:
        self.sphereconnect_url = "http://localhost:8000/api"
        self.request_timeout = 10
        self.max_retries = 3
        self.retry_delay = 2
        self.default_guild_id = "00000000-0000-0000-0000-000000000000"

        super().__init__(config=config, settings=settings, wingman=wingman)

    async def validate(self) -> list[WingmanInitializationError]:
        errors = await super().validate()

        self.request_timeout = self.retrieve_custom_property_value(
            "request_timeout", errors
        )
        self.max_retries = self.retrieve_custom_property_value("max_retries", errors)
        self.retry_delay = self.retrieve_custom_property_value("retry_delay", errors)
        self.sphereconnect_url = self.retrieve_custom_property_value(
            "sphereconnect_url", errors
        )
        self.default_guild_id = self.retrieve_custom_property_value(
            "default_guild_id", errors
        )

        return errors

    async def is_waiting_response_needed(self, tool_name: str) -> bool:
        return True

    def get_tools(self) -> list[Tuple[str, Dict[str, Any]]]:
        return [
            (
                "create_objective",
                {
                    "type": "function",
                    "function": {
                        "name": "create_objective",
                        "description": "Create a new objective for the Star Citizen guild mission. Parse natural language to extract objective details, categories, and metrics.",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "name": {
                                    "type": "string",
                                    "description": "The objective name/title",
                                },
                                "description": {
                                    "type": "string",
                                    "description": "Natural language description of the objective",
                                },
                                "categories": {
                                    "type": "array",
                                    "items": {"type": "string"},
                                    "description": "Categories like Economy, Military, Exploration, Transport",
                                },
                                "priority": {
                                    "type": "string",
                                    "enum": ["Low", "Medium", "High", "Critical"],
                                    "description": "Priority level of the objective",
                                },
                                "guild_id": {
                                    "type": "string",
                                    "description": "The guild identifier (UUID)",
                                },
                                "metrics": {
                                    "type": "object",
                                    "description": "Resource metrics (e.g., SCU amounts, ship counts)",
                                },
                            },
                            "required": ["name", "guild_id"],
                        },
                    },
                },
            ),
            (
                "assign_task",
                {
                    "type": "function",
                    "function": {
                        "name": "assign_task",
                        "description": "Assign a task to a user or squad for Star Citizen guild coordination.",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "task_name": {
                                    "type": "string",
                                    "description": "Name of the task to assign",
                                },
                                "objective_id": {
                                    "type": "string",
                                    "description": "The objective this task belongs to",
                                },
                                "assignee_name": {
                                    "type": "string",
                                    "description": "Name of the user or squad to assign to",
                                },
                                "guild_id": {
                                    "type": "string",
                                    "description": "The guild identifier",
                                },
                                "description": {
                                    "type": "string",
                                    "description": "Task description/details",
                                },
                            },
                            "required": ["task_name", "guild_id"],
                        },
                    },
                },
            ),
            (
                "report_progress",
                {
                    "type": "function",
                    "function": {
                        "name": "report_progress",
                        "description": "Report progress on objectives or tasks for Star Citizen guild missions.",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "objective_id": {
                                    "type": "string",
                                    "description": "The objective to update progress for",
                                },
                                "progress_text": {
                                    "type": "string",
                                    "description": "Natural language progress report",
                                },
                                "metrics": {
                                    "type": "object",
                                    "description": "Updated metrics (e.g., SCU delivered, ships completed)",
                                },
                                "guild_id": {
                                    "type": "string",
                                    "description": "The guild identifier",
                                },
                            },
                            "required": ["guild_id"],
                        },
                    },
                },
            ),
            (
                "get_guild_status",
                {
                    "type": "function",
                    "function": {
                        "name": "get_guild_status",
                        "description": "Get current status of objectives, tasks, and guild information.",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "guild_id": {
                                    "type": "string",
                                    "description": "The guild identifier",
                                },
                                "filter_type": {
                                    "type": "string",
                                    "enum": ["objectives", "tasks", "all"],
                                    "description": "What type of information to retrieve",
                                },
                            },
                            "required": ["guild_id"],
                        },
                    },
                },
            ),
            (
                "schedule_task",
                {
                    "type": "function",
                    "function": {
                        "name": "schedule_task",
                        "description": "Schedule a task with specific timing and duration for Star Citizen guild operations.",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "task_id": {
                                    "type": "string",
                                    "description": "The task to schedule",
                                },
                                "schedule": {
                                    "type": "object",
                                    "description": "Schedule details including start time, duration, and flexibility",
                                    "properties": {
                                        "start": {
                                            "type": "string",
                                            "description": "ISO format start time",
                                        },
                                        "duration": {
                                            "type": "string",
                                            "description": "Duration (e.g., '30m', '2h')",
                                        },
                                        "flexible": {
                                            "type": "boolean",
                                            "description": "Whether the schedule is flexible",
                                        },
                                        "timezone": {
                                            "type": "string",
                                            "description": "Timezone for the schedule",
                                        },
                                    },
                                },
                                "guild_id": {
                                    "type": "string",
                                    "description": "The guild identifier",
                                },
                            },
                            "required": ["task_id", "guild_id"],
                        },
                    },
                },
            ),
            (
                "get_my_tasks",
                {
                    "type": "function",
                    "function": {
                        "name": "get_my_tasks",
                        "description": "Get tasks assigned to the current user/pilot.",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "guild_id": {
                                    "type": "string",
                                    "description": "The guild identifier",
                                },
                                "user_id": {
                                    "type": "string",
                                    "description": "The user identifier (optional, uses default if not provided)",
                                },
                            },
                            "required": ["guild_id"],
                        },
                    },
                },
            ),
            (
                "switch_guild",
                {
                    "type": "function",
                    "function": {
                        "name": "switch_guild",
                        "description": "Switch the user's current guild context to a different guild.",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "guild_name": {
                                    "type": "string",
                                    "description": "The name of the guild to switch to",
                                },
                                "user_id": {
                                    "type": "string",
                                    "description": "The user identifier (required for switching)",
                                },
                            },
                            "required": ["guild_name", "user_id"],
                        },
                    },
                },
            ),
            (
                "invite_to_guild",
                {
                    "type": "function",
                    "function": {
                        "name": "invite_to_guild",
                        "description": "Create an invite code for a specific guild to share with potential members.",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "guild_name": {
                                    "type": "string",
                                    "description": "The name of the guild to create an invite for",
                                },
                                "user_id": {
                                    "type": "string",
                                    "description": "The user identifier (required for creating invites)",
                                },
                                "expires_hours": {
                                    "type": "number",
                                    "description": "Number of hours until the invite expires (default: 24)",
                                    "default": 24,
                                },
                                "max_uses": {
                                    "type": "number",
                                    "description": "Maximum number of uses for this invite (default: 1)",
                                    "default": 1,
                                },
                            },
                            "required": ["guild_name", "user_id"],
                        },
                    },
                },
            ),
            (
                "join_guild",
                {
                    "type": "function",
                    "function": {
                        "name": "join_guild",
                        "description": "Join a guild using an invite code provided by a guild member.",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "invite_code": {
                                    "type": "string",
                                    "description": "The invite code to join the guild",
                                },
                                "user_id": {
                                    "type": "string",
                                    "description": "The user identifier (required for joining)",
                                },
                            },
                            "required": ["invite_code", "user_id"],
                        },
                    },
                },
            ),
            (
                "leave_guild",
                {
                    "type": "function",
                    "function": {
                        "name": "leave_guild",
                        "description": "Leave the current guild and switch back to personal guild.",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "guild_name": {
                                    "type": "string",
                                    "description": "The name of the guild to leave",
                                },
                                "user_id": {
                                    "type": "string",
                                    "description": "The user identifier (required for leaving)",
                                },
                            },
                            "required": ["guild_name", "user_id"],
                        },
                    },
                },
            ),
        ]

    async def _make_api_request(self, method: str, endpoint: str, data: Dict[str, Any] = None) -> str:
        """Make an API request to SphereConnect with retry logic."""
        url = f"{self.sphereconnect_url}{endpoint}"

        for attempt in range(1, self.max_retries + 1):
            try:
                async with aiohttp.ClientSession() as session:
                    headers = {
                        "Content-Type": "application/json",
                        "Accept": "application/json",
                    }

                    # Debug logging for request details
                    if self.settings.debug_mode:
                        await self.printr.print_async(
                            f"Making {method} request to {url} with data: {data}",
                            color=LogType.INFO,
                        )

                    async with session.request(
                        method=method,
                        url=url,
                        headers=headers,
                        json=data,
                        timeout=self.request_timeout,
                    ) as response:
                        # Debug logging for response
                        if self.settings.debug_mode:
                            await self.printr.print_async(
                                f"Response status: {response.status}, headers: {dict(response.headers)}",
                                color=LogType.INFO,
                            )

                        response.raise_for_status()

                        response_text = await response.text()

                        if self.settings.debug_mode:
                            await self.printr.print_async(
                                f"Response body: {response_text}",
                                color=LogType.INFO,
                            )

                        if response.headers.get("Content-Type", "").startswith("application/json"):
                            return response_text
                        else:
                            return response_text
                            
            except (ClientError, asyncio.TimeoutError) as e:
                if attempt <= self.max_retries:
                    if self.settings.debug_mode:
                        await self.printr.print_async(
                            f"SphereConnect API request failed (attempt {attempt}/{self.max_retries}): {e}",
                            color=LogType.INFO,
                        )
                    await asyncio.sleep(self.retry_delay)
                else:
                    return f"Error: Could not complete SphereConnect API request after {self.max_retries} attempts. Exception: {e}"
            except Exception as e:
                return f"Error: Unexpected error with SphereConnect API request: {e}"

    async def execute_tool(
        self, tool_name: str, parameters: Dict[str, Any], benchmark: Benchmark
    ) -> Tuple[str, str]:
        function_response = "Error: SphereConnect command failed."
        instant_response = ""

        if tool_name in ["create_objective", "assign_task", "report_progress", "get_guild_status", "schedule_task", "get_my_tasks", "switch_guild", "invite_to_guild", "join_guild", "leave_guild"]:
            benchmark.start_snapshot(f"SphereConnect: {tool_name}")

            if self.settings.debug_mode:
                message = f"SphereConnect: executing tool '{tool_name}'"
                if parameters:
                    message += f" with params: {parameters}"
                await self.printr.print_async(text=message, color=LogType.INFO)

            if tool_name == "create_objective":
                try:
                    # Parse metrics from description if not provided
                    if "metrics" not in parameters:
                        parameters["metrics"] = self._parse_metrics_from_text(parameters.get("description", ""))
                    
                    # Infer categories if not provided
                    if "categories" not in parameters:
                        parameters["categories"] = self._infer_categories_from_text(parameters.get("description", ""))

                    objective_data = {
                        "name": parameters["name"],
                        "description": {
                            "brief": parameters.get("description", ""),
                            "tactical": "",
                            "classified": "",
                            "metrics": parameters.get("metrics", {})
                        },
                        "categories": parameters.get("categories", []),
                        "priority": parameters.get("priority", "Medium"),
                        "applicable_rank": "Recruit",
                        "guild_id": parameters["guild_id"]
                    }

                    # Debug logging for request data
                    if self.settings.debug_mode:
                        await self.printr.print_async(
                            f"Sending objective data: {objective_data}",
                            color=LogType.INFO,
                        )

                    response_text = await self._make_api_request("POST", "/objectives", objective_data)
                    function_response = f"Objective '{parameters['name']}' created successfully for the guild mission."

                except Exception as e:
                    function_response = f"Failed to create objective: {e}"

            elif tool_name == "assign_task":
                try:
                    # First create the task
                    task_data = {
                        "name": parameters["task_name"],
                        "objective_id": parameters.get("objective_id", ""),
                        "description": parameters.get("description", ""),
                        "guild_id": parameters["guild_id"],
                        "priority": parameters.get("priority", "Medium")
                    }

                    task_response = await self._make_api_request("POST", "/tasks", task_data)

                    # Parse the task ID from response (assuming JSON response)
                    try:
                        task_info = json.loads(task_response)
                        task_id = task_info.get("id", "unknown")

                        # For demo purposes, create a default user ID
                        # In production, this would come from user context/authentication
                        user_id = str(uuid.uuid4())

                        # Assign the task to user
                        assign_data = {
                            "task_id": task_id,
                            "user_id": user_id,
                            "squad_id": parameters.get("squad_id")
                        }

                        await self._make_api_request("POST", "/tasks/assign", assign_data)

                        function_response = f"Task '{parameters['task_name']}' created and assigned successfully."

                    except json.JSONDecodeError:
                        function_response = f"Task created but assignment may have failed. Response: {task_response}"

                except Exception as e:
                    function_response = f"Failed to assign task: {e}"

            elif tool_name == "report_progress":
                try:
                    progress_data = {
                        "metrics": parameters.get("metrics", {}),
                        "progress_text": parameters.get("progress_text", "")
                    }

                    if parameters.get("objective_id"):
                        response_text = await self._make_api_request(
                            "PATCH", 
                            f"/objectives/{parameters['objective_id']}/progress", 
                            progress_data
                        )
                    else:
                        # Find recent objectives if no specific ID provided
                        response_text = await self._make_api_request("GET", f"/objectives/recent?guild_id={parameters['guild_id']}")
                    
                    function_response = "Progress updated successfully."

                except Exception as e:
                    function_response = f"Failed to report progress: {e}"

            elif tool_name == "get_guild_status":
                try:
                    filter_type = parameters.get("filter_type", "all")
                    
                    if filter_type == "objectives":
                        response_text = await self._make_api_request("GET", f"/objectives?guild_id={parameters['guild_id']}")
                    elif filter_type == "tasks":
                        response_text = await self._make_api_request("GET", f"/tasks?guild_id={parameters['guild_id']}")
                    else:
                        # Get both objectives and tasks
                        objectives = await self._make_api_request("GET", f"/objectives?guild_id={parameters['guild_id']}")
                        tasks = await self._make_api_request("GET", f"/tasks?guild_id={parameters['guild_id']}")
                        function_response = f"Guild Status:\nObjectives: {objectives}\nTasks: {tasks}"

                except Exception as e:
                    function_response = f"Failed to get guild status: {e}"

            elif tool_name == "schedule_task":
                try:
                    schedule_data = {
                        "task_id": parameters["task_id"],
                        "schedule": parameters["schedule"]
                    }

                    response_text = await self._make_api_request(
                        "PATCH",
                        f"/tasks/{parameters['task_id']}/schedule",
                        schedule_data
                    )

                    function_response = f"Task scheduled successfully with schedule: {parameters['schedule']}"

                except Exception as e:
                    function_response = f"Failed to schedule task: {e}"

            elif tool_name == "get_my_tasks":
                try:
                    # Use default guild ID if not provided
                    guild_id = parameters.get("guild_id", self.default_guild_id)

                    # For now, get all tasks and filter by guild
                    # In a real implementation, this would filter by assigned user
                    response_text = await self._make_api_request("GET", f"/tasks?guild_id={guild_id}")

                    function_response = f"Your assigned tasks: {response_text}"

                except Exception as e:
                    function_response = f"Failed to get your tasks: {e}"

            elif tool_name == "switch_guild":
                try:
                    # First, get all guilds to find the one by name
                    guilds_response = await self._make_api_request("GET", "/admin/guilds")
                    try:
                        guilds = json.loads(guilds_response)
                        target_guild = None

                        # Find guild by name (case-insensitive)
                        for guild in guilds:
                            if guild.get("name", "").lower() == parameters["guild_name"].lower():
                                target_guild = guild
                                break

                        if not target_guild:
                            function_response = f"Guild '{parameters['guild_name']}' not found."
                        else:
                            # Switch to the found guild
                            switch_data = {
                                "guild_id": target_guild["id"]
                            }

                            response_text = await self._make_api_request(
                                "PATCH",
                                f"/users/{parameters['user_id']}/switch-guild",
                                switch_data
                            )

                            function_response = f"Successfully switched to guild '{target_guild['name']}'."

                    except json.JSONDecodeError:
                        function_response = f"Failed to parse guild list: {guilds_response}"

                except Exception as e:
                    function_response = f"Failed to switch guild: {e}"

            elif tool_name == "invite_to_guild":
                try:
                    # First, get all guilds to find the one by name
                    guilds_response = await self._make_api_request("GET", "/admin/guilds")
                    try:
                        guilds = json.loads(guilds_response)
                        target_guild = None

                        # Find guild by name (case-insensitive)
                        for guild in guilds:
                            if guild.get("name", "").lower() == parameters["guild_name"].lower():
                                target_guild = guild
                                break

                        if not target_guild:
                            function_response = f"Guild '{parameters['guild_name']}' not found."
                        else:
                            # Create invite for the found guild
                            invite_data = {
                                "guild_id": target_guild["id"],
                                "expires_at": None,  # Will be set by expires_hours
                                "uses_left": parameters.get("max_uses", 1)
                            }

                            # Set expiration if provided
                            if parameters.get("expires_hours"):
                                from datetime import datetime, timedelta
                                expires_at = datetime.utcnow() + timedelta(hours=int(parameters["expires_hours"]))
                                invite_data["expires_at"] = expires_at.isoformat()

                            response_text = await self._make_api_request("POST", "/invites", invite_data)

                            try:
                                invite_info = json.loads(response_text)
                                invite_code = invite_info.get("code", "unknown")
                                function_response = f"Invite created for guild '{target_guild['name']}'. Code: {invite_code}. Share this code with potential members."
                            except json.JSONDecodeError:
                                function_response = f"Invite created successfully. Response: {response_text}"

                    except json.JSONDecodeError:
                        function_response = f"Failed to parse guild list: {guilds_response}"

                except Exception as e:
                    function_response = f"Failed to create invite: {e}"

            elif tool_name == "join_guild":
                try:
                    join_data = {
                        "invite_code": parameters["invite_code"]
                    }

                    response_text = await self._make_api_request(
                        "POST",
                        f"/users/{parameters['user_id']}/join",
                        join_data
                    )

                    try:
                        join_info = json.loads(response_text)
                        guild_name = join_info.get("guild_name", "Unknown Guild")
                        function_response = f"Successfully joined guild '{guild_name}'."
                    except json.JSONDecodeError:
                        function_response = f"Successfully joined guild. Response: {response_text}"

                except Exception as e:
                    function_response = f"Failed to join guild: {e}"

            elif tool_name == "leave_guild":
                try:
                    # First, get all guilds to find the one by name
                    guilds_response = await self._make_api_request("GET", "/admin/guilds")
                    try:
                        guilds = json.loads(guilds_response)
                        target_guild = None

                        # Find guild by name (case-insensitive)
                        for guild in guilds:
                            if guild.get("name", "").lower() == parameters["guild_name"].lower():
                                target_guild = guild
                                break

                        if not target_guild:
                            function_response = f"Guild '{parameters['guild_name']}' not found."
                        else:
                            # Leave the found guild
                            leave_data = {
                                "guild_id": target_guild["id"]
                            }

                            response_text = await self._make_api_request(
                                "POST",
                                f"/users/{parameters['user_id']}/leave",
                                leave_data
                            )

                            try:
                                leave_info = json.loads(response_text)
                                new_guild_name = leave_info.get("guild_name", "Personal Guild")
                                function_response = f"Left guild '{target_guild['name']}' and switched to '{new_guild_name}'."
                            except json.JSONDecodeError:
                                function_response = f"Successfully left guild '{target_guild['name']}'."

                    except json.JSONDecodeError:
                        function_response = f"Failed to parse guild list: {guilds_response}"

                except Exception as e:
                    function_response = f"Failed to leave guild: {e}"

            if self.settings.debug_mode:
                await self.printr.print_async(
                    f"Response from SphereConnect {tool_name}: {function_response}",
                    color=LogType.INFO,
                )
            benchmark.finish_snapshot()

        return function_response, instant_response

    def _parse_metrics_from_text(self, text: str) -> Dict[str, Any]:
        """Parse resource metrics from natural language text."""
        import re
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

    def _infer_categories_from_text(self, text: str) -> list:
        """Infer objective categories from description text."""
        categories = []
        text_lower = text.lower()

        if any(word in text_lower for word in ['gold', 'platinum', 'quantum', 'scu', 'mining', 'trade', 'profit']):
            categories.append("Economy")
        if any(word in text_lower for word in ['patrol', 'defend', 'military', 'combat', 'attack']):
            categories.append("Military")
        if any(word in text_lower for word in ['explore', 'scan', 'survey', 'discover']):
            categories.append("Exploration")
        if any(word in text_lower for word in ['transport', 'cargo', 'delivery', 'shipping']):
            categories.append("Transport")

        return categories if categories else ["General"]