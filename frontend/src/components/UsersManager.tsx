import React, { useState, useEffect } from 'react';
import { useGuild } from '../contexts/GuildContext';
import { theme } from '../theme';
import { adminPageStyles, getMessageStyle } from './AdminPageStyles';

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
    access_levels: [] as string[],
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
        const userId = result.user_id || editingUser?.id;

        // Handle access levels assignment/removal
        if (userId) {
          await handleAccessLevelsUpdate(userId, formData.access_levels);
        }

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

  const handleEdit = async (user: User) => {
    // Load user's current access levels
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const response = await fetch(`http://localhost:8000/api/admin/user_access/${user.id}`, { headers });

      let accessLevels: string[] = [];
      if (response.ok) {
        const data = await response.json();
        accessLevels = data.access_levels.map((al: any) => al.id);
      }

      setEditingUser(user);
      setFormData({
        name: user.name,
        username: user.username,
        email: user.email || '',
        password: '', // Don't populate password for security
        pin: '', // Don't populate PIN for security
        rank_id: user.rank || '',
        access_levels: accessLevels,
        phonetic: user.phonetic || '',
        availability: user.availability
      });
      setShowForm(true);
    } catch (error) {
      setMessage('Error loading user access levels');
    }
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

  const handleAccessLevelsUpdate = async (userId: string, desiredAccessLevels: string[]) => {
    try {
      // Get current access levels
      const headers = { 'Authorization': `Bearer ${token}` };
      const currentResponse = await fetch(`http://localhost:8000/api/admin/user_access/${userId}`, { headers });

      let currentAccessLevels: string[] = [];
      if (currentResponse.ok) {
        const data = await currentResponse.json();
        currentAccessLevels = data.access_levels.map((al: any) => al.id);
      }

      // Find access levels to add and remove
      const toAdd = desiredAccessLevels.filter(id => !currentAccessLevels.includes(id));
      const toRemove = currentAccessLevels.filter(id => !desiredAccessLevels.includes(id));

      // Add new access levels
      for (const accessLevelId of toAdd) {
        await fetch('http://localhost:8000/api/admin/user_access', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            user_id: userId,
            access_level_id: accessLevelId
          })
        });
      }

      // Remove old access levels
      for (const accessLevelId of toRemove) {
        await fetch(`http://localhost:8000/api/admin/user_access/${userId}/${accessLevelId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      }
    } catch (error) {
      console.error('Error updating access levels:', error);
      // Don't throw error to avoid breaking user creation/update
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
      access_levels: [],
      phonetic: '',
      availability: 'offline'
    });
    setMessage('');
  };

  if (!token) {
    return <div>Access denied. Please login first.</div>;
  }

  return (
    <div style={adminPageStyles.container}>
      <div style={adminPageStyles.header}>
        <h3 style={adminPageStyles.title}>
          Users Management
        </h3>
        <button
          onClick={() => setShowForm(true)}
          style={adminPageStyles.primaryButton}
          onMouseEnter={(e) => {
            (e.target as HTMLElement).style.backgroundColor = '#E55A2B';
            (e.target as HTMLElement).style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLElement).style.backgroundColor = '#FF6B35';
            (e.target as HTMLElement).style.transform = 'translateY(0)';
          }}
        >
          Create User
        </button>
      </div>

      {showForm && (
        <div style={adminPageStyles.formContainer}>
          <h4 style={adminPageStyles.formTitle}>
            {editingUser ? 'Edit User' : 'Create New User'}
          </h4>

          <form onSubmit={handleSubmit}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: theme.spacing[4]
            }}>
              <div style={adminPageStyles.formField}>
                <label style={adminPageStyles.formLabel}>
                  Name:
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  style={adminPageStyles.formInput}
                  placeholder="Enter display name"
                  required
                />
              </div>

              <div style={adminPageStyles.formField}>
                <label style={adminPageStyles.formLabel}>
                  Username:
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                  style={adminPageStyles.formInput}
                  placeholder="Enter login username"
                  required
                />
              </div>

              <div style={adminPageStyles.formField}>
                <label style={adminPageStyles.formLabel}>
                  Email:
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  style={adminPageStyles.formInput}
                  placeholder="Enter email (optional)"
                />
              </div>

              {!editingUser && (
                <>
                  <div style={adminPageStyles.formField}>
                    <label style={adminPageStyles.formLabel}>
                      Password:
                    </label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                      style={adminPageStyles.formInput}
                      placeholder="Enter password"
                      required={!editingUser}
                    />
                  </div>

                  <div style={adminPageStyles.formField}>
                    <label style={adminPageStyles.formLabel}>
                      PIN:
                    </label>
                    <input
                      type="password"
                      value={formData.pin}
                      onChange={(e) => setFormData(prev => ({ ...prev, pin: e.target.value }))}
                      style={adminPageStyles.formInput}
                      placeholder="6-digit PIN"
                      maxLength={6}
                      required={!editingUser}
                    />
                  </div>
                </>
              )}

              <div style={adminPageStyles.formField}>
                <label style={adminPageStyles.formLabel}>
                  Rank:
                </label>
                <select
                  value={formData.rank_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, rank_id: e.target.value }))}
                  style={adminPageStyles.formInput}
                >
                  <option value="">Select Rank</option>
                  {ranks.map(rank => (
                    <option key={rank.id} value={rank.id}>
                      {rank.name}
                    </option>
                  ))}
                </select>
                <p style={adminPageStyles.formHelp}>Users can have only one rank</p>
              </div>

              <div style={adminPageStyles.formField}>
                <label style={adminPageStyles.formLabel}>
                  Access Levels:
                </label>
                <div style={adminPageStyles.checkboxGrid}>
                  {accessLevels.map(level => (
                    <label key={level.id} style={adminPageStyles.checkboxItem}>
                      <input
                        type="checkbox"
                        checked={formData.access_levels.includes(level.id)}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setFormData(prev => ({
                            ...prev,
                            access_levels: checked
                              ? [...prev.access_levels, level.id]
                              : prev.access_levels.filter(id => id !== level.id)
                          }));
                        }}
                        style={{ marginRight: theme.spacing[2] }}
                      />
                      <span style={{ fontSize: theme.typography.fontSize.sm }}>
                        {level.name}
                      </span>
                    </label>
                  ))}
                </div>
                <p style={adminPageStyles.formHelp}>Users can have multiple access levels</p>
              </div>

              <div style={adminPageStyles.formField}>
                <label style={adminPageStyles.formLabel}>
                  Availability:
                </label>
                <select
                  value={formData.availability}
                  onChange={(e) => setFormData(prev => ({ ...prev, availability: e.target.value }))}
                  style={adminPageStyles.formInput}
                >
                  <option value="offline">Offline</option>
                  <option value="online">Online</option>
                  <option value="busy">Busy</option>
                  <option value="away">Away</option>
                </select>
              </div>

              <div style={adminPageStyles.formField}>
                <label style={adminPageStyles.formLabel}>
                  Phonetic:
                </label>
                <input
                  type="text"
                  value={formData.phonetic}
                  onChange={(e) => setFormData(prev => ({ ...prev, phonetic: e.target.value }))}
                  style={adminPageStyles.formInput}
                  placeholder="Voice recognition name"
                />
              </div>
            </div>

            <div style={adminPageStyles.formButtons}>
              <button
                type="submit"
                style={adminPageStyles.formPrimaryButton}
                onMouseEnter={(e) => {
                  (e.target as HTMLElement).style.backgroundColor = theme.colors.primaryHover;
                  (e.target as HTMLElement).style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLElement).style.backgroundColor = theme.colors.primary;
                  (e.target as HTMLElement).style.transform = 'translateY(0)';
                }}
              >
                {editingUser ? 'Update' : 'Create'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                style={adminPageStyles.formSecondaryButton}
                onMouseEnter={(e) => {
                  (e.target as HTMLElement).style.backgroundColor = theme.colors.border;
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLElement).style.backgroundColor = theme.colors.surfaceHover;
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div style={{
          textAlign: 'center',
          padding: theme.spacing[8]
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: `4px solid ${theme.colors.surfaceHover}`,
            borderTop: `4px solid ${theme.colors.primary}`,
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto'
          }}></div>
          <p style={{
            marginTop: theme.spacing[4],
            color: theme.colors.textSecondary,
            fontSize: theme.typography.fontSize.sm
          }}>
            Loading users...
          </p>
        </div>
      ) : (
        <div style={{
          overflowX: 'auto',
          borderRadius: theme.borderRadius.lg,
          border: `1px solid ${theme.colors.border}`
        }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            backgroundColor: theme.colors.surface,
            fontSize: theme.typography.fontSize.sm
          }}>
            <thead>
              <tr style={{
                backgroundColor: theme.colors.surfaceHover,
                borderBottom: `2px solid ${theme.colors.border}`
              }}>
                <th style={{
                  padding: theme.spacing[4],
                  textAlign: 'left',
                  color: theme.colors.text,
                  fontWeight: theme.typography.fontWeight.semibold,
                  fontSize: theme.typography.fontSize.sm
                }}>
                  Name
                </th>
                <th style={{
                  padding: theme.spacing[4],
                  textAlign: 'left',
                  color: theme.colors.text,
                  fontWeight: theme.typography.fontWeight.semibold,
                  fontSize: theme.typography.fontSize.sm
                }}>
                  Username
                </th>
                <th style={{
                  padding: theme.spacing[4],
                  textAlign: 'left',
                  color: theme.colors.text,
                  fontWeight: theme.typography.fontWeight.semibold,
                  fontSize: theme.typography.fontSize.sm
                }}>
                  Email
                </th>
                <th style={{
                  padding: theme.spacing[4],
                  textAlign: 'left',
                  color: theme.colors.text,
                  fontWeight: theme.typography.fontWeight.semibold,
                  fontSize: theme.typography.fontSize.sm
                }}>
                  Rank
                </th>
                <th style={{
                  padding: theme.spacing[4],
                  textAlign: 'left',
                  color: theme.colors.text,
                  fontWeight: theme.typography.fontWeight.semibold,
                  fontSize: theme.typography.fontSize.sm
                }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id} style={{
                  borderBottom: `1px solid ${theme.colors.border}`,
                  transition: 'background-color 0.2s ease-in-out',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  (e.target as HTMLElement).closest('tr')!.style.backgroundColor = theme.colors.surfaceHover;
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLElement).closest('tr')!.style.backgroundColor = 'transparent';
                }}
                >
                  <td style={{
                    padding: theme.spacing[4],
                    color: theme.colors.text,
                    fontWeight: theme.typography.fontWeight.medium
                  }}>
                    {user.name}
                  </td>
                  <td style={{
                    padding: theme.spacing[4],
                    color: theme.colors.textSecondary
                  }}>
                    {user.username}
                  </td>
                  <td style={{
                    padding: theme.spacing[4],
                    color: theme.colors.textSecondary
                  }}>
                    {user.email || 'N/A'}
                  </td>
                  <td style={{
                    padding: theme.spacing[4],
                    color: theme.colors.textSecondary
                  }}>
                    {getRankName(user.rank || '')}
                  </td>
                  <td style={{
                    padding: theme.spacing[4]
                  }}>
                    <div style={{ display: 'flex', gap: theme.spacing[1] }}>
                      <button
                        onClick={() => handleEdit(user)}
                        style={{
                          padding: `${theme.spacing[1]} ${theme.spacing[2]}`,
                          backgroundColor: theme.colors.primary,
                          color: theme.colors.background,
                          border: 'none',
                          borderRadius: theme.borderRadius.sm,
                          fontSize: theme.typography.fontSize.xs,
                          fontWeight: theme.typography.fontWeight.medium,
                          cursor: 'pointer'
                        }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(user.id)}
                        style={{
                          padding: `${theme.spacing[1]} ${theme.spacing[2]}`,
                          backgroundColor: theme.colors.error,
                          color: theme.colors.text,
                          border: 'none',
                          borderRadius: theme.borderRadius.sm,
                          fontSize: theme.typography.fontSize.xs,
                          fontWeight: theme.typography.fontWeight.medium,
                          cursor: 'pointer'
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {users.length === 0 && !loading && (
        <div style={{
          textAlign: 'center',
          padding: theme.spacing[8],
          color: theme.colors.textMuted,
          fontSize: theme.typography.fontSize.sm
        }}>
          No users found. Create your first user to get started.
        </div>
      )}

      {message && (
        <div style={getMessageStyle(message)}>
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