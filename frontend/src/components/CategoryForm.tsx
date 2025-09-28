import React, { useState, useEffect } from 'react';
import { theme } from '../theme';

interface Category {
  id: string;
  name: string;
  description: string | null;
  guild_id: string;
}

interface CategoryFormProps {
  category?: Category;
  guildId: string;
  onSuccess: (category: Category) => void;
  onCancel: () => void;
  isOpen: boolean;
}

const CategoryForm: React.FC<CategoryFormProps> = ({
  category,
  guildId,
  onSuccess,
  onCancel,
  isOpen
}) => {
  const [formData, setFormData] = useState<Category>({
    id: '',
    name: '',
    description: '',
    guild_id: guildId
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (category) {
      setFormData(category);
    }
  }, [category]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validate required fields
      if (!formData.name.trim()) {
        throw new Error('Category name is required');
      }

      const token = localStorage.getItem('token');
      let result: Category;

      if (category?.id) {
        // Update existing category
        const response = await fetch(`http://localhost:8000/api/categories/${category.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            name: formData.name,
            description: formData.description
          })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.detail || 'Failed to update category');
        }

        result = { ...formData };
      } else {
        // Create new category
        const response = await fetch('http://localhost:8000/api/categories', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            name: formData.name,
            description: formData.description,
            guild_id: guildId
          })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.detail || 'Failed to create category');
        }

        const data = await response.json();
        result = {
          id: data.id,
          name: formData.name,
          description: formData.description,
          guild_id: guildId
        };
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
        maxWidth: '500px',
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
          {category ? 'Edit Category' : 'Create New Category'}
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
                Category Name *
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
                placeholder="Enter category name"
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
                Description
              </label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => handleInputChange('description', e.target.value)}
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
                placeholder="Enter category description"
              />
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
              {loading ? 'Saving...' : (category ? 'Update Category' : 'Create Category')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CategoryForm;