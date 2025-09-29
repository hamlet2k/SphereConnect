import React, { useState, useEffect, useCallback } from 'react';
import { useGuild } from '../contexts/GuildContext';
import { theme } from '../theme';
import { adminPageStyles, getMessageStyle } from './AdminPageStyles';

interface Category {
  id: string;
  name: string;
  description: string | null;
  guild_id: string;
}

function CategoriesList() {
  const { currentGuildId } = useGuild();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Filter states
  const [nameFilter, setNameFilter] = useState('');
  const [descriptionFilter, setDescriptionFilter] = useState('');

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });

  const loadCategories = useCallback(async () => {
    if (!currentGuildId) return;

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({ guild_id: currentGuildId });
      if (nameFilter) params.append('name', nameFilter);
      if (descriptionFilter) params.append('description', descriptionFilter);

      const response = await fetch(`http://localhost:8000/api/categories?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      } else {
        setError('Failed to load categories');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [currentGuildId, nameFilter, descriptionFilter]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setMessage('Name is required');
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to ${editingCategory ? 'update' : 'create'} this category?`
    );

    if (!confirmed) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const url = editingCategory
        ? `http://localhost:8000/api/categories/${editingCategory.id}`
        : 'http://localhost:8000/api/categories';

      const method = editingCategory ? 'PUT' : 'POST';
      const body = JSON.stringify({
        ...formData,
        guild_id: currentGuildId
      });

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body
      });

      if (response.ok) {
        setMessage(`Category ${editingCategory ? 'updated' : 'created'} successfully`);
        setShowForm(false);
        setEditingCategory(null);
        resetForm();
        loadCategories();
      } else {
        const error = await response.json();
        setMessage(error.detail || 'Failed to save category');
      }
    } catch (error: any) {
      setMessage(error.message || 'Error saving category');
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (categoryId: string) => {
    if (window.confirm('Are you sure you want to delete this category? This action cannot be undone.')) {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`http://localhost:8000/api/categories/${categoryId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
          setMessage('Category deleted successfully');
          loadCategories();
        } else {
          const error = await response.json();
          setMessage(error.detail || 'Failed to delete category');
        }
      } catch (error: any) {
        setMessage(error.message || 'Error deleting category');
      }
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingCategory(null);
    setFormData({
      name: '',
      description: ''
    });
    setMessage('');
  };

  return (
    <div style={adminPageStyles.container}>
      <div style={adminPageStyles.header}>
        <h3 style={adminPageStyles.title}>
          Categories Management
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
          Create Category
        </button>
      </div>

      {showForm && (
        <div style={adminPageStyles.formContainer}>
          <h4 style={adminPageStyles.formTitle}>
            {editingCategory ? 'Edit Category' : 'Create New Category'}
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
                  placeholder="Enter category name"
                  required
                />
              </div>

              <div style={adminPageStyles.formField}>
                <label style={adminPageStyles.formLabel}>
                  Description:
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  style={{
                    ...adminPageStyles.formInput,
                    minHeight: '80px',
                    resize: 'vertical'
                  }}
                  placeholder="Enter category description (optional)"
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
                {editingCategory ? 'Update' : 'Create'}
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
            Filter by Name
          </label>
          <input
            type="text"
            value={nameFilter}
            onChange={(e) => setNameFilter(e.target.value)}
            placeholder="Search by name"
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[1] }}>
          <label style={{
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.medium,
            color: theme.colors.textSecondary
          }}>
            Filter by Description
          </label>
          <input
            type="text"
            value={descriptionFilter}
            onChange={(e) => setDescriptionFilter(e.target.value)}
            placeholder="Search by description"
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
        <div style={getMessageStyle(error)}>
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
                Description
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
            {categories.map(category => (
              <tr key={category.id} style={{
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
                  {category.name}
                </td>
                <td style={{
                  padding: theme.spacing[4],
                  color: theme.colors.textSecondary
                }}>
                  {category.description || 'No description'}
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
                      onClick={() => handleEdit(category)}
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
                      onClick={() => handleDelete(category.id)}
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

      {categories.length === 0 && !loading && (
        <div style={{
          textAlign: 'center',
          padding: theme.spacing[8],
          color: theme.colors.textMuted,
          fontSize: theme.typography.fontSize.sm
        }}>
          No categories found. Create your first category to get started.
        </div>
      )}

      {message && (
        <div style={getMessageStyle(message)}>
          {message}
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
            Loading categories...
          </p>
        </div>
      )}
    </div>
  );
};

export default CategoriesList;