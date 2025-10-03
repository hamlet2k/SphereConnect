import React, { useMemo, useState, useEffect } from 'react';
import { useObjectivesAPI, Objective } from '../contexts/ObjectivesAPI';
import { useGuild } from '../contexts/GuildContext';
import { theme } from '../theme';
import api from '../api';

interface Task {
  id: string;
  name: string;
  description?: string;
  status: string;
  priority: string;
  progress: any;
  schedule?: any;
}

interface ObjectiveDetailProps {
  objectiveId: string;
  onClose: () => void;
  onEdit: (objective: Objective) => void;
  canEdit: boolean;
}

const ObjectiveDetail: React.FC<ObjectiveDetailProps> = ({
  objectiveId,
  onClose,
  onEdit,
  canEdit
}) => {
  const { getObjective } = useObjectivesAPI();
  const { currentGuildId } = useGuild();
  const [objective, setObjective] = useState<Objective | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [categoryLookup, setCategoryLookup] = useState<{ [id: string]: string }>({});
  const [rankLookup, setRankLookup] = useState<{ [id: string]: string }>({});
  const hasToken = useMemo(() => Boolean(localStorage.getItem('token')), []);

  useEffect(() => {
    loadObjective();
  }, [objectiveId]);

  const loadObjective = async () => {
    try {
      setLoading(true);
      const data = await getObjective(objectiveId);
      setObjective(data);

      // TODO: Load tasks for this objective
      // For now, we'll show a placeholder
      setTasks([]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadCategories = async () => {
      const guildId = objective?.guild_id || currentGuildId;
      if (!guildId) {
        return;
      }

      try {
        if (!hasToken) {
          return;
        }
        const response = await api.get(`/categories?guild_id=${guildId}`);
        const data = response.data as { id: string; name: string }[];
        const lookup: { [id: string]: string } = {};
        data.forEach((category) => {
          lookup[category.id] = category.name;
        });
        setCategoryLookup(lookup);
      } catch (categoryError) {
        console.error('Error loading categories:', categoryError);
      }
    };

    const loadRanks = async () => {
      const guildId = objective?.guild_id || currentGuildId;
      if (!guildId) {
        return;
      }

      try {
        if (!hasToken) {
          return;
        }
        const response = await api.get(`/admin/ranks?guild_id=${guildId}`);
        const data = response.data as { id: string; name: string }[];
        const lookup: { [id: string]: string } = {};
        data.forEach((rank) => {
          lookup[rank.id] = rank.name;
        });
        setRankLookup(lookup);
      } catch (rankError) {
        console.error('Error loading ranks:', rankError);
      }
    };

    loadCategories();
    loadRanks();
  }, [objective?.guild_id, currentGuildId]);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return theme.colors.success;
      case 'cancelled':
      case 'failed': return theme.colors.error;
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

  const resolveRankNames = (rankIds: string[]) =>
    rankIds.map(id => rankLookup[id] || id);

  const formatProgress = (progress: any) => {
    if (!progress) return 'No progress data';

    const status = progress.status || 'active';
    const metrics = progress.metrics || {};

    return (
      <div>
        <div style={{ marginBottom: theme.spacing[2] }}>
          <strong>Status:</strong>{' '}
          <span style={{ color: getStatusColor(status) }}>
            {status.replace('_', ' ').toUpperCase()}
          </span>
        </div>
        {Object.keys(metrics).length > 0 && (
          <div>
            <strong>Metrics:</strong>
            <ul style={{ marginTop: theme.spacing[1], paddingLeft: theme.spacing[4] }}>
              {Object.entries(metrics).map(([key, value]) => (
                <li key={key}>
                  {key}: {String(value)}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  if (!hasToken) {
    return <div>Access denied. Please login first.</div>;
  }

  if (loading) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}>
        <div style={{
          backgroundColor: theme.colors.surface,
          borderRadius: theme.borderRadius.xl,
          padding: theme.spacing[6],
          border: `1px solid ${theme.colors.border}`,
          boxShadow: theme.shadows.lg,
          textAlign: 'center'
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
            fontSize: theme.typography.fontSize.base
          }}>
            Loading objective details...
          </p>
        </div>
      </div>
    );
  }

  if (error || !objective) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}>
        <div style={{
          backgroundColor: theme.colors.surface,
          borderRadius: theme.borderRadius.xl,
          padding: theme.spacing[6],
          border: `1px solid ${theme.colors.border}`,
          boxShadow: theme.shadows.lg,
          maxWidth: '500px',
          width: '90%'
        }}>
          <h3 style={{
            marginTop: 0,
            marginBottom: theme.spacing[4],
            color: theme.colors.error
          }}>
            Error
          </h3>
          <p style={{
            color: theme.colors.textSecondary,
            marginBottom: theme.spacing[4]
          }}>
            {error || 'Objective not found'}
          </p>
          <button
            onClick={onClose}
            style={{
              padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
              backgroundColor: theme.colors.primary,
              color: theme.colors.background,
              border: 'none',
              borderRadius: theme.borderRadius.lg,
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: theme.spacing[4]
    }}>
      <div style={{
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.xl,
        padding: theme.spacing[6],
        border: `1px solid ${theme.colors.border}`,
        boxShadow: theme.shadows.lg,
        maxWidth: '800px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: theme.spacing[6]
        }}>
          <div>
            <h2 style={{
              margin: 0,
              color: theme.colors.primary,
              fontSize: theme.typography.fontSize['2xl'],
              fontWeight: theme.typography.fontWeight.bold,
              textShadow: theme.shadows.neon,
              marginBottom: theme.spacing[2]
            }}>
              {objective.name}
            </h2>
            <div style={{ display: 'flex', gap: theme.spacing[4], flexWrap: 'wrap' }}>
              <span style={{
                color: getPriorityColor(objective.priority),
                fontWeight: theme.typography.fontWeight.semibold
              }}>
                Priority: {objective.priority}
              </span>
              <span style={{ color: theme.colors.textSecondary }}>
                Allowed Ranks: {objective.allowed_ranks?.length ? objective.allowed_ranks.join(', ') : 'None'}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: theme.spacing[2] }}>
            {canEdit && (
              <button
                onClick={() => onEdit(objective)}
                style={{
                  padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
                  backgroundColor: theme.colors.primary,
                  color: theme.colors.background,
                  border: 'none',
                  borderRadius: theme.borderRadius.lg,
                  cursor: 'pointer',
                  fontSize: theme.typography.fontSize.sm,
                  fontWeight: theme.typography.fontWeight.semibold
                }}
              >
                Edit
              </button>
            )}
            <button
              onClick={onClose}
              style={{
                padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
                backgroundColor: theme.colors.surfaceHover,
                color: theme.colors.text,
                border: 'none',
                borderRadius: theme.borderRadius.lg,
                cursor: 'pointer',
                fontSize: theme.typography.fontSize.sm
              }}
            >
              Close
            </button>
          </div>
        </div>

        {/* Categories */}
        {objective.categories.length > 0 && (
          <div style={{ marginBottom: theme.spacing[6] }}>
            <h4 style={{
              marginBottom: theme.spacing[2],
              color: theme.colors.text,
              fontSize: theme.typography.fontSize.lg
            }}>
              Categories
            </h4>
            <div style={{ display: 'flex', gap: theme.spacing[2], flexWrap: 'wrap' }}>
              {objective.categories.map(category => {
                const categoryLabel = (() => {
                  if (typeof category === 'string') {
                    return categoryLookup[category] || category;
                  }

                  if (category && typeof category === 'object') {
                    const categoryId = (category as { id?: string }).id;
                    const categoryName = (category as { name?: string }).name;
                    if (categoryName) {
                      return categoryName;
                    }
                    if (categoryId) {
                      return categoryLookup[categoryId] || categoryId;
                    }
                  }

                  return String(category);
                })();

                const key = typeof category === 'string' ? category : (category as { id?: string }).id || categoryLabel;

                return (
                <span
                  key={key}
                  style={{
                    padding: `${theme.spacing[1]} ${theme.spacing[3]}`,
                    backgroundColor: theme.colors.surfaceHover,
                    color: theme.colors.text,
                    borderRadius: theme.borderRadius.full,
                    fontSize: theme.typography.fontSize.sm,
                    fontWeight: theme.typography.fontWeight.medium
                  }}
                >
                  {categoryLabel}
                </span>
              );
              })}
            </div>
          </div>
        )}

        {/* Description */}
        <div style={{ marginBottom: theme.spacing[6] }}>
          <h4 style={{
            marginBottom: theme.spacing[3],
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.lg
          }}>
            Description
          </h4>

          <div style={{ marginBottom: theme.spacing[4] }}>
            <h5 style={{
              marginBottom: theme.spacing[2],
              color: theme.colors.primary,
              fontSize: theme.typography.fontSize.base
            }}>
              Brief
            </h5>
            <p style={{
              color: theme.colors.text,
              lineHeight: theme.typography.lineHeight.relaxed,
              margin: 0
            }}>
              {objective.description.brief || 'No brief description provided.'}
            </p>
          </div>

          {objective.description.tactical && (
            <div style={{ marginBottom: theme.spacing[4] }}>
              <h5 style={{
                marginBottom: theme.spacing[2],
                color: theme.colors.primary,
                fontSize: theme.typography.fontSize.base
              }}>
                Tactical
              </h5>
              <p style={{
                color: theme.colors.text,
                lineHeight: theme.typography.lineHeight.relaxed,
                margin: 0
              }}>
                {objective.description.tactical}
              </p>
            </div>
          )}

          {objective.description.classified && (
            <div style={{ marginBottom: theme.spacing[4] }}>
              <h5 style={{
                marginBottom: theme.spacing[2],
                color: theme.colors.warning,
                fontSize: theme.typography.fontSize.base
              }}>
                Classified
              </h5>
              <p style={{
                color: theme.colors.text,
                lineHeight: theme.typography.lineHeight.relaxed,
                margin: 0,
                fontStyle: 'italic'
              }}>
                {objective.description.classified}
              </p>
            </div>
          )}
        </div>

        {/* Progress */}
        <div style={{ marginBottom: theme.spacing[6] }}>
          <h4 style={{
            marginBottom: theme.spacing[3],
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.lg
          }}>
            Progress
          </h4>
          <div style={{
            padding: theme.spacing[4],
            backgroundColor: theme.colors.surfaceHover,
            borderRadius: theme.borderRadius.lg,
            border: `1px solid ${theme.colors.border}`
          }}>
            {formatProgress(objective.progress)}
          </div>
        </div>

        {/* Tasks */}
        <div style={{ marginBottom: theme.spacing[6] }}>
          <h4 style={{
            marginBottom: theme.spacing[3],
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.lg
          }}>
            Tasks ({tasks.length})
          </h4>

          {tasks.length === 0 ? (
            <p style={{
              color: theme.colors.textMuted,
              fontStyle: 'italic',
              margin: 0
            }}>
              No tasks assigned to this objective yet.
            </p>
          ) : (
            <div style={{
              display: 'grid',
              gap: theme.spacing[3]
            }}>
              {tasks.map(task => (
                <div
                  key={task.id}
                  style={{
                    padding: theme.spacing[3],
                    backgroundColor: theme.colors.surfaceHover,
                    borderRadius: theme.borderRadius.lg,
                    border: `1px solid ${theme.colors.border}`
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: theme.spacing[2]
                  }}>
                    <h5 style={{
                      margin: 0,
                      color: theme.colors.text,
                      fontSize: theme.typography.fontSize.base
                    }}>
                      {task.name}
                    </h5>
                    <span style={{
                      color: getStatusColor(task.status),
                      fontSize: theme.typography.fontSize.sm,
                      fontWeight: theme.typography.fontWeight.medium
                    }}>
                      {task.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                  {task.description && (
                    <p style={{
                      color: theme.colors.textSecondary,
                      margin: 0,
                      fontSize: theme.typography.fontSize.sm
                    }}>
                      {task.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Metrics */}
        {objective.description.metrics && Object.keys(objective.description.metrics).length > 0 && (
          <div>
            <h4 style={{
              marginBottom: theme.spacing[3],
              color: theme.colors.text,
              fontSize: theme.typography.fontSize.lg
            }}>
              Metrics
            </h4>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: theme.spacing[3]
            }}>
              {Object.entries(objective.description.metrics).map(([key, value]) => (
                <div
                  key={key}
                  style={{
                    padding: theme.spacing[3],
                    backgroundColor: theme.colors.surfaceHover,
                    borderRadius: theme.borderRadius.lg,
                    border: `1px solid ${theme.colors.border}`,
                    textAlign: 'center'
                  }}
                >
                  <div style={{
                    fontSize: theme.typography.fontSize['2xl'],
                    fontWeight: theme.typography.fontWeight.bold,
                    color: theme.colors.primary,
                    marginBottom: theme.spacing[1]
                  }}>
                    {String(value)}
                  </div>
                  <div style={{
                    fontSize: theme.typography.fontSize.sm,
                    color: theme.colors.textSecondary,
                    textTransform: 'capitalize'
                  }}>
                    {key.replace(/_/g, ' ')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ObjectiveDetail;
