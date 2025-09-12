# Copyright 2025 [Your Legal Name]. All Rights Reserved.
# Confidential - Do Not Distribute Without Permission.

# Flask API implementation for ConnectSphere
# Alternative to FastAPI for environments that prefer Flask

from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import uuid
from datetime import datetime, timedelta
import re
from sqlalchemy.orm import sessionmaker
from .core.models import (
    Objective, Task, Guild, Squad, AICommander, User,
    ENGINE, Base, create_tables
)

app = Flask(__name__)
CORS(app)

# Database setup
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=ENGINE)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Helper functions (same as FastAPI version)
def parse_metrics_from_text(text: str):
    """Parse metrics from voice command text"""
    metrics = {}

    # Parse SCU amounts
    scu_match = re.search(r'(\d+)\s*SCU\s*([a-zA-Z]+)', text, re.IGNORECASE)
    if scu_match:
        amount = int(scu_match.group(1))
        resource_type = scu_match.group(2).lower()
        metrics[f"{resource_type}_scu"] = amount

    # Parse generic numbers with units
    generic_match = re.search(r'(\d+)\s*([a-zA-Z]+)', text, re.IGNORECASE)
    if generic_match and not scu_match:  # Avoid duplicate parsing
        amount = int(generic_match.group(1))
        unit = generic_match.group(2).lower()
        metrics[unit] = amount

    return metrics

def parse_schedule_from_text(text: str):
    """Parse schedule information from voice command text"""
    schedule = {"flexible": True, "timezone": "UTC"}
    if "for 20 minutes from now" in text.lower():
        start = datetime.utcnow() + timedelta(minutes=20)
        schedule["start"] = start.isoformat()
        schedule["duration"] = "20m"
        schedule["flexible"] = False
    elif "now" in text.lower():
        schedule["start"] = datetime.utcnow().isoformat()
        schedule["flexible"] = False
    return schedule

def create_adhoc_squad(db, guild_id: str, user_id: str):
    """Create an ad-hoc squad if none exists"""
    existing_squad = db.query(Squad).filter(
        Squad.guild_id == uuid.UUID(guild_id),
        Squad.lead_id == uuid.UUID(user_id)
    ).first()

    if existing_squad:
        return str(existing_squad.id)

    squad = Squad(
        id=uuid.uuid4(),
        guild_id=uuid.UUID(guild_id),
        name=f"Ad-hoc Squad - {datetime.utcnow().strftime('%Y%m%d_%H%M%S')}",
        lead_id=uuid.UUID(user_id)
    )
    db.add(squad)
    db.commit()
    return str(squad.id)

# Flask Routes
@app.route('/api/objectives', methods=['POST'])
def create_objective():
    """Create a new objective"""
    db = next(get_db())
    try:
        data = request.get_json()

        obj_id = uuid.uuid4()
        guild_uuid = uuid.UUID(data['guild_id'])

        # Create ad-hoc squad if not provided
        squad_id = data.get('squad_id')
        if not squad_id:
            squad_id = create_adhoc_squad(db, data['guild_id'], str(uuid.uuid4()))

        new_objective = Objective(
            id=obj_id,
            guild_id=guild_uuid,
            name=data['name'],
            description=data.get('description', {"brief": "", "tactical": "", "classified": "", "metrics": {}}),
            categories=data.get('categories', []),
            priority=data.get('priority', 'Medium'),
            applicable_rank=data.get('applicable_rank', 'Recruit'),
            squad_id=uuid.UUID(squad_id) if squad_id else None
        )

        db.add(new_objective)
        db.commit()

        return jsonify({
            "id": str(obj_id),
            "message": f"Objective '{data['name']}' created successfully",
            "tts_response": f"Objective created: {data['name']}"
        })
    except Exception as e:
        db.rollback()
        return jsonify({"error": f"Failed to create objective: {str(e)}"}), 500
    finally:
        db.close()

@app.route('/api/objectives/<objective_id>', methods=['GET'])
def get_objective(objective_id):
    """Get objective details"""
    db = next(get_db())
    try:
        obj_uuid = uuid.UUID(objective_id)
        objective = db.query(Objective).filter(Objective.id == obj_uuid).first()

        if not objective:
            return jsonify({"error": "Objective not found"}), 404

        return jsonify({
            "id": str(objective.id),
            "name": objective.name,
            "description": objective.description,
            "categories": objective.categories,
            "priority": objective.priority,
            "progress": objective.progress,
            "tasks": objective.tasks
        })
    except ValueError:
        return jsonify({"error": "Invalid objective ID format"}), 400
    finally:
        db.close()

@app.route('/api/objectives/<objective_id>', methods=['PATCH'])
def update_objective(objective_id):
    """Update objective progress or description"""
    db = next(get_db())
    try:
        obj_uuid = uuid.UUID(objective_id)
        objective = db.query(Objective).filter(Objective.id == obj_uuid).first()

        if not objective:
            return jsonify({"error": "Objective not found"}), 404

        data = request.get_json()

        if 'description' in data:
            current_desc = objective.description or {}
            current_desc.update(data['description'])
            objective.description = current_desc

        if 'progress' in data:
            current_progress = objective.progress or {}
            current_progress.update(data['progress'])
            objective.progress = current_progress

        if 'categories' in data:
            objective.categories = data['categories']

        if 'priority' in data:
            objective.priority = data['priority']

        db.commit()

        return jsonify({
            "message": "Objective updated successfully",
            "tts_response": "Objective updated"
        })
    except ValueError:
        return jsonify({"error": "Invalid objective ID format"}), 400
    except Exception as e:
        db.rollback()
        return jsonify({"error": f"Failed to update objective: {str(e)}"}), 500
    finally:
        db.close()

@app.route('/api/objectives/<objective_id>/progress', methods=['PATCH'])
def update_objective_progress(objective_id):
    """Update objective progress with parsed metrics"""
    db = next(get_db())
    try:
        obj_uuid = uuid.UUID(objective_id)
        objective = db.query(Objective).filter(Objective.id == obj_uuid).first()

        if not objective:
            return jsonify({"error": "Objective not found"}), 404

        data = request.get_json()
        metrics = data.get('metrics', {})

        # Update metrics in description
        current_desc = objective.description or {}
        current_metrics = current_desc.get("metrics", {})
        current_metrics.update(metrics)
        current_desc["metrics"] = current_metrics
        objective.description = current_desc

        # Update progress tracking
        current_progress = objective.progress or {}
        current_progress.update(metrics)
        objective.progress = current_progress

        db.commit()

        return jsonify({
            "message": "Progress updated successfully",
            "tts_response": f"Progress updated: {metrics}"
        })
    except ValueError:
        return jsonify({"error": "Invalid objective ID format"}), 400
    except Exception as e:
        db.rollback()
        return jsonify({"error": f"Failed to update progress: {str(e)}"}), 500
    finally:
        db.close()

@app.route('/api/tasks', methods=['POST'])
def create_task():
    """Create a new task"""
    db = next(get_db())
    try:
        data = request.get_json()

        task_id = uuid.uuid4()
        objective_uuid = uuid.UUID(data['objective_id'])
        guild_uuid = uuid.UUID(data['guild_id'])

        # Create ad-hoc squad if not provided
        squad_id = data.get('squad_id')
        if not squad_id:
            squad_id = create_adhoc_squad(db, data['guild_id'], str(uuid.uuid4()))

        new_task = Task(
            id=task_id,
            objective_id=objective_uuid,
            guild_id=guild_uuid,
            name=data['name'],
            description=data.get('description'),
            priority=data.get('priority', 'Medium'),
            squad_id=uuid.UUID(squad_id) if squad_id else None
        )

        db.add(new_task)
        db.commit()

        return jsonify({
            "id": str(task_id),
            "message": f"Task '{data['name']}' created successfully",
            "tts_response": f"Task created: {data['name']}"
        })
    except Exception as e:
        db.rollback()
        return jsonify({"error": f"Failed to create task: {str(e)}"}), 500
    finally:
        db.close()

@app.route('/api/tasks/assign', methods=['POST'])
def assign_task():
    """Assign task to user/squad"""
    db = next(get_db())
    try:
        data = request.get_json()

        task_uuid = uuid.UUID(data['task_id'])
        user_uuid = uuid.UUID(data['user_id'])

        task = db.query(Task).filter(Task.id == task_uuid).first()
        if not task:
            return jsonify({"error": "Task not found"}), 404

        task.lead_id = user_uuid
        if 'squad_id' in data:
            task.squad_id = uuid.UUID(data['squad_id'])

        db.commit()

        return jsonify({
            "message": "Task assigned successfully",
            "tts_response": "Task assignment confirmed"
        })
    except ValueError:
        return jsonify({"error": "Invalid ID format"}), 400
    except Exception as e:
        db.rollback()
        return jsonify({"error": f"Failed to assign task: {str(e)}"}), 500
    finally:
        db.close()

@app.route('/api/tasks/<task_id>/schedule', methods=['PATCH'])
def schedule_task(task_id):
    """Schedule a task"""
    db = next(get_db())
    try:
        task_uuid = uuid.UUID(task_id)
        task = db.query(Task).filter(Task.id == task_uuid).first()

        if not task:
            return jsonify({"error": "Task not found"}), 404

        data = request.get_json()
        task.schedule = data.get('schedule', {})

        db.commit()

        return jsonify({
            "message": "Task scheduled successfully",
            "tts_response": f"Task scheduled: {data.get('schedule', {})}"
        })
    except ValueError:
        return jsonify({"error": "Invalid task ID format"}), 400
    except Exception as e:
        db.rollback()
        return jsonify({"error": f"Failed to schedule task: {str(e)}"}), 500
    finally:
        db.close()

@app.route('/api/guilds/<guild_id>/ai_commanders', methods=['GET'])
def get_ai_commander(guild_id):
    """Get AI Commander for guild"""
    db = next(get_db())
    try:
        guild_uuid = uuid.UUID(guild_id)
        commander = db.query(AICommander).filter(AICommander.guild_id == guild_uuid).first()

        if not commander:
            commander = AICommander(
                id=uuid.uuid4(),
                guild_id=guild_uuid,
                name="UEE Commander",
                system_prompt="Act as a UEE Commander, coordinating Star Citizen guild missions with formal, strategic responses."
            )
            db.add(commander)
            db.commit()

        return jsonify({
            "id": str(commander.id),
            "name": commander.name,
            "system_prompt": commander.system_prompt,
            "phonetic": commander.phonetic
        })
    except ValueError:
        return jsonify({"error": "Invalid guild ID format"}), 400
    finally:
        db.close()

@app.route('/api/voice_command', methods=['POST'])
def handle_voice_command():
    """Endpoint for Wingman-AI voice commands"""
    from .api.src.wingman_skill_poc import WingmanSkill

    data = request.get_json()
    command_text = data.get('command', '')
    user_id = data.get('user_id', 'demo_user')

    skill = WingmanSkill()
    result = skill.handle_voice_command(command_text, user_id)

    return jsonify(result)

if __name__ == '__main__':
    # Create tables on startup
    create_tables()
    app.run(debug=True, host='0.0.0.0', port=5000)
