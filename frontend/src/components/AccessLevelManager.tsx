import React, { useState, useEffect, useMemo } from 'react';
import { useGuild } from '../contexts/GuildContext';
import { theme } from '../theme';
import { adminPageStyles } from './AdminPageStyles';
import AdminMessage from './AdminMessage';
import ConfirmModal from './ConfirmModal';
import { useAdminMessage } from '../hooks/useAdminMessage';
import { useConfirmModal } from '../hooks/useConfirmModal';
import api from '../api';
import { parseApiError } from '../utils/errorUtils';

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
  'view_objectives',
  'create_objective',
  'manage_objectives',
  'manage_rbac',
  'view_ranks',
  'manage_ranks',
  'view_categories',
  'create_category',
  'manage_categories'
];

function AccessLevelManager() {
  const [accessLevels, setAccessLevels] = useState<AccessLevel[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingLevel, setEditingLevel] = useState<AccessLevel | null>(null);
  const createInitialFormData = () => ({
    name: '',
    user_actions: [] as string[]
  });
  const [formData, setFormData] = useState(createInitialFormData());
  const { message, showMessage, clearMessage } = useAdminMessage();
  const { confirmConfig, requestConfirmation, confirm: confirmModalConfirm, cancel: confirmModalCancel } = useConfirmModal();

  const { currentGuildId } = useGuild();
  const hasToken = useMemo(() => Boolean(localStorage.getItem('token')), []);

  useEffect(() => {
    if (currentGuildId && hasToken) {
      loadAccessLevels();
    }
  }, [currentGuildId, hasToken]);

  const loadAccessLevels = async () => {
    if (!currentGuildId || !hasToken) {
      return;
    }
    setLoading(true);
    try {
      const response = await api.get<AccessLevel[]>(`/admin/access-levels?guild_id=${currentGuildId}`);
      setAccessLevels(response.data);
    } catch (error) {
      const { status, detail } = parseApiError(error);
      if (status === 403) {
        showMessage('error', 'Insufficient permissions to manage access levels. You need manage_rbac permission.');
        setAccessLevels([]);
      } else {
        showMessage('error', detail || 'Failed to load access levels');
      }
    } finally {
      setLoading(false);
    }
  };

  const submitAccessLevel = async () => {
    if (!currentGuildId || !hasToken) {
      return;
    }

    try {

      const payload = {
        ...formData,
        guild_id: currentGuildId
      };

      const response = editingLevel
        ? await api.patch(`/admin/access-levels/${editingLevel.id}`, payload)
        : await api.post('/admin/access-levels', payload);

      const result = response.data as { message?: string };

      showMessage('success', result.message || `Access level ${editingLevel ? 'updated' : 'created'} successfully`);

      setShowForm(false);

      setEditingLevel(null);

      setFormData(createInitialFormData());

      loadAccessLevels();

    } catch (error) {
      const { status, detail } = parseApiError(error);
      if (status === 403) {
        showMessage('error', 'Insufficient permissions to manage access levels. You need manage_rbac permission.');
        return;
      }
      showMessage('error', detail || 'Error saving access level');

    }

  };

  const handleSubmit = (e: React.FormEvent) => {

    e.preventDefault();

    if (!formData.name.trim() || formData.user_actions.length === 0) {

      showMessage('error', 'Name and at least one user action are required');

      return;

    }

    const action = editingLevel ? 'update' : 'create';

    requestConfirmation({
      title: `${editingLevel ? 'Update' : 'Create'} Access Level`,
      message: `Are you sure you want to ${action} this access level? This will change user permissions.`,
      confirmLabel: editingLevel ? 'Update' : 'Create',
      onConfirm: submitAccessLevel
    });

  };

  const handleEdit = (level: AccessLevel) => {
    setEditingLevel(level);
    setFormData({
      name: level.name,
      user_actions: [...level.user_actions]
    });
    setShowForm(true);
  };

  const deleteAccessLevel = async (levelId: string) => {
    if (!hasToken) {
      return;
    }
    try {
      const response = await api.delete(`/admin/access-levels/${levelId}`);
      const result = response.data as { message?: string };
      showMessage('success', result.message || 'Access level deleted successfully');
      loadAccessLevels();
    } catch (error) {
      const { status, detail } = parseApiError(error);
      if (status === 403) {
        showMessage('error', 'Insufficient permissions to manage access levels. You need manage_rbac permission.');
        return;
      }

      showMessage('error', detail || 'Error deleting access level');
    }
  };

  const handleDelete = (id: string) => {
    requestConfirmation({
      title: 'Delete Access Level',
      message: 'Are you sure you want to delete this access level?',
      confirmLabel: 'Delete',
      onConfirm: () => deleteAccessLevel(id)
    });
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
    clearMessage();
  };

  if (!hasToken) {
    return <div>Access denied. Please login first.</div>;
  }

  return (
    <div style={adminPageStyles.container}>
      <div style={adminPageStyles.header}>
        <h3 style={adminPageStyles.title}>
          Access Levels Management
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
          Create Access Level
        </button>
      </div>

      {showForm && (
        <div style={adminPageStyles.formContainer}>
          <h4 style={adminPageStyles.formTitle}>
            {editingLevel ? 'Edit Access Level' : 'Create New Access Level'}
          </h4>

          <form onSubmit={handleSubmit}>
            <div style={adminPageStyles.formField}>
              <label style={adminPageStyles.formLabel}>
                Name:
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                style={adminPageStyles.formInput}
                placeholder="Enter access level name"
                required
              />
            </div>

            <div style={adminPageStyles.formField}>
              <label style={adminPageStyles.formLabel}>
                User Actions:
              </label>
              <div style={adminPageStyles.checkboxGrid}>
                {USER_ACTIONS.map(action => (
                  <label key={action} style={adminPageStyles.checkboxItem}>
                    <input
                      type="checkbox"
                      checked={formData.user_actions.includes(action)}
                      onChange={() => handleActionToggle(action)}
                      style={{ marginRight: theme.spacing[2] }}
                    />
                    <span style={{
                      color: theme.colors.text,
                      fontSize: theme.typography.fontSize.sm
                    }}>
                      {action.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                  </label>
                ))}
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
                {editingLevel ? 'Update' : 'Create'}
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
            Loading access levels...
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
                  User Actions
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
              {accessLevels.map(level => (
                <tr key={level.id} style={{
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
                    {level.name}
                  </td>
                  <td style={{
                    padding: theme.spacing[4],
                    color: theme.colors.textSecondary
                  }}>
                    {level.user_actions.map(action =>
                      action.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
                    ).join(', ')}
                  </td>
                  <td style={{
                    padding: theme.spacing[4]
                  }}>
                    {level.name === 'super_admin' ? (
                      <span style={{
                        color: theme.colors.textMuted,
                        fontStyle: 'italic',
                        fontSize: theme.typography.fontSize.sm
                      }}>
                        Immutable (Full Access)
                      </span>
                    ) : (
                      <div style={{
                        display: 'flex',
                        gap: theme.spacing[2],
                        flexWrap: 'wrap'
                      }}>
                        <button
                          onClick={() => handleEdit(level)}
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
                          onClick={() => handleDelete(level.id)}
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
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {accessLevels.length === 0 && !loading && (
        <div style={{
          textAlign: 'center',
          padding: theme.spacing[8],
          color: theme.colors.textMuted,
          fontSize: theme.typography.fontSize.sm
        }}>
          No access levels found. Create your first access level to get started.
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

export default AccessLevelManager;

