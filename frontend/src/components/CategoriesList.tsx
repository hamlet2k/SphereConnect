import React, { useState, useEffect, useCallback } from 'react';
import { useGuild } from '../contexts/GuildContext';
import { theme } from '../theme';

interface Category {
  id: string;
  name: string;
  description: string | null;
  guild_id: string;
}

interface CategoriesListProps {
  onEditCategory: (category: Category) => void;
  onDeleteCategory: (categoryId: string) => void;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onCreateCategory: () => void;
  refreshTrigger?: number;
}

const CategoriesList: React.FC<CategoriesListProps> = ({
  onEditCategory,
  onDeleteCategory,
  canCreate,
  canEdit,
  canDelete,
  onCreateCategory,
  refreshTrigger
}) => {
  const { currentGuildId } = useGuild();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Filter states
  const [nameFilter, setNameFilter] = useState('');
  const [descriptionFilter, setDescriptionFilter] = useState('');

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

  useEffect(() => {
    if (refreshTrigger !== undefined) {
      loadCategories();
    }
  }, [refreshTrigger, loadCategories]);

  const handleDelete = async (categoryId: string) => {
    if (window.confirm('Are you sure you want to delete this category? This action cannot be undone.')) {
      try {
        await onDeleteCategory(categoryId);
        loadCategories(); // Refresh list
      } catch (err: any) {
        setError(err.message);
      }
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
          Categories Management
        </h3>
        {canCreate && (
          <button
            onClick={onCreateCategory}
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
            Create Category
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
                    {canEdit && (
                      <button
                        onClick={() => onEditCategory(category)}
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
                    )}
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
          No categories found. {canCreate && 'Create your first category to get started.'}
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