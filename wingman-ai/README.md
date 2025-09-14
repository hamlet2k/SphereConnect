# Wingman AI Integration Folder

This folder (`wingman-ai/`) contains all external files and configurations related to the Wingman AI project (version 1.8.1), specifically tailored for integration with the SphereConnect Star Citizen guild coordination system. **Important:** File structures for older versions of Wingman AI may differ significantly, so ensure compatibility with version 1.8.1.

## Overview

Wingman AI is a standalone voice-driven AI framework that handles Speech-to-Text (STT) and Text-to-Speech (TTS) processing. It processes user voice commands, generates API calls to SphereConnect's FastAPI backend, receives responses, and constructs TTS messages back to the user. This integration enables seamless voice control for guild operations such as creating objectives, assigning tasks, reporting progress, and querying guild status.

### Integration Flow
1. **User Speech Input**: Wingman AI captures and transcribes voice commands via STT.
2. **AI Processing**: The LLM processes the transcript and determines appropriate actions.
3. **API Calls**: Wingman AI sends HTTP requests to SphereConnect APIs (e.g., `POST /api/objectives`).
4. **Response Handling**: SphereConnect returns data (e.g., objective details, task assignments).
5. **TTS Output**: Wingman AI constructs and speaks responses back to the user.

**Note:** STT and TTS are handled entirely by the standalone Wingman AI installation on the client's computer. SphereConnect does not manage audio processing. Refer to `docs/MVP_Spec_StarCitizen.md` for the full project scope. The file `app/api/src/wingman_skill_poc.py` is not used in this integration.

## Folder Structure

### 📁 configs/
Contains Wingman AI configuration files for different scenarios and wingmen. Configurations are YAML-based and must follow strict formatting rules (e.g., proper indentation, value escaping).

- **`_SphereConnect/`**: Custom configuration for SphereConnect integration.
  - **`UEE Commander.yaml`**: Main wingman configuration for Star Citizen guild coordination. Defines system prompts, skills, voice settings, and LLM providers. Includes UEE Commander-themed prompts for military formality.
  - **`UEE Commander.png`**: Avatar image for the wingman.
  - **`SphereConnect.last-message.txt`**: Stores the last processed message for continuity.

- **`Star Citizen/`**: Reference configurations (for examples only, not used in this project).
  - **`ATC.yaml`**: Air Traffic Control wingman example.
  - **`Computer.yaml`**: General computer control wingman example.
  - **`ATC.png`** and **`Computer.png`**: Corresponding avatar images.

**YAML Formatting Notes:** 
- Escape special characters in strings (e.g., use `"` for quotes, `\\` for backslashes).
- No German (`de:`) translations are included.
- Follow examples from reference configs for consistency.

### 📁 skills/
Contains custom Python skills that extend Wingman AI's functionality. Skills are loaded as plugins and can define LLM functions for API interactions.

- **`api_request/`**: Reference skill (for examples only, not used in this project). Demonstrates generic HTTP API request handling.
  - **`main.py`**: Core skill implementation using `APIRequest` class.
  - **`default_config.yaml`**: Skill metadata, HTTP settings, and examples.
  - **`requirements.txt`**: Python dependencies (e.g., aiohttp).
  - **`dependencies/`**: Pre-installed packages for portability.
  - **`logo.png`**: Skill icon.

- **`sphereconnect/`**: Custom skill for SphereConnect integration.
  - **`main.py`**: Implements `SphereConnect` class with functions like `create_objective`, `assign_task`, `report_progress`, `get_guild_status`. Handles Star Citizen-specific parsing (e.g., SCU amounts, ship counts) and category inference (Economy, Military, Exploration, Transport).
  - **`default_config.yaml`**: SphereConnect-specific settings, including API URL (`http://localhost:8000/api`), timeouts, and custom properties.
  - **`requirements.txt`**: Dependencies (same as api_request for compatibility).
  - **`dependencies/`**: Pre-installed packages.
  - **`logo.png`**: Skill icon.

**Development Notes:** Skills extend Wingman AI's `Skill` base class. Use async HTTP via aiohttp for API calls. Ensure error handling, retries, and timeout management.

## Installation and Setup

1. **Obtain Wingman AI**: Download version 1.8.1 from the [official repository](https://github.com/ShipBit/wingman-ai/releases). Install as a standalone application on the client's computer.

2. **Copy Files**: 
   - Copy `skills/sphereconnect/` to Wingman AI's `skills/` directory.
   - Copy `configs/_SphereConnect/` to Wingman AI's `config/` directory.
   - Usually located at %appdata%/ShipBit/Wingman AI/

3. **Install Dependencies**: In Wingman AI's skill directory, run `pip install -r requirements.txt`.

4. **Configure Wingman**: Edit `UEE Commander.yaml` to set:
   - SphereConnect API URL (default: `http://localhost:8000/api`).
   - LLM provider (e.g., OpenAI GPT-4).
   - Voice settings (e.g., ElevenLabs for TTS).
   - Enable the `SphereConnect` skill.

5. **Start Services**:
   - Launch Wingman AI Core.
   - Ensure SphereConnect API is running (e.g., via `python app/main.py`).

## Usage Examples

- **Voice Commands**:
  - "Create objective: Collect 500 SCU Gold"
  - "Assign task Scout Route to Commander Reyes"
  - "Delivered 200 SCU Platinum, progress update"
  - "What's the current guild status?"

- **Configuration Customization**:
  - Adjust `sphereconnect_url` in `default_config.yaml` for different API endpoints.
  - Modify system prompts in `UEE Commander.yaml` for custom behavior.

## Troubleshooting

- **API Connection Issues**: Verify SphereConnect server is running on the correct port.
- **Skill Loading Errors**: Check file paths and YAML syntax.
- **Voice Recognition Problems**: Ensure Wingman AI's STT provider is configured correctly.
- **Debug Mode**: Enable in Wingman AI config for detailed logs.

## References

- [Wingman AI GitHub](https://github.com/ShipBit/wingman-ai): Official repository for version 1.8.1.
- `docs/MVP_Spec_StarCitizen.md`: Project scope and requirements.
- Reference skills and configs in `api_request/` and `Star Citizen/` for formatting examples.

This integration enables voice-driven guild management in Star Citizen, bridging Wingman AI's AI capabilities with SphereConnect's backend services. All configurations follow Wingman AI's standards for portability and extensibility.