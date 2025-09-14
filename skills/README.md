# SphereConnect Wingman-AI Skills

## Overview

The `skills/` directory contains custom Wingman-AI skill implementations for voice-driven interaction with SphereConnect's Star Citizen guild coordination system. These skills enable seamless voice commands for managing guild operations (objectives, tasks, progress tracking) through Wingman-AI's STT → LLM → TTS pipeline.

The skills integrate with SphereConnect's FastAPI backend, allowing users to create objectives, assign tasks, report progress, and query guild status using natural language voice commands processed through Wingman-AI's advanced AI capabilities.

## Skill Structure

### 📁 api_request/ (Reference Implementation)
This is a copy of Wingman-AI's built-in `api_request` skill, serving as a reference for HTTP API integration patterns.

**Files:**
- **`main.py`**: Core skill implementation with async HTTP request handling
  - Implements `APIRequest` class extending Wingman-AI's `Skill` base
  - Handles GET/POST/PUT/PATCH/DELETE requests via aiohttp
  - Provides `send_api_request` and `get_api_key` functions for LLM function calling
  - Includes retry logic, timeout handling, and error management

- **`default_config.yaml`**: Skill configuration file
  - Defines skill metadata (name, description, author, tags)
  - Configures HTTP settings (timeouts, retries, headers)
  - Sets up custom properties for skill customization
  - Contains example prompts and usage instructions

- **`requirements.txt`**: Python dependencies
  - Lists all required packages (aiohttp, yarl, multidict, etc.)
  - Ensures consistent dependency versions across environments

- **`dependencies/`**: Installed Python packages
  - Contains all pip-installed dependencies for offline/portable operation
  - Allows the skill to run without requiring system-wide package installation

### 📁 sphereconnect/ (Custom SphereConnect Integration)
This is our custom-built skill specifically designed for Star Citizen guild coordination through SphereConnect's API.

**Files:**
- **`main.py`**: Custom SphereConnect skill implementation
  - Implements `SphereConnect` class extending Wingman-AI's `Skill` base
  - Provides 4 specialized functions: `create_objective`, `assign_task`, `report_progress`, `get_guild_status`
  - Includes natural language parsing for Star Citizen-specific metrics (SCU amounts, ship counts)
  - Features intelligent category inference (Economy, Military, Exploration, Transport)
  - Handles guild-specific operations with proper error handling and retries

- **`default_config.yaml`**: SphereConnect-specific configuration
  - Defines skill metadata for Star Citizen guild management
  - Configures SphereConnect API URL and connection settings
  - Sets up custom properties for API endpoints and timeouts
  - Contains UEE Commander-themed prompts and examples

- **`requirements.txt`**: Python dependencies (same as api_request)
  - Ensures compatibility with Wingman-AI's async HTTP framework
  - Lists all required packages for proper operation

- **`dependencies/`**: Installed Python packages
  - Contains all necessary dependencies for the skill
  - Enables portable deployment without external dependencies

- **`ConnectSphere.yaml`**: Wingman-AI configuration template
  - Sample configuration for creating a Wingman-AI wingman using this skill
  - Includes system prompts, voice settings, and skill activation

- **`SPHERECONNECT_SKILL_README.md`**: Detailed skill documentation
  - Comprehensive guide for the SphereConnect skill
  - Usage examples, configuration options, and troubleshooting

## Installation in Wingman-AI

### Step 1: Obtain Wingman-AI
```bash
# Clone the Wingman-AI repository
git clone https://github.com/ShipBit/wingman-ai.git
cd wingman-ai

# Or download the Windows binary from the releases page
# https://github.com/ShipBit/wingman-ai/releases
```

### Step 2: Copy Skill Files
Choose one of the skills to install:

**Option A: Use the api_request skill (recommended for testing)**
```bash
# Copy the api_request skill to Wingman-AI
cp -r /path/to/sphereconnect/skills/api_request ./skills/
```

**Option B: Use the custom sphereconnect skill**
```bash
# Copy the sphereconnect skill to Wingman-AI
cp -r /path/to/sphereconnect/skills/sphereconnect ./skills/
```

### Step 3: Install Dependencies
```bash
# Navigate to the skill directory in Wingman-AI
cd skills/api_request  # or cd skills/sphereconnect

# Install Python dependencies
pip install -r requirements.txt

# Or install to local dependencies folder (recommended for portability)
pip install -r requirements.txt --target dependencies
```

### Step 4: Configure Wingman-AI
Create or modify a wingman configuration file in Wingman-AI's config directory:

**For api_request skill:**
```yaml
# config/_Star Citizen.yaml
name: "UEE Commander"
display_name: "UEE Commander"
description: "Star Citizen Guild Coordination Officer"

system_prompt: |
  You are the UEE Commander, coordinating guild operations through API calls.
  Use the available functions to manage objectives, tasks, and progress.

user_prompt: |
  Coordinate guild missions efficiently using the API functions available.

skills:
  - name: APIRequest
    enabled: true

# ... voice, llm, and other configurations
```

**For sphereconnect skill:**
```yaml
# config/_Star Citizen.yaml
name: "UEE Commander"
display_name: "UEE Commander"
description: "Star Citizen Guild Coordination Officer"

system_prompt: |
  You are the UEE Commander, a seasoned military officer coordinating Star Citizen guild operations.
  You manage mission objectives, task assignments, and resource coordination through voice commands.
  Always respond in character with military formality and strategic insight.

user_prompt: |
  Coordinate guild missions efficiently and maintain operational security.
  Parse voice commands for mission details and use SphereConnect tools appropriately.

skills:
  - name: SphereConnect
    enabled: true

voice:
  tts_provider: elevenlabs
  stt_provider: whisper

llm:
  provider: openai
  model: gpt-4

# ... other configurations
```

### Step 5: Start SphereConnect API
```bash
# In your SphereConnect project directory
cd /path/to/sphereconnect

# Start the FastAPI server
python app/main.py

# Or use the Flask alternative
python app/flask_api.py

# Ensure database is set up
python scripts/db_init.py
python scripts/test_data.py
```

### Step 6: Launch Wingman-AI
```bash
# In Wingman-AI directory
python wingman_core.py
```

## Voice Command Examples

### With sphereconnect skill:
- **"Create objective: Collect 500 SCU Gold"**
- **"Assign task Scout Route to Commander Reyes"**
- **"Delivered 200 SCU Platinum, progress update"**
- **"What's the current guild status?"**
- **"Schedule mining operation for 30 minutes from now"**

### With api_request skill:
- **"Send a POST request to create objective"**
- **"Make an API call to assign task"**
- **"Get current objectives from the API"**

## Configuration Options

### Custom Properties (sphereconnect skill)
- **`sphereconnect_url`**: Base URL for SphereConnect API (default: http://localhost:8000/api)
- **`request_timeout`**: API request timeout in seconds (default: 10)
- **`max_retries`**: Maximum retry attempts for failed requests (default: 3)
- **`retry_delay`**: Delay between retry attempts in seconds (default: 2)

### Custom Properties (api_request skill)
- **`use_default_headers`**: Include default security headers (default: true)
- **`max_retries`**: Maximum retry attempts (default: 1)
- **`request_timeout`**: Request timeout in seconds (default: 10)
- **`retry_delay`**: Delay between retries in seconds (default: 5)

## Troubleshooting

### Common Issues:
1. **Import Errors**: Ensure all dependencies are installed
2. **API Connection Failed**: Check SphereConnect server is running on correct port
3. **Skill Not Loading**: Verify skill files are in correct Wingman-AI skills directory
4. **Voice Commands Not Working**: Check Wingman-AI configuration and API keys

### Debug Mode:
Enable debug logging in Wingman-AI to see detailed skill execution logs:
```yaml
# In wingman config
settings:
  debug_mode: true
```

## Development Notes

- Both skills follow Wingman-AI's skill development patterns
- The `sphereconnect` skill is specifically tailored for Star Citizen guild operations
- The `api_request` skill provides a more generic API interaction framework
- Dependencies are isolated per skill to prevent version conflicts
- Skills can be easily extended or modified for additional functionality

## File Organization Best Practices