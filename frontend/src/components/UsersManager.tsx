import React, { useState, useEffect } from 'react';
import { useGuild } from '../contexts/GuildContext';

interface User {
  id: string;
  name: string;
  username: string;
  email?: string;
  rank?: string;
  availability: string;
  phonetic?: string;
  created_at?: string;
}

interface Rank {
  id: string;
  name: string;
  access_levels: string[];
}

interface AccessLevel {
  id: string;
  name: string;
  user_actions: string[];
}

function UsersManager() {
  const [users, setUsers] = useState<User[]>([]);
  const [ranks, setRanks] = useState<Rank[]>([]);
  const [accessLevels, setAccessLevels] = useState<AccessLevel[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    pin: '',
    rank_id: '',
    phonetic: '',
    availability: 'offline'
  });
  const [message, setMessage] = useState('');

  const { currentGuildId } = useGuild();
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (currentGuildId) {
      loadUsers();
      loadRanks();
      loadAccessLevels();
    }
  }, [currentGuildId]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const response = await fetch(`http://localhost:8000/api/admin/users?guild_id=${currentGuildId}`, { headers });

      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      } else if (response.status === 403) {
        setMessage('Insufficient permissions to manage users. You need manage_users permission.');
        setUsers([]);
      } else {
        setMessage('Failed to load users');
      }
    } catch (error) {
      setMessage('Error loading users');
    } finally {
      setLoading(false);
    }
  };

  const loadRanks = async () => {
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const response = await fetch(`http://localhost:8000/api/admin/ranks?guild_id=${currentGuildId}`, { headers });

      if (response.ok) {
        const data = await response.json();
        setRanks(data);
      } else {
        setRanks([]);
      }
    } catch (error) {
      setRanks([]);
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
        setAccessLevels([]);
      }
    } catch (error) {
      setAccessLevels([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.username.trim()) {
      setMessage('Name and username are required');
      return;
    }

    if (!editingUser && (!formData.password || !formData.pin)) {
      setMessage('Password and PIN are required for new users');
      return;
    }

    // Confirmation dialog for changes
    const action = editingUser ? 'update' : 'create';
    const confirmed = window.confirm(
      `Are you sure you want to ${action} this user? ${editingUser ? 'This will update their information.' : 'This will create a new user account.'}`
    );

    if (!confirmed) {
      return;
    }

    try {
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      };

      const url = editingUser
        ? `http://localhost:8000/api/admin/users/${editingUser.id}`
        : 'http://localhost:8000/api/admin/users';

      const method = editingUser ? 'PUT' : 'POST';
      const body = JSON.stringify({
        ...formData,
        guild_id: currentGuildId
      });

      const response = await fetch(url, { method, headers, body });

      if (response.ok) {
        const result = await response.json();
        setMessage(result.message || `User ${editingUser ? 'updated' : 'created'} successfully`);
        setShowForm(false);
        setEditingUser(null);
        resetForm();
        loadUsers();
      } else if (response.status === 403) {
        setMessage('Insufficient permissions to manage users. You need manage_users permission.');
      } else if (response.status === 409) {
        setMessage('Username already exists in this guild');
      } else {
        const error = await response.json();
        setMessage(error.detail || 'Failed to save user');
      }
    } catch (error) {
      setMessage('Error saving user');
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      username: user.username,
      email: user.email || '',
      password: '', // Don't populate password for security
      pin: '', // Don't populate PIN for security
      rank_id: user.rank || '',
      phonetic: user.phonetic || '',
      availability: user.availability
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm(
      'Are you sure you want to delete this user? This action cannot be undone.'
    );

    if (!confirmed) {
      return;
    }

    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const response = await fetch(`http://localhost:8000/api/admin/users/${id}`, {
        method: 'DELETE',
        headers
      });

      if (response.ok) {
        const result = await response.json();
        setMessage(result.message || 'User deleted successfully');
        loadUsers();
      } else if (response.status === 403) {
        setMessage('Insufficient permissions to manage users. You need manage_users permission.');
      } else if (response.status === 400) {
        setMessage('Cannot delete your own account');
      } else {
        const error = await response.json();
        setMessage(error.detail || 'Failed to delete user');
      }
    } catch (error) {
      setMessage('Error deleting user');
    }
  };

  const handleAssignRank = async (userId: string, rankId: string) => {
    try {
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      };

      const response = await fetch(`http://localhost:8000/api/admin/users/${userId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ rank_id: rankId })
      });

      if (response.ok) {
        setMessage('Rank assigned successfully');
        loadUsers();
      } else {
        setMessage('Failed to assign rank');
      }
    } catch (error) {
      setMessage('Error assigning rank');
    }
  };

  const handleAssignAccess = async (userId: string, accessLevelId: string) => {
    try {
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      };

      const response = await fetch('http://localhost:8000/api/admin/user_access', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          user_id: userId,
          access_level_id: accessLevelId
        })
      });

      if (response.ok) {
        setMessage('Access level assigned successfully');
        loadUsers();
      } else if (response.status === 409) {
        setMessage('User already has this access level');
      } else {
        setMessage('Failed to assign access level');
      }
    } catch (error) {
      setMessage('Error assigning access level');
    }
  };

  const getRankName = (rankId: string) => {
    const rank = ranks.find(r => r.id === rankId);
    return rank ? rank.name : 'N/A';
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingUser(null);
    setFormData({
      name: '',
      username: '',
      email: '',
      password: '',
      pin: '',
      rank_id: '',
      phonetic: '',
      availability: 'offline'
    });
    setMessage('');
  };

  if (!token) {
    return <div>Access denied. Please login first.</div>;
  }

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h3 style={{ margin: 0 }}>Users Management</h3>
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
          Create User
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
            {editingUser ? 'Edit User' : 'Create New User'}
          </h4>

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
              <div>
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
                  placeholder="Enter display name"
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                  Username:
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                  placeholder="Enter login username"
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                  Email:
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                  placeholder="Enter email (optional)"
                />
              </div>

              {!editingUser && (
                <>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                      Password:
                    </label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '8px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '4px',
                        fontSize: '14px'
                      }}
                      placeholder="Enter password"
                      required={!editingUser}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                      PIN:
                    </label>
                    <input
                      type="password"
                      value={formData.pin}
                      onChange={(e) => setFormData(prev => ({ ...prev, pin: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '8px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '4px',
                        fontSize: '14px'
                      }}
                      placeholder="6-digit PIN"
                      maxLength={6}
                      required={!editingUser}
                    />
                  </div>
                </>
              )}

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                  Rank:
                </label>
                <select
                  value={formData.rank_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, rank_id: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                >
                  <option value="">Select Rank</option>
                  {ranks.map(rank => (
                    <option key={rank.id} value={rank.id}>
                      {rank.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                  Availability:
                </label>
                <select
                  value={formData.availability}
                  onChange={(e) => setFormData(prev => ({ ...prev, availability: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                >
                  <option value="offline">Offline</option>
                  <option value="online">Online</option>
                  <option value="busy">Busy</option>
                  <option value="away">Away</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                  Phonetic:
                </label>
                <input
                  type="text"
                  value={formData.phonetic}
                  onChange={(e) => setFormData(prev => ({ ...prev, phonetic: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                  placeholder="Voice recognition name"
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
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
                {editingUser ? 'Update' : 'Create'}
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
          <p>Loading users...</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f7fafc' }}>
                <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #e2e8f0' }}>Name</th>
                <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #e2e8f0' }}>Username</th>
                <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #e2e8f0' }}>Email</th>
                <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #e2e8f0' }}>Rank</th>
                <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #e2e8f0' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id}>
                  <td style={{ padding: '12px', border: '1px solid #e2e8f0' }}>{user.name}</td>
                  <td style={{ padding: '12px', border: '1px solid #e2e8f0' }}>{user.username}</td>
                  <td style={{ padding: '12px', border: '1px solid #e2e8f0' }}>{user.email || 'N/A'}</td>
                  <td style={{ padding: '12px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>{getRankName(user.rank || '')}</span>
                      <select
                        value=""
                        onChange={(e) => {
                          if (e.target.value) {
                            handleAssignRank(user.id, e.target.value);
                            e.target.value = ''; // Reset select
                          }
                        }}
                        style={{
                          padding: '2px 4px',
                          fontSize: '12px',
                          border: '1px solid #e2e8f0',
                          borderRadius: '3px'
                        }}
                      >
                        <option value="">Assign Rank</option>
                        {ranks.map(rank => (
                          <option key={rank.id} value={rank.id}>
                            {rank.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </td>
                  <td style={{ padding: '12px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          onClick={() => handleEdit(user)}
                          style={{
                            padding: '4px 8px',
                            backgroundColor: '#3182ce',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(user.id)}
                          style={{
                            padding: '4px 8px',
                            backgroundColor: '#e53e3e',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          Delete
                        </button>
                      </div>
                      <select
                        value=""
                        onChange={(e) => {
                          if (e.target.value) {
                            handleAssignAccess(user.id, e.target.value);
                            e.target.value = ''; // Reset select
                          }
                        }}
                        style={{
                          padding: '2px 4px',
                          fontSize: '12px',
                          border: '1px solid #e2e8f0',
                          borderRadius: '3px'
                        }}
                      >
                        <option value="">Assign Access</option>
                        {accessLevels.map(level => (
                          <option key={level.id} value={level.id}>
                            {level.name}
                          </option>
                        ))}
                      </select>
                    </div>
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

export default UsersManager;