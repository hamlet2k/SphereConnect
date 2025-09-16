import React, { useState, useEffect } from 'react';

interface TaskSchedule {
  start?: string;
  end?: string;
  duration?: string;
  flexible: boolean;
  timezone: string;
}

interface Task {
  id?: string;
  name: string;
  description?: string;
  objective_id: string;
  priority: string;
  self_assignment: boolean;
  max_assignees: number;
  squad_id?: string;
  guild_id: string;
  schedule: TaskSchedule;
}

interface TaskSchedulerProps {
  task?: Task;
  objectiveId: string;
  guildId: string;
  onSave: (task: Task) => void;
  onCancel: () => void;
}

const TaskScheduler: React.FC<TaskSchedulerProps> = ({
  task,
  objectiveId,
  guildId,
  onSave,
  onCancel
}) => {
  const [formData, setFormData] = useState<Task>({
    name: '',
    description: '',
    objective_id: objectiveId,
    priority: 'Medium',
    self_assignment: true,
    max_assignees: 5,
    guild_id: guildId,
    schedule: {
      flexible: true,
      timezone: 'UTC'
    }
  });

  const [scheduleType, setScheduleType] = useState<'flexible' | 'fixed' | 'duration'>('flexible');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (task) {
      setFormData(task);
      // Determine schedule type based on existing schedule
      if (task.schedule.start && task.schedule.end) {
        setScheduleType('fixed');
      } else if (task.schedule.duration) {
        setScheduleType('duration');
      } else {
        setScheduleType('flexible');
      }
    }
  }, [task]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleScheduleChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        [field]: value
      }
    }));
  };

  const handleScheduleTypeChange = (type: 'flexible' | 'fixed' | 'duration') => {
    setScheduleType(type);

    if (type === 'flexible') {
      setFormData(prev => ({
        ...prev,
        schedule: {
          flexible: true,
          timezone: prev.schedule.timezone || 'UTC'
        }
      }));
    } else if (type === 'fixed') {
      setFormData(prev => ({
        ...prev,
        schedule: {
          ...prev.schedule,
          flexible: false,
          start: prev.schedule.start || '',
          end: prev.schedule.end || ''
        }
      }));
    } else if (type === 'duration') {
      setFormData(prev => ({
        ...prev,
        schedule: {
          ...prev.schedule,
          flexible: false,
          duration: prev.schedule.duration || '1h'
        }
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validate required fields
      if (!formData.name.trim()) {
        throw new Error('Task name is required');
      }

      if (!formData.objective_id) {
        throw new Error('Objective ID is required');
      }

      await onSave(formData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (duration: string) => {
    // Convert duration string to human readable format
    const match = duration.match(/(\d+)([smhd])/);
    if (!match) return duration;

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 's': return `${value} second${value !== 1 ? 's' : ''}`;
      case 'm': return `${value} minute${value !== 1 ? 's' : ''}`;
      case 'h': return `${value} hour${value !== 1 ? 's' : ''}`;
      case 'd': return `${value} day${value !== 1 ? 's' : ''}`;
      default: return duration;
    }
  };

  return (
    <div style={{
      maxWidth: '800px',
      margin: '0 auto',
      padding: '24px',
      backgroundColor: 'white',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }}>
      <h3 style={{ marginTop: 0, marginBottom: '24px' }}>
        {task ? 'Edit Task' : 'Schedule New Task'}
      </h3>

      {error && (
        <div style={{
          padding: '12px',
          backgroundColor: '#fed7d7',
          color: '#c53030',
          borderRadius: '4px',
          marginBottom: '16px'
        }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Basic Information */}
        <div style={{ marginBottom: '24px' }}>
          <h4 style={{ marginBottom: '16px' }}>Task Details</h4>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
              Task Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontSize: '16px'
              }}
              placeholder="Enter task name"
              required
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
              Description
            </label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => handleInputChange('description', e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontSize: '16px',
                minHeight: '80px',
                resize: 'vertical'
              }}
              placeholder="Task description (optional)"
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
              Priority
            </label>
            <select
              value={formData.priority}
              onChange={(e) => handleInputChange('priority', e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontSize: '16px'
              }}
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </select>
          </div>
        </div>

        {/* Assignment Settings */}
        <div style={{ marginBottom: '24px' }}>
          <h4 style={{ marginBottom: '16px' }}>Assignment Settings</h4>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                checked={formData.self_assignment}
                onChange={(e) => handleInputChange('self_assignment', e.target.checked)}
              />
              Allow self-assignment
            </label>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
              Maximum Assignees
            </label>
            <input
              type="number"
              min="1"
              max="50"
              value={formData.max_assignees}
              onChange={(e) => handleInputChange('max_assignees', parseInt(e.target.value))}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontSize: '16px'
              }}
            />
          </div>
        </div>

        {/* Scheduling */}
        <div style={{ marginBottom: '24px' }}>
          <h4 style={{ marginBottom: '16px' }}>Scheduling</h4>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              Schedule Type
            </label>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <input
                  type="radio"
                  name="scheduleType"
                  checked={scheduleType === 'flexible'}
                  onChange={() => handleScheduleTypeChange('flexible')}
                />
                Flexible
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <input
                  type="radio"
                  name="scheduleType"
                  checked={scheduleType === 'fixed'}
                  onChange={() => handleScheduleTypeChange('fixed')}
                />
                Fixed Time
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <input
                  type="radio"
                  name="scheduleType"
                  checked={scheduleType === 'duration'}
                  onChange={() => handleScheduleTypeChange('duration')}
                />
                Duration-based
              </label>
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
              Timezone
            </label>
            <select
              value={formData.schedule.timezone}
              onChange={(e) => handleScheduleChange('timezone', e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontSize: '16px'
              }}
            >
              <option value="UTC">UTC</option>
              <option value="America/New_York">Eastern Time</option>
              <option value="America/Chicago">Central Time</option>
              <option value="America/Denver">Mountain Time</option>
              <option value="America/Los_Angeles">Pacific Time</option>
              <option value="Europe/London">London</option>
              <option value="Europe/Paris">Paris</option>
              <option value="Asia/Tokyo">Tokyo</option>
            </select>
          </div>

          {scheduleType === 'fixed' && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ marginBottom: '8px' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
                  Start Time
                </label>
                <input
                  type="datetime-local"
                  value={formData.schedule.start ? new Date(formData.schedule.start).toISOString().slice(0, 16) : ''}
                  onChange={(e) => handleScheduleChange('start', new Date(e.target.value).toISOString())}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    fontSize: '16px'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
                  End Time
                </label>
                <input
                  type="datetime-local"
                  value={formData.schedule.end ? new Date(formData.schedule.end).toISOString().slice(0, 16) : ''}
                  onChange={(e) => handleScheduleChange('end', new Date(e.target.value).toISOString())}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    fontSize: '16px'
                  }}
                />
              </div>
            </div>
          )}

          {scheduleType === 'duration' && (
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
                Duration
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="number"
                  min="1"
                  value={formData.schedule.duration ? parseInt(formData.schedule.duration) : ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    const unit = formData.schedule.duration ? formData.schedule.duration.replace(/\d+/g, '') : 'm';
                    handleScheduleChange('duration', value + unit);
                  }}
                  style={{
                    flex: 1,
                    padding: '8px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    fontSize: '16px'
                  }}
                  placeholder="Duration"
                />
                <select
                  value={formData.schedule.duration ? formData.schedule.duration.replace(/\d+/g, '') : 'm'}
                  onChange={(e) => {
                    const value = formData.schedule.duration ? formData.schedule.duration.replace(/\D+/g, '') : '1';
                    handleScheduleChange('duration', value + e.target.value);
                  }}
                  style={{
                    padding: '8px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    fontSize: '16px'
                  }}
                >
                  <option value="s">Seconds</option>
                  <option value="m">Minutes</option>
                  <option value="h">Hours</option>
                  <option value="d">Days</option>
                </select>
              </div>
              {formData.schedule.duration && (
                <small style={{ color: '#666', marginTop: '4px', display: 'block' }}>
                  Duration: {formatDuration(formData.schedule.duration)}
                </small>
              )}
            </div>
          )}

          {scheduleType === 'flexible' && (
            <div style={{
              padding: '16px',
              backgroundColor: '#f7fafc',
              borderRadius: '4px',
              border: '1px solid #e2e8f0'
            }}>
              <p style={{ margin: 0, color: '#4a5568' }}>
                <strong>Flexible Scheduling:</strong> This task can be started at any time within the specified timezone.
                Assignees will have the freedom to schedule their work according to their availability.
              </p>
            </div>
          )}
        </div>

        {/* Form Actions */}
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: '12px 24px',
              backgroundColor: '#a0aec0',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '12px 24px',
              backgroundColor: loading ? '#ccc' : '#38a169',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Saving...' : (task ? 'Update Task' : 'Create Task')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default TaskScheduler;