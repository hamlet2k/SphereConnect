# SphereConnect Database Management Scripts

## Overview

SphereConnect provides comprehensive database management tools for development, testing, and maintenance. These scripts handle test data cleanup, database inspection, and complete database resets while maintaining data integrity and safety.

## Available Scripts

### 1. `scripts/purge_test_data.py` - Safe Test Data Removal
Safely removes test data created by both `scripts/test_data.py` and `tests/test_standalone.py` from the PostgreSQL database.

### 2. `scripts/purge_all_data.py` - Complete Database Reset
**DANGER**: Completely wipes and recreates all database tables. Use with extreme caution.

### 3. `scripts/show_db_contents.py` - Database Inspection
Displays current database contents and statistics for development and debugging.

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

## Test Data Identification

The `purge_test_data.py` script identifies test data by multiple criteria to handle data from different test sources:

### From `scripts/test_data.py`:
- **Guilds**: Named "Test UEE Fleet"
- **AI Commanders**: Named "UEE Commander" (associated with test guilds)
- **Objectives**: Named "Collect 500 SCU Gold" (associated with test guilds)
- **Tasks**: Named "Scout Route" (associated with test objectives)

### From `tests/test_standalone.py`:
- **Guilds**: Named "Test Guild"
- **Users**: Named "Test Pilot"
- **Objectives**: Named "Mine Platinum Ore", "Test Mission", "Mining Operation", "Patrol Mission"
- **Tasks**: Named "Scout Location", "Scout Route", "Assigned Task", "Sector Patrol"
- **AI Commanders**: Named "UEE Commander" (associated with test guilds)

## Deletion Order

To respect foreign key constraints, data is deleted in this order:

1. **Tasks** (no dependencies)
2. **Objectives** (depend on guilds)
3. **AI Commanders** (depend on guilds)
4. **Users** (depend on guilds)
5. **Guilds** (depend on nothing)

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

## Test Data Persistence

### Understanding Test Data Creation

**Important**: Test data from `tests/test_standalone.py` is persisted in the database during development and testing:

- **Database Session**: Tests use the same PostgreSQL database as the main application
- **Data Commitment**: Test fixtures are committed with `self.db.commit()`
- **Cleanup Mechanism**: `tearDown()` attempts rollback, but committed data persists
- **Accumulation**: Multiple test runs accumulate data (currently 356+ records)

### Monitoring Database State

```bash
# Check current database contents
python scripts/show_db_contents.py --summary

# View detailed breakdown
python scripts/show_db_contents.py
```

### Development Workflow with Cleanup

#### Standard Development Cycle
```bash
# 1. Check current database state
python scripts/show_db_contents.py --summary

# 2. Run tests (may create new test data)
python -m pytest tests/test_standalone.py -v

# 3. Clean up test data safely
python scripts/purge_test_data.py

# 4. Verify cleanup
python scripts/show_db_contents.py --summary
```

#### Complete Environment Reset
```bash
# For fresh development environment
python scripts/purge_all_data.py  # ⚠️ DANGER: Deletes everything!
```

### CI/CD Integration

#### Safe CI/CD Pipeline
```bash
# Setup
python scripts/show_db_contents.py --summary

# Test execution
python -m pytest tests/ -v

# Cleanup (safe)
python scripts/purge_test_data.py --force

# Verification
python scripts/show_db_contents.py --summary
```

#### Development Environment Reset
```bash
# Complete reset for development
python scripts/purge_all_data.py --force
```

## Troubleshooting

### Test Data Persistence Issues

#### Database Growing Too Large
**Symptoms**: Database contains hundreds of test records
**Solution**:
```bash
# Check what's in the database
python scripts/show_db_contents.py --summary

# Remove test data safely
python scripts/purge_test_data.py

# For complete reset if needed
python scripts/purge_all_data.py
```

#### Test Data Not Found
**Symptoms**: `purge_test_data.py` reports "No test data found"
**Possible Causes**:
- No test data was created yet
- Test data was already purged
- Database connection is incorrect
- Test data uses different naming patterns

**Solutions**:
```bash
# Check database contents
python scripts/show_db_contents.py

# Verify database connection
python scripts/show_db_contents.py --summary

# Check if test data exists with different patterns
# The script handles multiple test data patterns automatically
```

### Script-Specific Issues

#### purge_test_data.py Issues
- **Permission Denied**: Check PostgreSQL user permissions and `.env.local` credentials
- **Foreign Key Errors**: Script handles automatically with rollbacks
- **Connection Issues**: Verify database exists and is accessible

#### purge_all_data.py Issues
- **Accidental Deletion**: Use `--dry-run` first to preview
- **Long Execution Time**: Large databases may take time to drop/recreate
- **Permission Issues**: Requires database owner privileges

#### show_db_contents.py Issues
- **Unicode Errors**: Script uses plain text (no emojis) for compatibility
- **Connection Issues**: Same database connection requirements as other scripts

### Common Database Issues

#### Connection Problems
```bash
# Test database connection
python -c "from app.core.models import ENGINE; print('Connection OK' if ENGINE else 'Connection Failed')"
```

#### Large Database Size
```bash
# Check database size (PostgreSQL)
psql -d sphereconnect -c "SELECT pg_size_pretty(pg_database_size('sphereconnect'));"

# Monitor table sizes
psql -d sphereconnect -c "SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) FROM pg_tables WHERE schemaname = 'public' ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;"
```

### Performance Considerations

- **Large Datasets**: `purge_all_data.py` may be slow on large databases
- **Memory Usage**: Scripts load all matching records into memory
- **Concurrent Access**: Avoid running during active development/testing
- **Backup Strategy**: Consider backups before major cleanup operations

## Database Contents Viewer (`scripts/show_db_contents.py`)

Inspect the current state of your SphereConnect database.

### Usage

```bash
# Show summary counts only
python scripts/show_db_contents.py --summary

# Show detailed contents of all tables
python scripts/show_db_contents.py

# Show data for specific guild only
python scripts/show_db_contents.py --guild <guild_id>
```

### Example Output

```
============================================================
SPHERECONNECT DATABASE SUMMARY
============================================================
Total Records: 356

[POPULATED] Guilds: 101
[POPULATED] Users: 91
[EMPTY] AI Commanders: 0
[POPULATED] Objectives: 90
[POPULATED] Tasks: 26

Database: PostgreSQL
   Host: localhost:5432
   Database: sphereconnect
============================================================
```

## Complete Database Reset (`scripts/purge_all_data.py`)

**⚠️ DANGER: This script deletes ALL data permanently!**

Completely wipes the database by dropping and recreating all tables. Use only when you need a fresh start.

### Usage

```bash
# Interactive mode with safety confirmations
python scripts/purge_all_data.py

# Skip confirmations (EXTREMELY DANGEROUS)
python scripts/purge_all_data.py --force

# Preview what would happen
python scripts/purge_all_data.py --dry-run
```

### Safety Features

- **Multiple Confirmations**: Requires typing specific confirmation phrases
- **Dry Run Mode**: Preview operations without executing
- **Clear Warnings**: Explicit danger warnings before proceeding

### When to Use

- ✅ Setting up a fresh development environment
- ✅ Preparing for production deployment testing
- ✅ Complete data reset for demonstrations
- ❌ **Never** use on production databases
- ❌ **Never** use if you have important data

## Quick Reference

| Script | Purpose | Safety Level | Use Case |
|--------|---------|--------------|----------|
| `purge_test_data.py` | Remove test data | 🟢 Safe | Regular development cleanup |
| `show_db_contents.py` | Inspect database | 🟢 Safe | Monitoring and debugging |
| `purge_all_data.py` | Complete reset | 🔴 Dangerous | Fresh environment setup |

## File Structure

```
scripts/
├── purge_test_data.py      # Safe test data removal
├── purge_all_data.py       # Complete database reset (DANGER)
├── show_db_contents.py     # Database inspection tool
└── db_init.py             # Database initialization

docs/tools/
└── purge-script.md        # This documentation

.env.local                 # Database configuration
app/core/models.py         # Database models and schemas
```

---

## 🎯 Success Metrics

### purge_test_data.py
✅ **Safe Deletion**: Respects all foreign key constraints
✅ **Zero Data Loss**: Only deletes intended test data
✅ **Multi-Source Support**: Handles data from both `test_data.py` and `test_standalone.py`
✅ **PostgreSQL Compatible**: Full support for PostgreSQL
✅ **User-Friendly**: Clear prompts and confirmations
✅ **Automation Ready**: Supports both interactive and automated usage

### purge_all_data.py
✅ **Complete Reset**: Drops and recreates all tables
✅ **Safety First**: Multiple confirmation layers
✅ **Dry Run Support**: Preview operations safely
✅ **Schema Preservation**: Maintains table structure
⚠️ **Use Sparingly**: Only for complete environment resets

### show_db_contents.py
✅ **Comprehensive View**: Shows all table contents and statistics
✅ **Flexible Output**: Summary and detailed modes
✅ **Guild Filtering**: Focus on specific guild data
✅ **Real-time Data**: Always shows current database state
✅ **Development Aid**: Essential for debugging and monitoring

## 🏆 Overall System Benefits

- **🛡️ Data Integrity**: Safe operations with rollback support
- **🔍 Transparency**: Full visibility into database operations
- **⚡ Performance**: Optimized for development workflows
- **🔒 Safety**: Multiple confirmation and preview mechanisms
- **📊 Monitoring**: Real-time database state inspection
- **🔄 Automation**: CI/CD pipeline integration ready

The SphereConnect database management toolkit is **production-ready** and ensures clean, maintainable database state for development and testing! 🚀
