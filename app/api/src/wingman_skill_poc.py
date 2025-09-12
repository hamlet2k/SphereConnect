# Update previous artifact to handle structured descriptions
import requests
import json

def handle_voice_command(command_text, user_id):
    base_url = "http://localhost:5000/api"  # Replace with Lambda
    headers = {"Authorization": f"Bearer {user_id}"}
    intent, params = parse_intent(command_text)

    # Fetch AI Commander persona for guild
    commander = requests.get(f"{base_url}/ai_commanders/{params['guild_id']}", headers=headers).json()
    system_prompt = commander.get("system_prompt", "Act as a UEE Commander...")

    if intent == "schedule_task":
        schedule = parse_schedule(params.get("schedule_text"))
        payload = {"schedule": schedule}
        response = requests.patch(f"{base_url}/tasks/{params['task_id']}", json=payload, headers=headers)
        return tts_response(f"Task scheduled: {schedule}")
    
    elif intent == "create_objective":
        payload = {
            "name": params.get("name"),
            "description": {
                "brief": params.get("description"),
                "tactical": "",
                "classified": "",
                "metrics": params.get("metrics", {})
            },
            "categories": ["Economy"],
            "priority": "Medium",
            "applicable_rank": "Recruit"
        }
        response = requests.post(f"{base_url}/objectives", json=payload, headers=headers)
        return tts_response(f"Objective created: {payload['name']}", system_prompt)
    
    elif intent == "update_tactical":
        payload = {"description": {"tactical": params.get("tactical")}}
        response = requests.patch(f"{base_url}/objectives/{params['objective_id']}", json=payload, headers=headers)
        return tts_response("Tactical section updated")
    
    elif intent == "report_progress":
        metrics = parse_metrics(params.get("report"))
        payload = {"description": {"metrics": metrics}}
        response = requests.patch(f"{base_url}/objectives/{params['objective_id']}", json=payload, headers=headers)
        return tts_response(f"Progress updated: {metrics}")
    
    return tts_response("Not a ConnectSphere command, executing in-game action")

def parse_schedule(schedule_text):
    schedule = {"flexible": True, "timezone": "UTC"}
    if "for 20 minutes from now" in schedule_text.lower():
        start = datetime.utcnow() + timedelta(minutes=5)
        schedule["start"] = start.isoformat()
        schedule["duration"] = "20m"
    elif "friday night" in schedule_text.lower():
        schedule["start"] = "2025-09-13T20:00:00Z"
        schedule["end"] = "2025-09-13T23:00:00Z"
        schedule["flexible"] = True
    return schedule

def parse_intent(command_text):
    if "create objective" in command_text.lower():
        return "create_objective", {"name": "Collect Resources", "description": command_text, "metrics": {"gold_scu": 0}, "guild_id": "guild_1"}
    elif "update tactical" in command_text.lower():
        return "update_tactical", {"objective_id": "obj_1", "tactical": command_text}
    elif "delivered" in command_text.lower():
        return "report_progress", {"objective_id": "obj_1", "report": command_text}
    return None, {}

def parse_metrics(report_text):
    metrics = {}
    if "gold" in report_text.lower():
        metrics["gold_scu"] = 100  # Mock parsing
    return metrics

def tts_response(text, system_prompt):
    return {"response": text, "tts": True, "prompt": system_prompt}