import React, { useState, useEffect, useCallback } from 'react';
import { useObjectivesAPI, Objective, ObjectiveDescription } from '../contexts/ObjectivesAPI';
import { theme } from '../theme';

interface ObjectiveFormProps {
  objective?: Objective;
  guildId: string;
  onSuccess: (objective: Objective) => void;
  onCancel: () => void;
  isOpen: boolean;
  modal?: boolean; // Default true for backward compatibility
}

const ObjectiveForm: React.FC<ObjectiveFormProps> = ({
  objective,
  guildId,
  onSuccess,
  onCancel,
  isOpen,
  modal = true
}) => {
  const { createObjective, updateObjective } = useObjectivesAPI();
  const [formData, setFormData] = useState<Objective>({
    id: '',
    name: '',
    description: {
      brief: '',
      tactical: '',
      classified: '',
      metrics: {}
    },
    categories: [],
    priority: 'Medium',
    allowed_ranks: [],
    progress: {},
    guild_id: guildId
  });

  const [availableCategories, setAvailableCategories] = useState<{id: string, name: string, description?: string}[]>([]);
  const [availableRanks, setAvailableRanks] = useState<{id: string, name: string, hierarchy_level: number}[]>([]);
  const [newMetricKey, setNewMetricKey] = useState('');
  const [newMetricValue, setNewMetricValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadCategories = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:8000/api/categories?guild_id=${guildId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setAvailableCategories(data);
      }
    } catch (err: any) {
      console.error('Error loading categories:', err);
    }
  }, [guildId]);

  const loadRanks = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:8000/api/admin/ranks?guild_id=${guildId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setAvailableRanks(data.map((rank: any) => ({
          id: rank.id,
          name: rank.name,
          hierarchy_level: rank.hierarchy_level
        })));
      }
    } catch (err: any) {
      console.error('Error loading ranks:', err);
    }
  }, [guildId]);

  useEffect(() => {
    if (objective) {
      setFormData(objective);
    }
    loadCategories();
    loadRanks();
  }, [objective, loadCategories, loadRanks]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleDescriptionChange = (field: keyof ObjectiveDescription, value: any) => {
    setFormData(prev => ({
      ...prev,
      description: {
        ...prev.description,
        [field]: value
      }
    }));
  };

  const handleCategoryChange = (categoryId: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      categories: checked
        ? [...prev.categories, categoryId]
        : prev.categories.filter(id => id !== categoryId)
    }));
  };

  const handleAddMetric = () => {
    if (newMetricKey.trim()) {
      const value = isNaN(Number(newMetricValue)) ? newMetricValue : Number(newMetricValue);
      setFormData(prev => ({
        ...prev,
        description: {
          ...prev.description,
          metrics: {
            ...prev.description.metrics,
            [newMetricKey.trim()]: value
          }
        }
      }));
      setNewMetricKey('');
      setNewMetricValue('');
    }
  };

  const handleRemoveMetric = (key: string) => {
    setFormData(prev => {
      const newMetrics = { ...prev.description.metrics };
      delete newMetrics[key];
      return {
        ...prev,
        description: {
          ...prev.description,
          metrics: newMetrics
        }
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validate required fields
      if (!formData.name.trim()) {
        throw new Error('Objective name is required');
      }

      if (!formData.description.brief.trim()) {
        throw new Error('Brief description is required');
      }

      let result: Objective;
      if (objective?.id) {
        // Update existing objective
        result = await updateObjective(objective.id, formData);
      } else {
        // Create new objective
        const createData = { ...formData };
        delete (createData as any).id; // Remove id for create
        result = await createObjective(createData as any);
      }

      onSuccess(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formContent = (
    <>
      {error && (
        <div style={{
          padding: theme.spacing[3],
          backgroundColor: `${theme.colors.error}20`,
          color: theme.colors.error,
          borderRadius: theme.borderRadius.lg,
          border: `1px solid ${theme.colors.error}`,
          marginBottom: theme.spacing[4],
          fontSize: theme.typography.fontSize.sm,
          fontWeight: theme.typography.fontWeight.medium
        }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Basic Information */}
        <div style={{ marginBottom: theme.spacing[6] }}>
          <h4 style={{
            marginBottom: theme.spacing[4],
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.lg,
            fontWeight: theme.typography.fontWeight.semibold
          }}>
            Basic Information
          </h4>

          <div style={{ marginBottom: theme.spacing[4] }}>
            <label style={{
              display: 'block',
              marginBottom: theme.spacing[1],
              fontWeight: theme.typography.fontWeight.semibold,
              color: theme.colors.text,
              fontSize: theme.typography.fontSize.sm
            }}>
              Objective Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              style={{
                width: '100%',
                padding: `${theme.spacing[2]} ${theme.spacing[3]}`,
                border: `2px solid ${theme.colors.border}`,
                borderRadius: theme.borderRadius.lg,
                fontSize: theme.typography.fontSize.base,
                backgroundColor: theme.colors.background,
                color: theme.colors.text,
                outline: 'none',
                transition: 'border-color 0.2s ease-in-out'
              }}
              placeholder="Enter objective name"
              required
            />
          </div>

          <div style={{ marginBottom: theme.spacing[4] }}>
            <label style={{
              display: 'block',
              marginBottom: theme.spacing[1],
              fontWeight: theme.typography.fontWeight.semibold,
              color: theme.colors.text,
              fontSize: theme.typography.fontSize.sm
            }}>
              Priority
            </label>
            <select
              value={formData.priority}
              onChange={(e) => handleInputChange('priority', e.target.value)}
              style={{
                width: '100%',
                padding: `${theme.spacing[2]} ${theme.spacing[3]}`,
                border: `2px solid ${theme.colors.border}`,
                borderRadius: theme.borderRadius.lg,
                fontSize: theme.typography.fontSize.base,
                backgroundColor: theme.colors.background,
                color: theme.colors.text,
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </select>
          </div>

          <div style={{ marginBottom: theme.spacing[4] }}>
            <label style={{
              display: 'block',
              marginBottom: theme.spacing[1],
              fontWeight: theme.typography.fontWeight.semibold,
              color: theme.colors.text,
              fontSize: theme.typography.fontSize.sm
            }}>
              Allowed Ranks
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[2] }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: theme.spacing[2] }}>
                {availableRanks
                  .sort((a, b) => b.hierarchy_level - a.hierarchy_level) // Sort by hierarchy (higher first)
                  .map(rank => (
                  <label
                    key={rank.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: theme.spacing[2],
                      padding: theme.spacing[2],
                      backgroundColor: theme.colors.surfaceHover,
                      borderRadius: theme.borderRadius.lg,
                      cursor: 'pointer',
                      border: `1px solid ${theme.colors.border}`
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={formData.allowed_ranks.includes(rank.id)}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        let newAllowedRanks = [...formData.allowed_ranks];

                        if (checked) {
                          // Add this rank and all ranks with equal or lower seniority (higher hierarchy_level)
                          newAllowedRanks.push(rank.id);
                          const selectedLevel = rank.hierarchy_level;
                          availableRanks.forEach(r => {
                            if (r.hierarchy_level >= selectedLevel && !newAllowedRanks.includes(r.id)) {
                              newAllowedRanks.push(r.id);
                            }
                          });
                        } else {
                          // Remove this rank, but keep ranks that were selected independently
                          newAllowedRanks = newAllowedRanks.filter(id => id !== rank.id);
                        }

                        setFormData(prev => ({
                          ...prev,
                          allowed_ranks: newAllowedRanks
                        }));
                      }}
                      style={{
                        width: '16px',
                        height: '16px',
                        cursor: 'pointer'
                      }}
                    />
                    <span style={{
                      color: theme.colors.text,
                      fontSize: theme.typography.fontSize.sm,
                      fontWeight: theme.typography.fontWeight.medium
                    }}>
                      {rank.name}
                    </span>
                  </label>
                ))}
              </div>
              <small style={{ color: theme.colors.textSecondary, fontSize: theme.typography.fontSize.xs }}>
                Select ranks that can view this objective. Higher ranks are automatically included when a lower rank is selected.
              </small>
            </div>
          </div>
        </div>

        {/* Description Sections */}
        <div style={{ marginBottom: theme.spacing[6] }}>
          <h4 style={{
            marginBottom: theme.spacing[4],
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.lg,
            fontWeight: theme.typography.fontWeight.semibold
          }}>
            Description
          </h4>

          <div style={{ marginBottom: theme.spacing[4] }}>
            <label style={{
              display: 'block',
              marginBottom: theme.spacing[1],
              fontWeight: theme.typography.fontWeight.semibold,
              color: theme.colors.text,
              fontSize: theme.typography.fontSize.sm
            }}>
              Brief Description *
            </label>
            <textarea
              value={formData.description.brief}
              onChange={(e) => handleDescriptionChange('brief', e.target.value)}
              style={{
                width: '100%',
                padding: theme.spacing[3],
                border: `2px solid ${theme.colors.border}`,
                borderRadius: theme.borderRadius.lg,
                fontSize: theme.typography.fontSize.base,
                backgroundColor: theme.colors.background,
                color: theme.colors.text,
                minHeight: '100px',
                resize: 'vertical',
                outline: 'none',
                fontFamily: theme.typography.fontFamily
              }}
              placeholder="Brief overview of the objective"
              required
            />
          </div>

          <div style={{ marginBottom: theme.spacing[4] }}>
            <label style={{
              display: 'block',
              marginBottom: theme.spacing[1],
              fontWeight: theme.typography.fontWeight.semibold,
              color: theme.colors.text,
              fontSize: theme.typography.fontSize.sm
            }}>
              Tactical Description
            </label>
            <textarea
              value={formData.description.tactical}
              onChange={(e) => handleDescriptionChange('tactical', e.target.value)}
              style={{
                width: '100%',
                padding: theme.spacing[3],
                border: `2px solid ${theme.colors.border}`,
                borderRadius: theme.borderRadius.lg,
                fontSize: theme.typography.fontSize.base,
                backgroundColor: theme.colors.background,
                color: theme.colors.text,
                minHeight: '100px',
                resize: 'vertical',
                outline: 'none',
                fontFamily: theme.typography.fontFamily
              }}
              placeholder="Detailed tactical information"
            />
          </div>

          <div style={{ marginBottom: theme.spacing[4] }}>
            <label style={{
              display: 'block',
              marginBottom: theme.spacing[1],
              fontWeight: theme.typography.fontWeight.semibold,
              color: theme.colors.warning,
              fontSize: theme.typography.fontSize.sm
            }}>
              Classified Description
            </label>
            <textarea
              value={formData.description.classified}
              onChange={(e) => handleDescriptionChange('classified', e.target.value)}
              style={{
                width: '100%',
                padding: theme.spacing[3],
                border: `2px solid ${theme.colors.border}`,
                borderRadius: theme.borderRadius.lg,
                fontSize: theme.typography.fontSize.base,
                backgroundColor: theme.colors.background,
                color: theme.colors.text,
                minHeight: '100px',
                resize: 'vertical',
                outline: 'none',
                fontFamily: theme.typography.fontFamily,
                fontStyle: 'italic'
              }}
              placeholder="Classified information (restricted access)"
            />
          </div>
        </div>

        {/* Categories */}
        <div style={{ marginBottom: theme.spacing[6] }}>
          <h4 style={{
            marginBottom: theme.spacing[4],
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.lg,
            fontWeight: theme.typography.fontWeight.semibold
          }}>
            Categories
          </h4>

          <div style={{ marginBottom: theme.spacing[4] }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[2] }}>
              {availableCategories.map(category => (
                <label
                  key={category.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: theme.spacing[2],
                    padding: theme.spacing[2],
                    backgroundColor: theme.colors.surfaceHover,
                    borderRadius: theme.borderRadius.lg,
                    cursor: 'pointer',
                    border: `1px solid ${theme.colors.border}`
                  }}
                >
                  <input
                    type="checkbox"
                    checked={formData.categories.includes(category.id)}
                    onChange={(e) => handleCategoryChange(category.id, e.target.checked)}
                    style={{
                      width: '16px',
                      height: '16px',
                      cursor: 'pointer'
                    }}
                  />
                  <span style={{
                    color: theme.colors.text,
                    fontSize: theme.typography.fontSize.sm,
                    fontWeight: theme.typography.fontWeight.medium
                  }}>
                    {category.name}
                    {category.description && (
                      <span style={{
                        color: theme.colors.textSecondary,
                        fontWeight: theme.typography.fontWeight.normal,
                        marginLeft: theme.spacing[2]
                      }}>
                        - {category.description}
                      </span>
                    )}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Metrics */}
        <div style={{ marginBottom: theme.spacing[6] }}>
          <h4 style={{
            marginBottom: theme.spacing[4],
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.lg,
            fontWeight: theme.typography.fontWeight.semibold
          }}>
            Metrics
          </h4>

          <div style={{ marginBottom: theme.spacing[4] }}>
            <div style={{ display: 'flex', gap: theme.spacing[2], marginBottom: theme.spacing[2] }}>
              <input
                type="text"
                value={newMetricKey}
                onChange={(e) => setNewMetricKey(e.target.value)}
                placeholder="Metric name"
                style={{
                  flex: 1,
                  padding: `${theme.spacing[2]} ${theme.spacing[3]}`,
                  border: `2px solid ${theme.colors.border}`,
                  borderRadius: theme.borderRadius.lg,
                  fontSize: theme.typography.fontSize.base,
                  backgroundColor: theme.colors.background,
                  color: theme.colors.text,
                  outline: 'none'
                }}
              />
              <input
                type="text"
                value={newMetricValue}
                onChange={(e) => setNewMetricValue(e.target.value)}
                placeholder="Value"
                style={{
                  flex: 1,
                  padding: `${theme.spacing[2]} ${theme.spacing[3]}`,
                  border: `2px solid ${theme.colors.border}`,
                  borderRadius: theme.borderRadius.lg,
                  fontSize: theme.typography.fontSize.base,
                  backgroundColor: theme.colors.background,
                  color: theme.colors.text,
                  outline: 'none'
                }}
              />
              <button
                type="button"
                onClick={handleAddMetric}
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
                Add
              </button>
            </div>

            <div style={{ display: 'grid', gap: theme.spacing[2] }}>
              {Object.entries(formData.description.metrics).map(([key, value]) => (
                <div
                  key={key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: theme.spacing[2],
                    padding: theme.spacing[2],
                    backgroundColor: theme.colors.surfaceHover,
                    borderRadius: theme.borderRadius.lg,
                    border: `1px solid ${theme.colors.border}`
                  }}
                >
                  <span style={{
                    fontWeight: theme.typography.fontWeight.bold,
                    minWidth: '120px',
                    color: theme.colors.text
                  }}>
                    {key}:
                  </span>
                  <span style={{
                    flex: 1,
                    color: theme.colors.textSecondary
                  }}>
                    {String(value)}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveMetric(key)}
                    style={{
                      padding: `${theme.spacing[1]} ${theme.spacing[2]}`,
                      backgroundColor: theme.colors.error,
                      color: theme.colors.background,
                      border: 'none',
                      borderRadius: theme.borderRadius.lg,
                      cursor: 'pointer',
                      fontSize: theme.typography.fontSize.sm,
                      fontWeight: theme.typography.fontWeight.medium
                    }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div style={{ display: 'flex', gap: theme.spacing[4], justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: `${theme.spacing[3]} ${theme.spacing[6]}`,
              backgroundColor: theme.colors.surfaceHover,
              color: theme.colors.text,
              border: 'none',
              borderRadius: theme.borderRadius.lg,
              cursor: 'pointer',
              fontSize: theme.typography.fontSize.sm,
              fontWeight: theme.typography.fontWeight.medium
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: `${theme.spacing[3]} ${theme.spacing[6]}`,
              backgroundColor: loading ? theme.colors.surfaceHover : theme.colors.success,
              color: loading ? theme.colors.textSecondary : theme.colors.background,
              border: 'none',
              borderRadius: theme.borderRadius.lg,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: theme.typography.fontSize.sm,
              fontWeight: theme.typography.fontWeight.semibold
            }}
          >
            {loading ? 'Saving...' : (objective ? 'Update Objective' : 'Create Objective')}
          </button>
        </div>
      </form>
    </>
  );

  if (modal) {
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
          <h3 style={{
            marginTop: 0,
            marginBottom: theme.spacing[6],
            color: theme.colors.primary,
            fontSize: theme.typography.fontSize['2xl'],
            fontWeight: theme.typography.fontWeight.bold,
            textShadow: theme.shadows.neon
          }}>
            {objective ? 'Edit Objective' : 'Create New Objective'}
          </h3>

          {formContent}
        </div>
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.xl,
      padding: theme.spacing[6],
      border: `1px solid ${theme.colors.border}`,
      boxShadow: theme.shadows.lg
    }}>
      <h4 style={{
        marginTop: 0,
        marginBottom: theme.spacing[6],
        color: theme.colors.primary,
        fontSize: theme.typography.fontSize.xl,
        fontWeight: theme.typography.fontWeight.bold,
        textShadow: theme.shadows.neon
      }}>
        {objective ? 'Edit Objective' : 'Create New Objective'}
      </h4>

      {formContent}
    </div>
  );
};

export default ObjectiveForm;