import React, { useState, useEffect } from 'react';
import { useGuild } from '../contexts/GuildContext';

interface AccessLevel {
  id: string;
  name: string;
  user_actions: string[];
}

const USER_ACTIONS = [
  'view_guilds',
  'manage_guilds',
  'view_users',
  'manage_users',
  'manage_user_access',
  'create_objective',
  'manage_objectives',
  'manage_rbac',
  'view_ranks',
  'manage_ranks'
];

function AccessLevelManager() {
  const [accessLevels, setAccessLevels] = useState<AccessLevel[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingLevel, setEditingLevel] = useState<AccessLevel | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    user_actions: [] as string[]
  });
  const [message, setMessage] = useState('');

  const { currentGuildId } = useGuild();
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (currentGuildId) {
      loadAccessLevels();
    }
  }, [currentGuildId]);

  const loadAccessLevels = async () => {
    setLoading(true);
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const response = await fetch(`http://localhost:8000/api/admin/access-levels?guild_id=${currentGuildId}`, { headers });

      if (response.ok) {
        const data = await response.json();
        setAccessLevels(data);
      } else if (response.status === 403) {
        setMessage('Insufficient permissions to manage access levels. You need manage_rbac permission.');
        setAccessLevels([]);
      } else {
        setMessage('Failed to load access levels');
      }
    } catch (error) {
      setMessage('Error loading access levels');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || formData.user_actions.length === 0) {
      setMessage('Name and at least one user action are required');
      return;
    }

    // Confirmation dialog for changes
    const action = editingLevel ? 'update' : 'create';
    const confirmed = window.confirm(
      `Are you sure you want to ${action} this access level? This will change user permissions.`
    );

    if (!confirmed) {
      return;
    }

    try {
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      };

      const url = editingLevel
        ? `http://localhost:8000/api/admin/access-levels/${editingLevel.id}`
        : 'http://localhost:8000/api/admin/access-levels';

      const method = editingLevel ? 'PATCH' : 'POST';
      const body = JSON.stringify({
        ...formData,
        guild_id: currentGuildId
      });

      const response = await fetch(url, { method, headers, body });

      if (response.ok) {
        const result = await response.json();
        setMessage(result.message || `Access level ${editingLevel ? 'updated' : 'created'} successfully`);
        setShowForm(false);
        setEditingLevel(null);
        setFormData({ name: '', user_actions: [] });
        loadAccessLevels();
      } else if (response.status === 403) {
        setMessage('Insufficient permissions to manage access levels. You need manage_rbac permission.');
      } else {
        const error = await response.json();
        setMessage(error.detail || 'Failed to save access level');
      }
    } catch (error) {
      setMessage('Error saving access level');
    }
  };

  const handleEdit = (level: AccessLevel) => {
    setEditingLevel(level);
    setFormData({
      name: level.name,
      user_actions: [...level.user_actions]
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm(
      'Are you sure you want to delete this access level? This will permanently remove it and may affect user permissions.'
    );

    if (!confirmed) {
      return;
    }

    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const response = await fetch(`http://localhost:8000/api/admin/access-levels/${id}`, {
        method: 'DELETE',
        headers
      });

      if (response.ok) {
        const result = await response.json();
        setMessage(result.message || 'Access level deleted successfully');
        loadAccessLevels();
      } else if (response.status === 403) {
        setMessage('Insufficient permissions to manage access levels. You need manage_rbac permission.');
      } else {
        const error = await response.json();
        setMessage(error.detail || 'Failed to delete access level');
      }
    } catch (error) {
      setMessage('Error deleting access level');
    }
  };

  const handleActionToggle = (action: string) => {
    setFormData(prev => ({
      ...prev,
      user_actions: prev.user_actions.includes(action)
        ? prev.user_actions.filter(a => a !== action)
        : [...prev.user_actions, action]
    }));
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingLevel(null);
    setFormData({ name: '', user_actions: [] });
    setMessage('');
  };

  if (!token) {
    return <div>Access denied. Please login first.</div>;
  }

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h3 style={{ margin: 0 }}>Access Levels Management</h3>
        <button
          onClick={() => setShowForm(true)}
          style={{
            padding: '8px 16px',
            backgroundColor: '#3182ce',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Create Access Level
        </button>
      </div>

      {showForm && (
        <div style={{
          backgroundColor: '#f7fafc',
          padding: '24px',
          borderRadius: '8px',
          marginBottom: '24px',
          border: '1px solid #e2e8f0'
        }}>
          <h4 style={{ margin: '0 0 16px 0' }}>
            {editingLevel ? 'Edit Access Level' : 'Create New Access Level'}
          </h4>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                Name:
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
                placeholder="Enter access level name"
                required
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                User Actions:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' }}>
                {USER_ACTIONS.map(action => (
                  <label key={action} style={{ display: 'flex', alignItems: 'center' }}>
                    <input
                      type="checkbox"
                      checked={formData.user_actions.includes(action)}
                      onChange={() => handleActionToggle(action)}
                      style={{ marginRight: '8px' }}
                    />
                    {action.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </label>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="submit"
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#3182ce',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                {editingLevel ? 'Update' : 'Create'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#e2e8f0',
                  color: '#4a5568',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #e2e8f0',
            borderTop: '4px solid #3182ce',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }}></div>
          <p>Loading access levels...</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f7fafc' }}>
                <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #e2e8f0' }}>Name</th>
                <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #e2e8f0' }}>User Actions</th>
                <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #e2e8f0' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {accessLevels.map(level => (
                <tr key={level.id}>
                  <td style={{ padding: '12px', border: '1px solid #e2e8f0' }}>{level.name}</td>
                  <td style={{ padding: '12px', border: '1px solid #e2e8f0' }}>
                    {level.user_actions.map(action =>
                      action.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
                    ).join(', ')}
                  </td>
                  <td style={{ padding: '12px', border: '1px solid #e2e8f0' }}>
                    <button
                      onClick={() => handleEdit(level)}
                      style={{
                        marginRight: '8px',
                        padding: '4px 8px',
                        backgroundColor: '#3182ce',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(level.id)}
                      style={{
                        padding: '4px 8px',
                        backgroundColor: '#e53e3e',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {message && (
        <div style={{
          marginTop: '16px',
          padding: '12px',
          backgroundColor: message.includes('Error') || message.includes('Failed') ? '#fed7d7' : '#c6f6d5',
          border: `1px solid ${message.includes('Error') || message.includes('Failed') ? '#e53e3e' : '#38a169'}`,
          borderRadius: '4px',
          color: message.includes('Error') || message.includes('Failed') ? '#c53030' : '#276749'
        }}>
          {message}
        </div>
      )}

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default AccessLevelManager;