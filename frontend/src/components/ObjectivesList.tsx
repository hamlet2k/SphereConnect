import React, { useState, useEffect, useCallback } from 'react';
import { useObjectivesAPI, Objective } from '../contexts/ObjectivesAPI';
import { useGuild } from '../contexts/GuildContext';
import { theme } from '../theme';

interface ObjectivesListProps {
  onViewObjective: (objective: Objective) => void;
  onEditObjective: (objective: Objective) => void;
  onDeleteObjective: (objectiveId: string) => void;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onCreateObjective: () => void;
}

const ObjectivesList: React.FC<ObjectivesListProps> = ({
  onViewObjective,
  onEditObjective,
  onDeleteObjective,
  canCreate,
  canEdit,
  canDelete,
  onCreateObjective
}) => {
  const { currentGuildId } = useGuild();
  const { getObjectives } = useObjectivesAPI();

  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Filter states
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const loadObjectives = useCallback(async () => {
    if (!currentGuildId) return;

    setLoading(true);
    setError('');

    try {
      const filters: { status?: string; category?: string } = {};
      if (statusFilter) filters.status = statusFilter;
      if (categoryFilter) filters.category = categoryFilter;

      const data = await getObjectives(currentGuildId, filters);
      setObjectives(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [currentGuildId, getObjectives, statusFilter, categoryFilter]);

  useEffect(() => {
    loadObjectives();
  }, [loadObjectives]);

  const handleDelete = async (objectiveId: string) => {
    if (window.confirm('Are you sure you want to delete this objective? This action cannot be undone.')) {
      try {
        await onDeleteObjective(objectiveId);
        loadObjectives(); // Refresh list
      } catch (err: any) {
        setError(err.message);
      }
    }
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
            onClick={onCreateObjective}
            style={{
              padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
              backgroundColor: theme.colors.secondary,
              color: theme.colors.text,
              border: 'none',
              borderRadius: theme.borderRadius.lg,
              fontSize: theme.typography.fontSize.sm,
              fontWeight: theme.typography.fontWeight.semibold,
              cursor: 'pointer',
              transition: 'all 0.2s ease-in-out',
              boxShadow: `0 0 10px ${theme.colors.secondary}40`
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.backgroundColor = theme.colors.secondaryHover;
              (e.target as HTMLElement).style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.backgroundColor = theme.colors.secondary;
              (e.target as HTMLElement).style.transform = 'translateY(0)';
            }}
          >
            Create Objective
          </button>
        )}
      </div>

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
          <input
            type="text"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            placeholder="Filter by category"
            style={{
              padding: `${theme.spacing[2]} ${theme.spacing[3]}`,
              backgroundColor: theme.colors.background,
              border: `2px solid ${theme.colors.border}`,
              borderRadius: theme.borderRadius.lg,
              color: theme.colors.text,
              fontSize: theme.typography.fontSize.sm,
              outline: 'none'
            }}
          />
        </div>
      </div>

      {error && (
        <div style={{
          marginBottom: theme.spacing[4],
          padding: theme.spacing[3],
          backgroundColor: `${theme.colors.error}20`,
          border: `1px solid ${theme.colors.error}`,
          borderRadius: theme.borderRadius.lg,
          color: theme.colors.error,
          fontSize: theme.typography.fontSize.sm
        }}>
          {error}
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
                    {objective.categories.length > 0 ? objective.categories.join(', ') : 'None'}
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
                        onClick={() => onViewObjective(objective)}
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
                          onClick={() => onEditObjective(objective)}
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

      {objectives.length === 0 && !loading && (
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
    </div>
  );
};

export default ObjectivesList;