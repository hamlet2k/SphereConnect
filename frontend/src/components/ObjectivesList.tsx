import React, { useState, useEffect, useCallback } from 'react';
import { useObjectivesAPI, Objective } from '../contexts/ObjectivesAPI';
import { useGuild } from '../contexts/GuildContext';
import { theme } from '../theme';
import ObjectiveForm from './ObjectiveForm';
import { adminPageStyles, getMessageStyle } from './AdminPageStyles';

interface ObjectivesListProps {
  onViewObjective: (objective: Objective) => void;
  onDeleteObjective: (objectiveId: string) => void;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

const ObjectivesList: React.FC<ObjectivesListProps> = ({
  onViewObjective,
  onDeleteObjective,
  canCreate,
  canEdit,
  canDelete
}) => {
  const { currentGuildId } = useGuild();
  const { getObjectives } = useObjectivesAPI();

  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [categories, setCategories] = useState<{[id: string]: string}>({});
  const [categoryOptions, setCategoryOptions] = useState<{id: string, name: string}[]>([]);
  const [ranks, setRanks] = useState<{[id: string]: string}>({});

  // Filter states
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryIdFilter, setCategoryIdFilter] = useState('');

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [editingObjective, setEditingObjective] = useState<Objective | null>(null);
  const [formMessage, setFormMessage] = useState('');

  const loadObjectives = useCallback(async () => {
    if (!currentGuildId) return;

    setLoading(true);
    setError('');

    try {
      const filters: { status?: string; category_id?: string } = {};
      if (statusFilter) filters.status = statusFilter;
      if (categoryIdFilter) filters.category_id = categoryIdFilter;

      const data = await getObjectives(currentGuildId, filters);
      console.log('Loaded objectives:', data);
      data.forEach((obj, index) => {
        console.log(`Objective ${index}:`, obj);
        console.log(`Objective ${index} allowed_ranks:`, obj.allowed_ranks);
        console.log(`Objective ${index} allowed_rank_ids:`, obj.allowed_rank_ids);
      });
      setObjectives(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [currentGuildId, getObjectives, statusFilter, categoryIdFilter]);

  const loadCategories = useCallback(async () => {
    if (!currentGuildId) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:8000/api/categories?guild_id=${currentGuildId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        // Create lookup object for displaying names
        const lookup: {[id: string]: string} = {};
        data.forEach((cat: {id: string, name: string}) => {
          lookup[cat.id] = cat.name;
        });
        setCategories(lookup);
        setCategoryOptions(data);
      }
    } catch (err: any) {
      console.error('Error loading categories:', err);
    }
  }, [currentGuildId]);

  const loadRanks = useCallback(async () => {
    if (!currentGuildId) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:8000/api/admin/ranks?guild_id=${currentGuildId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        // Create lookup object for displaying names
        const lookup: {[id: string]: string} = {};
        data.forEach((rank: {id: string, name: string}) => {
          lookup[rank.id] = rank.name;
        });
        setRanks(lookup);
      }
    } catch (err: any) {
      console.error('Error loading ranks:', err);
    }
  }, [currentGuildId]);

  useEffect(() => {
    loadObjectives();
    loadCategories();
    loadRanks();
  }, [loadObjectives, loadCategories, loadRanks]);

  const handleDelete = async (objectiveId: string) => {
    if (window.confirm('Are you sure you want to delete this objective? This action cannot be undone.')) {
      try {
        setError('');
        setSuccessMessage('');
        await onDeleteObjective(objectiveId);
        loadObjectives(); // Refresh list
        setSuccessMessage('Objective deleted successfully');
        setTimeout(() => setSuccessMessage(''), 5000);
      } catch (err: any) {
        setError(err.message);
        setSuccessMessage('');
      }
    }
  };

  const handleCreateObjective = () => {
    setEditingObjective(null);
    setShowForm(true);
    setFormMessage('');
    setError('');
    setSuccessMessage('');
  };

  const handleEditObjective = (objective: Objective) => {
    console.log('Editing objective:', objective);
    console.log('Objective allowed_ranks:', objective.allowed_ranks);
    console.log('Objective allowed_rank_ids:', objective.allowed_rank_ids);
    setEditingObjective(objective);
    setShowForm(true);
    setFormMessage('');
    setError('');
    setSuccessMessage('');
  };

  const handleFormSuccess = (objective: Objective) => {
    setShowForm(false);
    setEditingObjective(null);
    setFormMessage('');
    loadObjectives(); // Refresh list
    setSuccessMessage(`Objective ${editingObjective ? 'updated' : 'created'} successfully`);
    setError(''); // Clear any existing error

    // Auto-clear success message after 5 seconds
    setTimeout(() => {
      setSuccessMessage('');
    }, 5000);
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingObjective(null);
    setFormMessage('');
  };

  const getStatusColor = (progress: any) => {
    const status = progress?.status || 'active';
    switch (status) {
      case 'completed': return theme.colors.success;
      case 'cancelled': return theme.colors.error;
      case 'in_progress': return theme.colors.warning;
      default: return theme.colors.info;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'critical': return theme.colors.error;
      case 'high': return '#E53E3E';
      case 'medium': return theme.colors.warning;
      case 'low': return theme.colors.success;
      default: return theme.colors.textSecondary;
    }
  };

  const resolveCategoryNames = (ids: string[]) =>
    ids.map(id => categories[id] || id);

  const resolveRankNames = (ids: string[]) =>
    ids.map(id => ranks[id] || id);

  return (
    <div style={{
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.xl,
      padding: theme.spacing[6],
      border: `1px solid ${theme.colors.border}`,
      boxShadow: theme.shadows.lg
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing[6]
      }}>
        <h3 style={{
          margin: 0,
          color: theme.colors.primary,
          fontSize: theme.typography.fontSize.xl,
          fontWeight: theme.typography.fontWeight.bold,
          textShadow: theme.shadows.neon
        }}>
          Objectives Management
        </h3>
        {canCreate && (
          <button
            onClick={handleCreateObjective}
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
            Create Objective
          </button>
        )}
      </div>

      {showForm && (
        <div style={{ marginBottom: theme.spacing[6] }}>
          <ObjectiveForm
            objective={editingObjective || undefined}
            guildId={currentGuildId || ''}
            onSuccess={handleFormSuccess}
            onCancel={handleFormCancel}
            isOpen={showForm}
            modal={false}
          />
        </div>
      )}

      {/* Filters */}
      <div style={{
        display: 'flex',
        gap: theme.spacing[4],
        marginBottom: theme.spacing[6],
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[1] }}>
          <label style={{
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.medium,
            color: theme.colors.textSecondary
          }}>
            Status Filter
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: `${theme.spacing[2]} ${theme.spacing[3]}`,
              backgroundColor: theme.colors.background,
              border: `2px solid ${theme.colors.border}`,
              borderRadius: theme.borderRadius.lg,
              color: theme.colors.text,
              fontSize: theme.typography.fontSize.sm,
              cursor: 'pointer',
              outline: 'none'
            }}
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[1] }}>
          <label style={{
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.medium,
            color: theme.colors.textSecondary
          }}>
            Category Filter
          </label>
          <select
            value={categoryIdFilter}
            onChange={(e) => setCategoryIdFilter(e.target.value)}
            style={{
              padding: `${theme.spacing[2]} ${theme.spacing[3]}`,
              backgroundColor: theme.colors.background,
              border: `2px solid ${theme.colors.border}`,
              borderRadius: theme.borderRadius.lg,
              color: theme.colors.text,
              fontSize: theme.typography.fontSize.sm,
              cursor: 'pointer',
              outline: 'none'
            }}
          >
            <option value="">All Categories</option>
            {categoryOptions.map(category => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div style={getMessageStyle(error)}>
          {error}
        </div>
      )}

      {successMessage && (
        <div style={getMessageStyle(successMessage)}>
          {successMessage}
        </div>
      )}

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
                Priority
              </th>
              <th style={{
                padding: theme.spacing[4],
                textAlign: 'left',
                color: theme.colors.text,
                fontWeight: theme.typography.fontWeight.semibold,
                fontSize: theme.typography.fontSize.sm
              }}>
                Status
              </th>
              <th style={{
                padding: theme.spacing[4],
                textAlign: 'left',
                color: theme.colors.text,
                fontWeight: theme.typography.fontWeight.semibold,
                fontSize: theme.typography.fontSize.sm
              }}>
                Categories
              </th>
              <th style={{
                padding: theme.spacing[4],
                textAlign: 'left',
                color: theme.colors.text,
                fontWeight: theme.typography.fontWeight.semibold,
                fontSize: theme.typography.fontSize.sm
              }}>
                Allowed Ranks
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
            {objectives.map(objective => {
              const status = objective.progress?.status || 'active';
              return (
                <tr key={objective.id} style={{
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
                    {objective.name}
                  </td>
                  <td style={{
                    padding: theme.spacing[4],
                    color: getPriorityColor(objective.priority),
                    fontWeight: theme.typography.fontWeight.medium
                  }}>
                    {objective.priority}
                  </td>
                  <td style={{
                    padding: theme.spacing[4],
                    color: getStatusColor(objective.progress),
                    fontWeight: theme.typography.fontWeight.medium
                  }}>
                    {status.replace('_', ' ').toUpperCase()}
                  </td>
                  <td style={{
                    padding: theme.spacing[4],
                    color: theme.colors.textSecondary
                  }}>
                    {objective.categories.length > 0 ? resolveCategoryNames(objective.categories).join(', ') : 'None'}
                  </td>
                  <td style={{
                    padding: theme.spacing[4],
                    color: theme.colors.textSecondary
                  }}>
                    {objective.allowed_ranks?.length ? objective.allowed_ranks.join(', ') : 'None'}
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
                        onClick={() => {
                          // Create a display version with category names resolved
                          const displayObjective = {
                            ...objective,
                            categories: resolveCategoryNames(objective.categories)
                          };
                          onViewObjective(displayObjective);
                        }}
                        style={{
                          padding: `${theme.spacing[1]} ${theme.spacing[2]}`,
                          backgroundColor: theme.colors.info,
                          color: theme.colors.text,
                          border: 'none',
                          borderRadius: theme.borderRadius.sm,
                          fontSize: theme.typography.fontSize.xs,
                          fontWeight: theme.typography.fontWeight.medium,
                          cursor: 'pointer'
                        }}
                      >
                        View
                      </button>
                      {canEdit && (
                        <button
                          onClick={() => handleEditObjective(objective)}
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
                      )}
                      {canDelete && (
                        <button
                          onClick={() => handleDelete(objective.id)}
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
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {objectives.length === 0 && !loading && !showForm && (
        <div style={{
          textAlign: 'center',
          padding: theme.spacing[8],
          color: theme.colors.textMuted,
          fontSize: theme.typography.fontSize.sm
        }}>
          No objectives found. {canCreate && 'Create your first objective to get started.'}
        </div>
      )}

      {loading && (
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
            Loading objectives...
          </p>
        </div>
      )}

      {formMessage && (
        <div style={getMessageStyle(formMessage)}>
          {formMessage}
        </div>
      )}
    </div>
  );
};

export default ObjectivesList;
