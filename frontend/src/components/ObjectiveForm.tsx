import React, { useState, useEffect } from 'react';

interface ObjectiveDescription {
  brief: string;
  tactical: string;
  classified: string;
  metrics: { [key: string]: any };
}

interface Objective {
  id?: string;
  name: string;
  description: ObjectiveDescription;
  categories: string[];
  priority: string;
  applicable_rank: string;
  squad_id?: string;
  guild_id: string;
}

interface ObjectiveFormProps {
  objective?: Objective;
  guildId: string;
  onSave: (objective: Objective) => void;
  onCancel: () => void;
}

const ObjectiveForm: React.FC<ObjectiveFormProps> = ({
  objective,
  guildId,
  onSave,
  onCancel
}) => {
  const [formData, setFormData] = useState<Objective>({
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

      await onSave(formData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      maxWidth: '800px',
      margin: '0 auto',
      padding: '24px',
      backgroundColor: 'white',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }}>
      <h3 style={{ marginTop: 0, marginBottom: '24px' }}>
        {objective ? 'Edit Objective' : 'Create New Objective'}
      </h3>

      {error && (
        <div style={{
          padding: '12px',
          backgroundColor: '#fed7d7',
          color: '#c53030',
          borderRadius: '4px',
          marginBottom: '16px'
        }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Basic Information */}
        <div style={{ marginBottom: '24px' }}>
          <h4 style={{ marginBottom: '16px' }}>Basic Information</h4>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
              Objective Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontSize: '16px'
              }}
              placeholder="Enter objective name"
              required
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
              Priority
            </label>
            <select
              value={formData.priority}
              onChange={(e) => handleInputChange('priority', e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontSize: '16px'
              }}
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </select>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
              Applicable Rank
            </label>
            <select
              value={formData.applicable_rank}
              onChange={(e) => handleInputChange('applicable_rank', e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontSize: '16px'
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
        <div style={{ marginBottom: '24px' }}>
          <h4 style={{ marginBottom: '16px' }}>Description</h4>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
              Brief Description *
            </label>
            <textarea
              value={formData.description.brief}
              onChange={(e) => handleDescriptionChange('brief', e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontSize: '16px',
                minHeight: '80px',
                resize: 'vertical'
              }}
              placeholder="Brief overview of the objective"
              required
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
              Tactical Description
            </label>
            <textarea
              value={formData.description.tactical}
              onChange={(e) => handleDescriptionChange('tactical', e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontSize: '16px',
                minHeight: '80px',
                resize: 'vertical'
              }}
              placeholder="Detailed tactical information"
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
              Classified Description
            </label>
            <textarea
              value={formData.description.classified}
              onChange={(e) => handleDescriptionChange('classified', e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontSize: '16px',
                minHeight: '80px',
                resize: 'vertical'
              }}
              placeholder="Classified information (restricted access)"
            />
          </div>
        </div>

        {/* Categories */}
        <div style={{ marginBottom: '24px' }}>
          <h4 style={{ marginBottom: '16px' }}>Categories</h4>

          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <input
                type="text"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="Add category"
                style={{
                  flex: 1,
                  padding: '8px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  fontSize: '16px'
                }}
              />
              <button
                type="button"
                onClick={handleAddCategory}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#3182ce',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Add
              </button>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {formData.categories.map(category => (
                <span
                  key={category}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 8px',
                    backgroundColor: '#edf2f7',
                    borderRadius: '12px',
                    fontSize: '14px'
                  }}
                >
                  {category}
                  <button
                    type="button"
                    onClick={() => handleRemoveCategory(category)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#4a5568',
                      cursor: 'pointer',
                      fontSize: '16px',
                      lineHeight: 1
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
        <div style={{ marginBottom: '24px' }}>
          <h4 style={{ marginBottom: '16px' }}>Metrics</h4>

          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <input
                type="text"
                value={newMetricKey}
                onChange={(e) => setNewMetricKey(e.target.value)}
                placeholder="Metric name"
                style={{
                  flex: 1,
                  padding: '8px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  fontSize: '16px'
                }}
              />
              <input
                type="text"
                value={newMetricValue}
                onChange={(e) => setNewMetricValue(e.target.value)}
                placeholder="Value"
                style={{
                  flex: 1,
                  padding: '8px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  fontSize: '16px'
                }}
              />
              <button
                type="button"
                onClick={handleAddMetric}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#3182ce',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Add
              </button>
            </div>

            <div style={{ display: 'grid', gap: '8px' }}>
              {Object.entries(formData.description.metrics).map(([key, value]) => (
                <div
                  key={key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px',
                    backgroundColor: '#f7fafc',
                    borderRadius: '4px'
                  }}
                >
                  <span style={{ fontWeight: 'bold', minWidth: '120px' }}>{key}:</span>
                  <span style={{ flex: 1 }}>{String(value)}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveMetric(key)}
                    style={{
                      padding: '4px 8px',
                      backgroundColor: '#e53e3e',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
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
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: '12px 24px',
              backgroundColor: '#a0aec0',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '12px 24px',
              backgroundColor: loading ? '#ccc' : '#38a169',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Saving...' : (objective ? 'Update Objective' : 'Create Objective')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ObjectiveForm;