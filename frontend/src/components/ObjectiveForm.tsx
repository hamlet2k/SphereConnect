import React, { useState, useEffect } from 'react';
import { useObjectivesAPI, Objective, ObjectiveDescription } from '../contexts/ObjectivesAPI';
import { theme } from '../theme';

interface ObjectiveFormProps {
  objective?: Objective;
  guildId: string;
  onSuccess: (objective: Objective) => void;
  onCancel: () => void;
  isOpen: boolean;
}

const ObjectiveForm: React.FC<ObjectiveFormProps> = ({
  objective,
  guildId,
  onSuccess,
  onCancel,
  isOpen
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
    applicable_rank: 'Recruit',
    progress: {},
    guild_id: guildId
  });

  const [newCategory, setNewCategory] = useState('');
  const [newMetricKey, setNewMetricKey] = useState('');
  const [newMetricValue, setNewMetricValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (objective) {
      setFormData(objective);
    }
  }, [objective]);

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

  const handleAddCategory = () => {
    if (newCategory.trim() && !formData.categories.includes(newCategory.trim())) {
      setFormData(prev => ({
        ...prev,
        categories: [...prev.categories, newCategory.trim()]
      }));
      setNewCategory('');
    }
  };

  const handleRemoveCategory = (category: string) => {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.filter(c => c !== category)
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
              Applicable Rank
            </label>
            <select
              value={formData.applicable_rank}
              onChange={(e) => handleInputChange('applicable_rank', e.target.value)}
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
              <option value="Recruit">Recruit</option>
              <option value="Corporal">Corporal</option>
              <option value="Sergeant">Sergeant</option>
              <option value="Lieutenant">Lieutenant</option>
              <option value="Captain">Captain</option>
              <option value="Major">Major</option>
              <option value="Colonel">Colonel</option>
              <option value="Commander">Commander</option>
            </select>
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
            <div style={{ display: 'flex', gap: theme.spacing[2], marginBottom: theme.spacing[2] }}>
              <input
                type="text"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="Add category"
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
                onClick={handleAddCategory}
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

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: theme.spacing[2] }}>
              {formData.categories.map(category => (
                <span
                  key={category}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: theme.spacing[1],
                    padding: `${theme.spacing[1]} ${theme.spacing[3]}`,
                    backgroundColor: theme.colors.surfaceHover,
                    color: theme.colors.text,
                    borderRadius: theme.borderRadius.full,
                    fontSize: theme.typography.fontSize.sm,
                    fontWeight: theme.typography.fontWeight.medium
                  }}
                >
                  {category}
                  <button
                    type="button"
                    onClick={() => handleRemoveCategory(category)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: theme.colors.textSecondary,
                      cursor: 'pointer',
                      fontSize: theme.typography.fontSize.base,
                      lineHeight: 1,
                      padding: 0,
                      marginLeft: theme.spacing[1]
                    }}
                  >
                    ×
                  </button>
                </span>
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
      </div>
    </div>
  );
};

export default ObjectiveForm;