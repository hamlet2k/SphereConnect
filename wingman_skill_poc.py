import requests
import json

# Mock Wingman-AI skill integration (assumes Wingman-AI exposes a skill API)
def handle_voice_command(command_text, user_id):
    """
    Process voice command via Wingman-AI's STT/LLM, map to ConnectSphere API.
    """
    # Mock LLM intent detection (replace with Wingman-AI's actual LLM)
    intent, params = parse_intent(command_text)
    
    base_url = "http://localhost:5000/api"  # Replace with Lambda endpoint
    headers = {"Authorization": f"Bearer {user_id}"}
    
    if intent == "create_objective":
        payload = {
            "name": params.get("name"),
            "description": params.get("description"),
            "categories": ["Economy"],  # Default for PoC
            "priority": "Medium",
            "applicable_rank": "Recruit",  # Default
            "progress": {"gold_scu": 0, "aluminum_scu": 0}  # AI-parsed metrics
        }
        response = requests.post(f"{base_url}/objectives", json=payload, headers=headers)
        return tts_response(f"Objective created: {payload['name']}")
    
    elif intent == "assign_task":
        payload = {
            "task_id": params.get("task_id"),
            "user_id": params.get("target_user"),
            "squad_id": params.get("squad_id", None)  # Auto ad-hoc if None
        }
        response = requests.post(f"{base_url}/tasks/assign", json=payload, headers=headers)
        return tts_response(f"Task assigned to {params.get('target_user')}")
    
    elif intent == "report_progress":
        metrics = parse_metrics(params.get("report"))  # e.g., "100 SCU Gold" → {"gold_scu": 100}
        payload = {"objective_id": params.get("objective_id"), "progress": metrics}
        response = requests.patch(f"{base_url}/objectives/progress", json=payload, headers=headers)
        return tts_response(f"Progress updated: {metrics}")
    
    # Fallback to Wingman-AI defaults
    return tts_response("Not a ConnectSphere command, executing in-game action")

def parse_intent(command_text):
    """
    Mock LLM parsing (replace with Wingman-AI LLM call).
    """
    # Example: "Create objective: Collect 500 SCU Gold" → intent, params
    if "create objective" in command_text.lower():
        return "create_objective", {"name": "Collect Resources", "description": command_text}
    elif "assign task" in command_text.lower():
        return "assign_task", {"task_id": "task_1", "target_user": "Pilot_X"}
    elif "delivered" in command_text.lower():
        return "report_progress", {"objective_id": "obj_1", "report": command_text}
    return None, {}

def parse_metrics(report_text):
    """
    Parse SCU metrics from voice (mock; use LLM like Hugging Face).
    """
    # Example: "Delivered 100 SCU Gold" → {"gold_scu": 100}
    metrics = {}
    if "gold" in report_text.lower():
        metrics["gold_scu"] = 100  # Mock parsing
    if "aluminum" in report_text.lower():
        metrics["aluminum_scu"] = 100
    return metrics

def tts_response(text):
    """
    Mock TTS output (replace with Wingman-AI TTS call).
    """
    return {"response": text, "tts": True}