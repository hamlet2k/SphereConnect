import React, { useState, useEffect } from 'react';
import { useGuild } from '../contexts/GuildContext';
import { theme } from '../theme';
import { adminPageStyles } from './AdminPageStyles';
import AdminMessage from './AdminMessage';
import ConfirmModal from './ConfirmModal';
import { useAdminMessage } from '../hooks/useAdminMessage';
import { useConfirmModal } from '../hooks/useConfirmModal';

interface Rank {
  id: string;
  name: string;
  phonetic?: string;
  hierarchy_level: number;
  access_levels: string[];
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
    phonetic: '',
    hierarchy_level: 1,
    access_levels: [] as string[]
  });
  const { message, showMessage, clearMessage } = useAdminMessage();
  const { confirmConfig, requestConfirmation, confirm: confirmModalConfirm, cancel: confirmModalCancel } = useConfirmModal();

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
        showMessage('error', 'Insufficient permissions to manage ranks. You need manage_ranks permission.');
        setRanks([]);
      } else {
        showMessage('error', 'Failed to load ranks');
      }
    } catch (error) {
      showMessage('error', 'Error loading ranks');
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

  const submitRank = async () => {

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

        showMessage('success', result.message || `Rank ${editingRank ? 'updated' : 'created'} successfully`);

        setShowForm(false);

        setEditingRank(null);

        setFormData({ name: '', phonetic: '', hierarchy_level: 1, access_levels: [] });

        loadRanks();

      } else if (response.status === 403) {

        showMessage('error', 'Insufficient permissions to manage ranks. You need manage_ranks permission.');

      } else {

        const error = await response.json();

        showMessage('error', error.detail || 'Failed to save rank');

      }

    } catch (error) {

      showMessage('error', 'Error saving rank');

    }

  };



  const handleSubmit = (e: React.FormEvent) => {

    e.preventDefault();

    if (!formData.name.trim()) {

      showMessage('error', 'Rank name is required');

      return;

    }



    const action = editingRank ? 'update' : 'create';

    requestConfirmation({

      title: `${editingRank ? 'Update' : 'Create'} Rank`,

      message: `Are you sure you want to ${action} this rank? This will affect user permissions.`,

      confirmLabel: editingRank ? 'Update' : 'Create',

      onConfirm: submitRank

    });

  };



  const handleEdit = (rank: Rank) => {
    setEditingRank(rank);
    setFormData({
      name: rank.name,
      phonetic: rank.phonetic || '',
      hierarchy_level: rank.hierarchy_level,
      access_levels: [...rank.access_levels]
    });
    setShowForm(true);
  };

  const deleteRank = async (id: string) => {

    try {

      const headers = { 'Authorization': `Bearer ${token}` };

      const response = await fetch(`http://localhost:8000/api/admin/ranks/${id}`, {

        method: 'DELETE',

        headers

      });



      if (response.ok) {

        const result = await response.json();

        showMessage('success', result.message || 'Rank deleted successfully');

        loadRanks();

      } else if (response.status === 403) {

        showMessage('error', 'Insufficient permissions to manage ranks. You need manage_ranks permission.');

      } else if (response.status === 409) {

        const error = await response.json();

        showMessage('error', error.detail || 'Cannot delete rank that is assigned to users');

      } else {

        const error = await response.json();

        showMessage('error', error.detail || 'Failed to delete rank');

      }

    } catch (error) {

      showMessage('error', 'Error deleting rank');

    }

  };



  const handleDelete = (id: string) => {

    requestConfirmation({

      title: 'Delete Rank',

      message: 'Are you sure you want to delete this rank? This action cannot be undone.',

      confirmLabel: 'Delete',

      onConfirm: () => deleteRank(id)

    });

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
    setFormData({ name: '', phonetic: '', hierarchy_level: 1, access_levels: [] });
    clearMessage();
  };

  if (!token) {
    return <div>Access denied. Please login first.</div>;
  }

  return (
    <div style={adminPageStyles.container}>
      <div style={adminPageStyles.header}>
        <h3 style={adminPageStyles.title}>
          Ranks Management
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
          Create Rank
        </button>
      </div>

      {showForm && (
        <div style={adminPageStyles.formContainer}>
          <h4 style={adminPageStyles.formTitle}>
            {editingRank ? 'Edit Rank' : 'Create New Rank'}
          </h4>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: theme.spacing[4] }}>
              <label style={{
                display: 'block',
                marginBottom: theme.spacing[2],
                fontWeight: theme.typography.fontWeight.bold,
                color: theme.colors.text,
                fontSize: theme.typography.fontSize.sm
              }}>
                Name:
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                style={{
                  width: '100%',
                  padding: `${theme.spacing[2]} ${theme.spacing[3]}`,
                  backgroundColor: theme.colors.background,
                  border: `2px solid ${theme.colors.border}`,
                  borderRadius: theme.borderRadius.lg,
                  color: theme.colors.text,
                  fontSize: theme.typography.fontSize.sm,
                  outline: 'none',
                  transition: 'all 0.2s ease-in-out'
                }}
                placeholder="Enter rank name (e.g., Recruit, NCO, Commander)"
                required
              />
            </div>

            <div style={{ marginBottom: theme.spacing[4] }}>
              <label style={{
                display: 'block',
                marginBottom: theme.spacing[2],
                fontWeight: theme.typography.fontWeight.bold,
                color: theme.colors.text,
                fontSize: theme.typography.fontSize.sm
              }}>
                Phonetic:
              </label>
              <input
                type="text"
                value={formData.phonetic}
                onChange={(e) => setFormData(prev => ({ ...prev, phonetic: e.target.value }))}
                style={{
                  width: '100%',
                  padding: `${theme.spacing[2]} ${theme.spacing[3]}`,
                  backgroundColor: theme.colors.background,
                  border: `2px solid ${theme.colors.border}`,
                  borderRadius: theme.borderRadius.lg,
                  color: theme.colors.text,
                  fontSize: theme.typography.fontSize.sm,
                  outline: 'none',
                  transition: 'all 0.2s ease-in-out'
                }}
                placeholder="Enter phonetic pronunciation (optional)"
              />
            </div>

            <div style={{ marginBottom: theme.spacing[4] }}>
              <label style={{
                display: 'block',
                marginBottom: theme.spacing[2],
                fontWeight: theme.typography.fontWeight.bold,
                color: theme.colors.text,
                fontSize: theme.typography.fontSize.sm
              }}>
                Hierarchy Level:
              </label>
              <input
                type="number"
                value={formData.hierarchy_level}
                onChange={(e) => setFormData(prev => ({ ...prev, hierarchy_level: parseInt(e.target.value) || 1 }))}
                style={{
                  width: '100%',
                  padding: `${theme.spacing[2]} ${theme.spacing[3]}`,
                  backgroundColor: theme.colors.background,
                  border: `2px solid ${theme.colors.border}`,
                  borderRadius: theme.borderRadius.lg,
                  color: theme.colors.text,
                  fontSize: theme.typography.fontSize.sm,
                  outline: 'none',
                  transition: 'all 0.2s ease-in-out'
                }}
                placeholder="Enter hierarchy level (lower number = higher rank)"
                min="1"
                required
              />
              <small style={{
                color: theme.colors.textMuted,
                fontSize: theme.typography.fontSize.xs,
                marginTop: theme.spacing[1],
                display: 'block'
              }}>
                Lower numbers indicate higher ranks (e.g., Commander = 1, Recruit = 6)
              </small>
            </div>

            <div style={{ marginBottom: theme.spacing[4] }}>
              <label style={{
                display: 'block',
                marginBottom: theme.spacing[2],
                fontWeight: theme.typography.fontWeight.bold,
                color: theme.colors.text,
                fontSize: theme.typography.fontSize.sm
              }}>
                Access Levels:
              </label>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: theme.spacing[2]
              }}>
                {accessLevels.map(level => (
                  <label key={level.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: theme.spacing[2],
                    backgroundColor: theme.colors.surface,
                    borderRadius: theme.borderRadius.md,
                    border: `1px solid ${theme.colors.border}`,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease-in-out'
                  }}>
                    <input
                      type="checkbox"
                      checked={formData.access_levels.includes(level.id)}
                      onChange={() => handleAccessLevelToggle(level.id)}
                      style={{
                        marginRight: theme.spacing[2],
                        accentColor: theme.colors.primary
                      }}
                    />
                    <span style={{
                      color: theme.colors.text,
                      fontSize: theme.typography.fontSize.sm
                    }}>
                      {level.name}
                    </span>
                  </label>
                ))}
                {accessLevels.length === 0 && (
                  <p style={{
                    color: theme.colors.textMuted,
                    fontStyle: 'italic',
                    fontSize: theme.typography.fontSize.sm
                  }}>
                    No access levels available. Create access levels first.
                  </p>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: theme.spacing[2] }}>
              <button
                type="submit"
                style={{
                  padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
                  backgroundColor: theme.colors.primary,
                  color: theme.colors.background,
                  border: 'none',
                  borderRadius: theme.borderRadius.lg,
                  fontSize: theme.typography.fontSize.sm,
                  fontWeight: theme.typography.fontWeight.semibold,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease-in-out',
                  boxShadow: `0 0 10px ${theme.colors.primary}40`
                }}
                onMouseEnter={(e) => {
                  (e.target as HTMLElement).style.backgroundColor = theme.colors.primaryHover;
                  (e.target as HTMLElement).style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLElement).style.backgroundColor = theme.colors.primary;
                  (e.target as HTMLElement).style.transform = 'translateY(0)';
                }}
              >
                {editingRank ? 'Update' : 'Create'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                style={{
                  padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
                  backgroundColor: theme.colors.surfaceHover,
                  color: theme.colors.text,
                  border: 'none',
                  borderRadius: theme.borderRadius.lg,
                  fontSize: theme.typography.fontSize.sm,
                  fontWeight: theme.typography.fontWeight.medium,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease-in-out'
                }}
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
            Loading ranks...
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
                  Hierarchy Level
                </th>
                <th style={{
                  padding: theme.spacing[4],
                  textAlign: 'left',
                  color: theme.colors.text,
                  fontWeight: theme.typography.fontWeight.semibold,
                  fontSize: theme.typography.fontSize.sm
                }}>
                  Access Levels
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
              {ranks.map(rank => (
                <tr key={rank.id} style={{
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
                    {rank.name}
                  </td>
                  <td style={{
                    padding: theme.spacing[4],
                    color: theme.colors.textSecondary
                  }}>
                    {rank.hierarchy_level}
                  </td>
                  <td style={{
                    padding: theme.spacing[4],
                    color: theme.colors.textSecondary
                  }}>
                    {rank.access_levels.map(id => getAccessLevelName(id)).join(', ')}
                  </td>
                  <td style={{
                    padding: theme.spacing[4]
                  }}>
                    <div style={{
                      display: 'flex',
                      gap: theme.spacing[2],
                      flexWrap: 'wrap'
                    }}>
                      <button
                        onClick={() => handleEdit(rank)}
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
                        onClick={() => handleDelete(rank.id)}
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

      {ranks.length === 0 && !loading && (
        <div style={{
          textAlign: 'center',
          padding: theme.spacing[8],
          color: theme.colors.textMuted,
          fontSize: theme.typography.fontSize.sm
        }}>
          No ranks found. Create your first rank to get started.
        </div>
      )}

      {message && (
        <AdminMessage
          type={message.type}
          message={message.text}
          onClose={clearMessage}
        />
      )}

      {confirmConfig && (
        <ConfirmModal
          isOpen
          title={confirmConfig.title}
          message={confirmConfig.message}
          onConfirm={confirmModalConfirm}
          onCancel={confirmModalCancel}
          confirmLabel={confirmConfig.confirmLabel}
          cancelLabel={confirmConfig.cancelLabel}
        />
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
