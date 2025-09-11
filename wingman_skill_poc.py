# Update previous artifact to handle structured descriptions
import requests
import json

def handle_voice_command(command_text, user_id):
    base_url = "http://localhost:5000/api"  # Replace with Lambda
    headers = {"Authorization": f"Bearer {user_id}"}
    intent, params = parse_intent(command_text)
    
    if intent == "create_objective":
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
        return tts_response(f"Objective created: {payload['name']}")
    
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

def parse_intent(command_text):
    if "create objective" in command_text.lower():
        return "create_objective", {"name": "Collect Resources", "description": command_text, "metrics": {"gold_scu": 0}}
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

def tts_response(text):
    return {"response": text, "tts": True}