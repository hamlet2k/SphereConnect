# Voice Commands Guide

This comprehensive guide covers all voice commands available in SphereConnect's Wingman-AI integration.

## Command Structure

Voice commands follow natural language patterns. The AI Commander will:
- Parse your intent from spoken words
- Extract relevant parameters
- Execute the requested action
- Provide audio confirmation

## Basic Commands

### Authentication
```
"UEE Commander, authenticate with PIN [6-digit code]"
```
- Verifies your identity for voice operations
- Required before sensitive operations
- PIN is your 6-digit voice access code

### Status Queries
```
"What objectives are available?"
"What objectives are available for my rank?"
"What tasks are assigned to me?"
"What's my current status?"
"What is my squad assignment?"
```

## Objective Management

### Creating Objectives
```
"Create objective: [objective name]"
"Create objective: [name] for [category]"
"Create objective: [name] with priority [high/medium/low]"
```

**Examples:**
- "Create objective: Secure the trade route to Port Olisar"
- "Create objective: Mine 1000 SCU Quantanium in Crusader"
- "Create objective: Escort mining convoy with priority high"

### Updating Objectives
```
"Update objective: [objective name] add brief [description]"
"Update objective: [objective name] add tactical [details]"
"Update objective: [objective name] add classified [sensitive info]"
"Update objective: [objective name] set priority [level]"
"Update objective: [objective name] set category [type]"
```

**Examples:**
- "Update objective: Trade Route Security add brief Protect merchant vessels"
- "Update objective: Mining Operation add tactical Use the Orion for escort"
- "Update objective: Classified Mission add classified Coordinates: 042-051"

### Objective Queries
```
"Show me objective: [objective name]"
"What is the status of objective: [objective name]?"
"What objectives are in category: [category]?"
"What objectives have priority: [level]?"
```

## Task Management

### Creating Tasks
```
"Create task: [task name] for objective: [objective name]"
"Assign task: [task name] to [user name]"
"Schedule task: [task name] for [time] [unit] now"
"Schedule task: [task name] for [time] [unit] from now"
```

**Time Units:** minutes, hours, days
**Examples:**
- "Create task: Scout the route for objective: Trade Route Security"
- "Assign task: Mining Run to Johnson"
- "Schedule task: Escort Duty for 30 minutes now"
- "Schedule task: Patrol Route for 2 hours from now"

### Task Updates
```
"Update task: [task name] set status [status]"
"Mark task: [task name] as completed"
"Mark task: [task name] as in progress"
"Update task: [task name] add progress [description]"
```

**Status Options:** pending, in progress, completed, cancelled
**Examples:**
- "Update task: Scout Route set status in progress"
- "Mark task: Mining Run as completed"
- "Update task: Escort Duty add progress 50% complete"

### Task Queries
```
"What tasks are assigned to me?"
"What tasks are for objective: [objective name]?"
"What is the status of task: [task name]?"
"What tasks are due today?"
"What tasks are overdue?"
```

## Progress Reporting

### Resource Delivery
```
"Delivered [quantity] [resource] [type]"
"Completed delivery of [quantity] [resource] [type]"
"Delivered [quantity] SCU of [resource]"
```

**Examples:**
- "Delivered 500 SCU Gold"
- "Completed delivery of 100 SCU Quantanium"
- "Delivered 250 SCU of Agricultural Supplies"

### Mission Progress
```
"Completed [task/objective name]"
"Progress on [task/objective name]: [percentage]% complete"
"Update progress: [description]"
```

**Examples:**
- "Completed Scout Route task"
- "Progress on Mining Operation: 75% complete"
- "Update progress: Located rich Quantanium deposit"

## Squad Management

### Squad Creation
```
"Create squad: [squad name]"
"Create squad: [squad name] with lead [user name]"
"Form ad-hoc squad for [objective/task name]"
```

**Examples:**
- "Create squad: Mining Team Alpha"
- "Create squad: Escort Squadron with lead Johnson"
- "Form ad-hoc squad for Trade Route Security"

### Squad Assignment
```
"Assign [user name] to squad: [squad name]"
"Add me to squad: [squad name]"
"Remove [user name] from squad: [squad name]"
"Set squad lead to [user name]"
```

**Examples:**
- "Assign Martinez to squad: Mining Team Alpha"
- "Add me to squad: Escort Squadron"
- "Set squad lead to Commander Smith"

### Squad Queries
```
"What is my squad?"
"Who is in squad: [squad name]?"
"What squads are available?"
"What is the squad lead for [squad name]?"
```

## User Management (Admin Only)

### Rank Management
```
"Promote [user name] to [rank name]"
"Demote [user name] to [rank name]"
"Set rank of [user name] to [rank name]"
```

**Examples:**
- "Promote Johnson to NCO"
- "Demote Martinez to Recruit"
- "Set rank of Smith to Officer"

### User Status
```
"Set availability of [user name] to [status]"
"[User name] is now [status]"
"Mark [user name] as available"
"Mark [user name] as unavailable"
```

**Status Options:** available, busy, offline, in-game
**Examples:**
- "Set availability of Johnson to busy"
- "Johnson is now in-game"
- "Mark Martinez as available"

## Administrative Commands (Officer+)

### System Queries
```
"How many users are online?"
"What is the server status?"
"Show system health"
"List all active objectives"
"List all active tasks"
```

### Emergency Commands
```
"Emergency broadcast: [message]"
"Cancel all objectives"
"Stand down all operations"
"Emergency evacuation protocol"
```

## Advanced Commands

### Complex Objectives
```
"Create objective: [name] with tasks [task1, task2, task3]"
"Create objective: [name] for squad [squad name] with deadline [time]"
"Create objective: [name] requiring [skill1, skill2]"
```

### Batch Operations
```
"Assign all mining tasks to Mining Squad"
"Complete all tasks for objective: [name]"
"Schedule all Escort tasks for next hour"
```

### Conditional Commands
```
"If [condition] then [action]"
"Create objective only if no similar exists"
"Assign task only if user is available"
```

## Command Best Practices

### Speaking Clearly
- Use full, complete sentences
- Speak at normal volume and pace
- Minimize background noise
- Use phonetic pronunciations consistently

### Command Formatting
- Start with "UEE Commander" for attention
- Use natural language patterns
- Include specific names and quantities
- End commands with clear termination

### Error Handling
- Listen for confirmation responses
- Retry failed commands with simpler language
- Use web interface as backup for complex operations
- Report persistent issues to administrators

## Voice Recognition Tips

### Name Pronunciation
- Set your phonetic name in profile settings
- Use consistent nicknames
- Avoid similar-sounding names in commands

### Number Recognition
- Speak numbers clearly: "one two three" vs "123"
- Use "SCU" distinctly from numbers
- Confirm large quantities in web interface

### Command Chaining
- Execute one command at a time
- Wait for confirmation before next command
- Use web interface for batch operations

## Troubleshooting Voice Commands

### Common Issues

**Command Not Recognized**
- Check microphone setup
- Verify Wingman-AI is active
- Try simpler command structure
- Check command syntax in this guide

**Wrong User Identified**
- Update phonetic name in profile
- Use full names in commands
- Avoid similar names in squad

**Permission Denied**
- Verify your rank level
- Check objective access restrictions
- Contact administrator for permissions

**No Response**
- Check Wingman-AI logs
- Verify API connectivity
- Restart voice skill
- Use web interface fallback

### Performance Optimization
- Use wired microphone for better quality
- Close background applications
- Update audio drivers
- Test in quiet environment

## Integration with Game

### In-Game Usage
- Use PTT (Push-To-Talk) for commands
- Coordinate with squad voice channels
- Keep commands brief during combat
- Use text chat for complex coordination

### Cross-Platform Coordination
- Web interface for detailed planning
- Voice commands for real-time updates
- Mobile access for on-the-go management
- Discord integration for additional communication

## Customization

### Personal Commands
Work with your guild administrator to add custom voice commands for specific workflows.

### Guild-Specific Terminology
Commands can be customized to match your guild's terminology and procedures.

## Support

For additional help:
- Check the [troubleshooting guide](troubleshooting.md)
- Contact your guild administrator
- Report issues on GitHub
- Join community discussions

Remember: Voice commands are designed to enhance, not replace, your coordination strategies. Use them in combination with other communication tools for optimal results.