# SphereConnect Test Data Purge Script

## Overview

The `scripts/purge_test_data.py` script safely removes all test data created by `scripts/test_data.py` from the PostgreSQL database. It respects foreign key constraints by deleting data in the correct order.

## Features

- ✅ **Safe Deletion**: Respects foreign key constraints
- ✅ **PostgreSQL Integration**: Uses `.env.local` configuration
- ✅ **Confirmation Prompts**: Prevents accidental data loss
- ✅ **Dry Run Mode**: Preview what would be deleted
- ✅ **Force Mode**: Skip confirmations for automation
- ✅ **Comprehensive Logging**: Clear status messages

## Usage

### Basic Usage (Interactive Mode)
```bash
python scripts/purge_test_data.py
```

### Skip Confirmation Prompts
```bash
python scripts/purge_test_data.py --force
```

### Preview What Would Be Deleted
```bash
python scripts/purge_test_data.py --dry-run
```

### Get Help
```bash
python scripts/purge_test_data.py --help
```

## What Gets Purged

The script identifies and deletes test data by these criteria:

- **Guilds**: Named "Test UEE Fleet"
- **AI Commanders**: Named "UEE Commander" (associated with test guilds)
- **Objectives**: Named "Collect 500 SCU Gold" (associated with test guilds)
- **Tasks**: Named "Scout Route" (associated with test objectives)

## Deletion Order

To respect foreign key constraints, data is deleted in this order:

1. **Tasks** (no dependencies)
2. **Objectives** (depend on guilds)
3. **AI Commanders** (depend on guilds)
4. **Guilds** (depend on nothing)

## Safety Features

### Confirmation Prompts
By default, the script asks for confirmation before deleting any data:

```
⚠️  WARNING: This will permanently delete 32 test data items!
This action cannot be undone.

Are you sure you want to continue? (yes/no):
```

### Dry Run Mode
Use `--dry-run` to see what would be deleted without actually deleting:

```bash
python scripts/purge_test_data.py --dry-run
```

### Force Mode
Use `--force` to skip confirmations (useful for automation):

```bash
python scripts/purge_test_data.py --force
```

## Environment Configuration

The script automatically loads database configuration from `.env.local`:

```bash
# Database Connection
DB_USER=postgres
DB_PASS=your_password_here
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sphereconnect
```

## Example Output

### Dry Run Mode
```
🧹 SphereConnect Test Data Purge Script
==================================================
📋 DRY RUN MODE - No data will actually be deleted

============================================================
FOUND TEST DATA TO PURGE
============================================================

📁 GUILDS: 8 items
  1. Test UEE Fleet (ID: bd7b3bd1-68fe-4b09-b9d8-f5bfb199ea2d)

📁 COMMANDERS: 8 items
  1. UEE Commander (ID: 4e3ac9a2-ddd6-4bae-98d4-e8780694d4d0)

📁 OBJECTIVES: 8 items
  1. Collect 500 SCU Gold (ID: 2f3b5acc-b420-4a60-ac48-e923f89a186a)

📁 TASKS: 8 items
  1. Scout Route (ID: aa0e062f-0fbd-43a9-820b-ba6ceb3b41fa)

📊 Total items to delete: 32
============================================================

📋 Starting dry run...
📋 Would delete task: Scout Route (ID: aa0e062f-0fbd-43a9-820b-ba6ceb3b41fa)
📋 Would delete objective: Collect 500 SCU Gold (ID: 2f3b5acc-b420-4a60-ac48-e923f89a186a)
📋 Would delete AI Commander: UEE Commander (ID: 4e3ac9a2-ddd6-4bae-98d4-e8780694d4d0)
📋 Would delete guild: Test UEE Fleet (ID: bd7b3bd1-68fe-4b09-b9d8-f5bfb199ea2d)
...
```

### Actual Purge
```
🗑️  Starting purge...
✓ Deleted task: Scout Route (ID: aa0e062f-0fbd-43a9-820b-ba6ceb3b41fa)
✓ Deleted objective: Collect 500 SCU Gold (ID: 2f3b5acc-b420-4a60-ac48-e923f89a186a)
✓ Deleted AI Commander: UEE Commander (ID: 4e3ac9a2-ddd6-4bae-98d4-e8780694d4d0)
✓ Deleted guild: Test UEE Fleet (ID: bd7b3bd1-68fe-4b09-b9d8-f5bfb199ea2d)
...

✅ Successfully deleted 32 test data items!
```

## Error Handling

The script includes comprehensive error handling:

- **Database Connection Errors**: Clear error messages for connection issues
- **Foreign Key Violations**: Proper transaction rollback on errors
- **Permission Errors**: Informative messages for access issues
- **Missing Environment**: Graceful fallback to default settings

## Integration with Development Workflow

### Typical Development Cycle
```bash
# Create test data
python scripts/test_data.py

# Run tests or development work
# ... your development tasks ...

# Clean up test data
python scripts/purge_test_data.py --force

# Verify cleanup
python scripts/purge_test_data.py --dry-run
```

### CI/CD Integration
```bash
# In your CI/CD pipeline
python scripts/test_data.py
python -m pytest tests/
python scripts/purge_test_data.py --force
```

## Troubleshooting

### No Test Data Found
If the script reports "No test data found," it means:
- No test data was created, or
- Test data was already purged, or
- Database connection is incorrect

### Permission Denied
If you get permission errors:
- Check your PostgreSQL user permissions
- Verify `.env.local` credentials
- Ensure database exists and is accessible

### Foreign Key Errors
If foreign key errors occur:
- The script handles this automatically with rollbacks
- Check database schema for constraint issues
- Ensure no external references to test data exist

## File Structure

```
purge_test_data.py          # Main purge script
PURGE_README.md            # This documentation
.env.local                 # Database configuration
app/
  core/
    models.py             # Database models
```

---

## 🎯 Success Metrics

✅ **Safe Deletion**: Respects all foreign key constraints
✅ **Zero Data Loss**: Only deletes intended test data
✅ **PostgreSQL Compatible**: Full support for PostgreSQL
✅ **User-Friendly**: Clear prompts and confirmations
✅ **Automation Ready**: Supports both interactive and automated usage

The purge script is **production-ready** and ensures clean database state for development and testing! 🚀
