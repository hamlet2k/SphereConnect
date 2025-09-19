import React, { useState, useEffect } from 'react';
import { useGuild } from '../contexts/GuildContext';

interface Rank {
  id: string;
  name: string;
  access_levels: string[];
  phonetic?: string;
}

interface AccessLevel {
  id: string;
  name: string;
  user_actions: string[];
}

function RanksManager() {
  const [ranks, setRanks] = useState<Rank[]>([]);
  const [accessLevels, setAccessLevels] = useState<AccessLevel[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingRank, setEditingRank] = useState<Rank | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    access_levels: [] as string[]
  });
  const [message, setMessage] = useState('');

  const { currentGuildId } = useGuild();
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (currentGuildId) {
      loadRanks();
      loadAccessLevels();
    }
  }, [currentGuildId]);

  const loadRanks = async () => {
    setLoading(true);
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const response = await fetch(`http://localhost:8000/api/admin/ranks?guild_id=${currentGuildId}`, { headers });

      if (response.ok) {
        const data = await response.json();
        setRanks(data);
      } else if (response.status === 403) {
        setMessage('Insufficient permissions to manage ranks. You need manage_ranks permission.');
        setRanks([]);
      } else {
        setMessage('Failed to load ranks');
      }
    } catch (error) {
      setMessage('Error loading ranks');
    } finally {
      setLoading(false);
    }
  };

  const loadAccessLevels = async () => {
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const response = await fetch(`http://localhost:8000/api/admin/access-levels?guild_id=${currentGuildId}`, { headers });

      if (response.ok) {
        const data = await response.json();
        setAccessLevels(data);
      } else {
        // Access levels are optional for display, don't show error
        setAccessLevels([]);
      }
    } catch (error) {
      // Access levels are optional for display, don't show error
      setAccessLevels([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setMessage('Rank name is required');
      return;
    }

    // Confirmation dialog for changes
    const action = editingRank ? 'update' : 'create';
    const confirmed = window.confirm(
      `Are you sure you want to ${action} this rank? This will affect user permissions.`
    );

    if (!confirmed) {
      return;
    }

    try {
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      };

      const url = editingRank
        ? `http://localhost:8000/api/admin/ranks/${editingRank.id}`
        : 'http://localhost:8000/api/admin/ranks';

      const method = editingRank ? 'PATCH' : 'POST';
      const body = JSON.stringify({
        ...formData,
        guild_id: currentGuildId
      });

      const response = await fetch(url, { method, headers, body });

      if (response.ok) {
        const result = await response.json();
        setMessage(result.message || `Rank ${editingRank ? 'updated' : 'created'} successfully`);
        setShowForm(false);
        setEditingRank(null);
        setFormData({ name: '', access_levels: [] });
        loadRanks();
      } else if (response.status === 403) {
        setMessage('Insufficient permissions to manage ranks. You need manage_ranks permission.');
      } else {
        const error = await response.json();
        setMessage(error.detail || 'Failed to save rank');
      }
    } catch (error) {
      setMessage('Error saving rank');
    }
  };

  const handleEdit = (rank: Rank) => {
    setEditingRank(rank);
    setFormData({
      name: rank.name,
      access_levels: [...rank.access_levels]
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm(
      'Are you sure you want to delete this rank? This will affect users assigned to this rank.'
    );

    if (!confirmed) {
      return;
    }

    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const response = await fetch(`http://localhost:8000/api/admin/ranks/${id}`, {
        method: 'DELETE',
        headers
      });

      if (response.ok) {
        const result = await response.json();
        setMessage(result.message || 'Rank deleted successfully');
        loadRanks();
      } else if (response.status === 403) {
        setMessage('Insufficient permissions to manage ranks. You need manage_ranks permission.');
      } else if (response.status === 409) {
        const error = await response.json();
        setMessage(error.detail || 'Cannot delete rank that is assigned to users');
      } else {
        const error = await response.json();
        setMessage(error.detail || 'Failed to delete rank');
      }
    } catch (error) {
      setMessage('Error deleting rank');
    }
  };

  const handleAccessLevelToggle = (accessLevelId: string) => {
    setFormData(prev => ({
      ...prev,
      access_levels: prev.access_levels.includes(accessLevelId)
        ? prev.access_levels.filter(id => id !== accessLevelId)
        : [...prev.access_levels, accessLevelId]
    }));
  };

  const getAccessLevelName = (id: string) => {
    const level = accessLevels.find(al => al.id === id);
    return level ? level.name : id;
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingRank(null);
    setFormData({ name: '', access_levels: [] });
    setMessage('');
  };

  if (!token) {
    return <div>Access denied. Please login first.</div>;
  }

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h3 style={{ margin: 0 }}>Ranks Management</h3>
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
          Create Rank
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
            {editingRank ? 'Edit Rank' : 'Create New Rank'}
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
                placeholder="Enter rank name (e.g., Recruit, NCO, Commander)"
                required
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                Access Levels:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' }}>
                {accessLevels.map(level => (
                  <label key={level.id} style={{ display: 'flex', alignItems: 'center' }}>
                    <input
                      type="checkbox"
                      checked={formData.access_levels.includes(level.id)}
                      onChange={() => handleAccessLevelToggle(level.id)}
                      style={{ marginRight: '8px' }}
                    />
                    {level.name}
                  </label>
                ))}
                {accessLevels.length === 0 && (
                  <p style={{ color: '#718096', fontStyle: 'italic' }}>
                    No access levels available. Create access levels first.
                  </p>
                )}
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
                {editingRank ? 'Update' : 'Create'}
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
          <p>Loading ranks...</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f7fafc' }}>
                <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #e2e8f0' }}>Name</th>
                <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #e2e8f0' }}>Access Levels</th>
                <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #e2e8f0' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {ranks.map(rank => (
                <tr key={rank.id}>
                  <td style={{ padding: '12px', border: '1px solid #e2e8f0' }}>{rank.name}</td>
                  <td style={{ padding: '12px', border: '1px solid #e2e8f0' }}>
                    {rank.access_levels.map(id => getAccessLevelName(id)).join(', ')}
                  </td>
                  <td style={{ padding: '12px', border: '1px solid #e2e8f0' }}>
                    <button
                      onClick={() => handleEdit(rank)}
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
                      onClick={() => handleDelete(rank.id)}
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

export default RanksManager;