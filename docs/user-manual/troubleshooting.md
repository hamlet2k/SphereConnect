# Troubleshooting Guide

This guide helps you resolve common issues with SphereConnect. Start with the most relevant section based on your problem.

## Voice Command Issues

### Commands Not Recognized

**Symptoms:**
- Voice commands return "Command not understood"
- No response from AI Commander
- Wingman-AI shows processing but no action

**Solutions:**
1. **Check Microphone Setup**
   - Ensure microphone is enabled in system settings
   - Test microphone in Windows Sound settings
   - Verify Wingman-AI has microphone access

2. **Verify Command Syntax**
   - Use exact patterns from the [voice commands guide](voice-commands.md)
   - Speak clearly and at normal volume
   - Try simpler commands first

3. **Check Wingman-AI Status**
   - Restart Wingman-AI application
   - Verify SphereConnect skill is loaded
   - Check skill configuration in Wingman-AI settings

4. **Test API Connectivity**
   ```bash
   curl http://localhost:8000/health
   ```
   - Should return `{"status": "healthy"}`

### Authentication Failures

**Symptoms:**
- "Authentication required" responses
- PIN verification fails
- Voice commands blocked

**Solutions:**
1. **Verify PIN**
   - Check PIN in your profile settings
   - Ensure 6-digit format
   - Try resetting PIN through web interface

2. **Check Account Status**
   - Verify account is not locked
   - Confirm rank permissions for command
   - Check if guild membership is active

3. **Session Issues**
   - Log out and log back in
   - Clear browser cache
   - Try different browser

### Poor Voice Recognition

**Symptoms:**
- Commands misinterpret words
- Names not recognized correctly
- Numbers heard incorrectly

**Solutions:**
1. **Improve Audio Quality**
   - Use wired microphone over wireless
   - Reduce background noise
   - Speak closer to microphone

2. **Update Pronunciation**
   - Set phonetic name in profile
   - Use consistent nicknames
   - Avoid similar-sounding names

3. **Environment Factors**
   - Test in quiet room
   - Close noise-making applications
   - Update audio drivers

## Web Interface Problems

### Login Issues

**Symptoms:**
- Cannot log into web interface
- "Invalid credentials" error
- Account appears locked

**Solutions:**
1. **Credential Verification**
   - Reset password if forgotten
   - Check username/guild combination
   - Verify account activation

2. **Account Lockout**
   - Wait 15 minutes for automatic unlock
   - Contact administrator for manual unlock
   - Check failed attempt history

3. **Browser Issues**
   - Clear browser cache and cookies
   - Try incognito/private mode
   - Update browser to latest version

### Page Loading Problems

**Symptoms:**
- Interface doesn't load
- Blank pages or error messages
- Slow performance

**Solutions:**
1. **Network Connectivity**
   - Check internet connection
   - Verify firewall settings
   - Try different network

2. **Browser Compatibility**
   - Use Chrome, Firefox, or Edge
   - Disable browser extensions
   - Clear cache and cookies

3. **Server Status**
   - Check system status page
   - Verify API endpoints
   - Contact administrator if down

### Feature Access Denied

**Symptoms:**
- Buttons disabled or hidden
- "Permission denied" messages
- Cannot access certain sections

**Solutions:**
1. **Check Permissions**
   - Verify your rank level
   - Confirm access level assignments
   - Check objective rank restrictions

2. **Account Status**
   - Ensure account is active
   - Verify guild membership
   - Check for administrative blocks

## API and Integration Issues

### Wingman-AI Connection

**Symptoms:**
- Voice commands don't reach server
- API timeout errors
- Integration status shows offline

**Solutions:**
1. **Configuration Check**
   ```yaml
   # Verify config in wingman-ai/configs/_SphereConnect/
   api_endpoint: "http://localhost:8000"
   ```

2. **Port Accessibility**
   - Ensure port 8000 is not blocked
   - Check firewall rules
   - Verify server is running

3. **Skill Installation**
   - Reinstall SphereConnect skill
   - Update Wingman-AI to latest version
   - Check skill logs for errors

### Database Connection

**Symptoms:**
- Operations fail with database errors
- Slow response times
- Connection timeout messages

**Solutions:**
1. **Database Status**
   ```bash
   # Check PostgreSQL status
   sudo systemctl status postgresql

   # Test connection
   psql -U sphereconnect -d sphereconnect -c "SELECT 1;"
   ```

2. **Connection Pool**
   - Check for connection leaks
   - Restart application server
   - Monitor connection count

3. **Configuration**
   - Verify DATABASE_URL in environment
   - Check database credentials
   - Ensure database exists

## Performance Issues

### Slow Response Times

**Symptoms:**
- Voice commands take >2 seconds
- Web interface lags
- Operations timeout

**Solutions:**
1. **System Resources**
   - Check CPU/memory usage
   - Close unnecessary applications
   - Monitor system performance

2. **Database Optimization**
   - Check for slow queries
   - Verify index usage
   - Consider database tuning

3. **Network Latency**
   - Test local vs remote access
   - Check network speed
   - Use wired connection

### Memory Issues

**Symptoms:**
- Application crashes
- Out of memory errors
- System slowdown

**Solutions:**
1. **Resource Monitoring**
   ```bash
   # Check memory usage
   htop
   free -h
   ```

2. **Configuration Tuning**
   - Adjust worker process count
   - Increase system memory
   - Optimize database connections

3. **Application Restart**
   - Restart services
   - Clear temporary files
   - Check for memory leaks

## Data and Synchronization Issues

### Missing Data

**Symptoms:**
- Objectives/tasks not appearing
- User data lost
- Synchronization failures

**Solutions:**
1. **Data Integrity**
   - Check database for corruption
   - Verify foreign key constraints
   - Run data validation scripts

2. **Cache Issues**
   - Clear application cache
   - Restart services
   - Check Redis if used

3. **Backup Recovery**
   - Restore from recent backup
   - Verify backup integrity
   - Contact administrator

### Synchronization Problems

**Symptoms:**
- Data not syncing between devices
- Voice commands not reflected in web
- Real-time updates missing

**Solutions:**
1. **WebSocket Connection**
   - Check WebSocket connectivity
   - Verify firewall rules
   - Restart WebSocket service

2. **Cache Invalidation**
   - Clear browser cache
   - Force page refresh
   - Check cache configuration

## Security and Access Issues

### MFA Problems

**Symptoms:**
- Cannot set up TOTP
- Authenticator app not working
- MFA verification fails

**Solutions:**
1. **TOTP Setup**
   - Scan QR code correctly
   - Check time synchronization
   - Try different authenticator app

2. **Backup Codes**
   - Generate backup codes
   - Store securely
   - Use for account recovery

### Permission Errors

**Symptoms:**
- Access denied to features
- Rank-based restrictions not working
- Administrative commands blocked

**Solutions:**
1. **Role Verification**
   - Check assigned ranks
   - Verify access level permissions
   - Contact administrator for changes

2. **Session Issues**
   - Log out and log back in
   - Clear session data
   - Check token expiration

## Mobile and Cross-Platform Issues

### Mobile App Problems

**Symptoms:**
- App crashes on mobile
- Features not working on phone
- Synchronization issues

**Solutions:**
1. **App Updates**
   - Update to latest version
   - Clear app cache
   - Reinstall if necessary

2. **Permissions**
   - Grant microphone/camera access
   - Enable notifications
   - Check location permissions

### Cross-Browser Issues

**Symptoms:**
- Works in one browser, not another
- Features missing in certain browsers

**Solutions:**
1. **Browser Updates**
   - Update to latest version
   - Enable JavaScript
   - Clear browser data

2. **Compatibility Mode**
   - Test in multiple browsers
   - Use supported browsers
   - Check browser console for errors

## Advanced Troubleshooting

### Log Analysis

**Server Logs**
```bash
# View application logs
tail -f /var/log/sphereconnect/app.log

# Check for errors
grep ERROR /var/log/sphereconnect/app.log
```

**Wingman-AI Logs**
- Check Wingman-AI log directory
- Look for API connection errors
- Verify skill loading

**Database Logs**
```bash
# PostgreSQL logs
tail -f /var/log/postgresql/postgresql-*.log
```

### Diagnostic Commands

**System Health Check**
```bash
# Comprehensive health check
curl http://localhost:8000/health

# Database connectivity
python -c "from app.core.models import engine; print('DB OK')"

# API endpoints
curl -H "Authorization: Bearer <token>" http://localhost:8000/api/objectives
```

**Performance Monitoring**
```bash
# CPU and memory
top -p $(pgrep -f sphereconnect)

# Network connections
netstat -tlnp | grep :8000

# Disk usage
df -h
du -sh /opt/sphereconnect
```

### Recovery Procedures

**Application Restart**
```bash
# Systemd service
sudo systemctl restart sphereconnect

# Manual restart
pkill -f sphereconnect
python scripts/start_server.py
```

**Database Recovery**
```bash
# Restart PostgreSQL
sudo systemctl restart postgresql

# Check database health
psql -U postgres -c "SELECT version();"
```

**Full System Reset**
```bash
# Last resort - backup first!
# Clear all data and restart
python scripts/purge_test_data.py --force
python scripts/db_init.py
```

## Getting Additional Help

### Support Resources

**Documentation**
- [Installation Guide](../setup/installation.md)
- [Configuration Guide](../setup/configuration.md)
- [API Reference](../api-reference/)

**Community Support**
- Guild administrator
- User forums
- GitHub issues

**Professional Support**
- Contact development team
- Enterprise support options
- Consulting services

### Information to Provide

When reporting issues, include:
- Error messages (exact text)
- Steps to reproduce
- System information (OS, browser, versions)
- Log excerpts
- Screenshot if applicable

### Prevention

**Regular Maintenance**
- Keep systems updated
- Monitor logs regularly
- Perform regular backups
- Test critical workflows

**Best Practices**
- Use strong passwords
- Enable MFA
- Keep software updated
- Monitor system resources

This troubleshooting guide covers the most common issues. For persistent problems not covered here, please contact your system administrator or create a detailed issue report on GitHub.