import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useGuild } from '../contexts/GuildContext';
import { theme } from '../theme';
import { adminPageStyles } from './AdminPageStyles';
import AdminMessage from './AdminMessage';
import ConfirmModal from './ConfirmModal';
import { useAdminMessage } from '../hooks/useAdminMessage';
import { useConfirmModal } from '../hooks/useConfirmModal';
import api from '../api';
import { parseApiError } from '../utils/errorUtils';

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
  const {
    message: listMessage,
    showMessage: showListMessage,
    clearMessage: clearListMessage
  } = useAdminMessage();
  const {
    message: formMessage,
    showMessage: showFormMessage,
    clearMessage: clearFormMessage
  } = useAdminMessage();
  const { confirmConfig, requestConfirmation, confirm: confirmModalConfirm, cancel: confirmModalCancel } = useConfirmModal();

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
  const hasToken = useMemo(() => Boolean(localStorage.getItem('token')), []);

  const loadCategories = useCallback(async (options?: { preserveMessage?: boolean }) => {
    if (!currentGuildId || !hasToken) return;

    setLoading(true);
    if (!options?.preserveMessage) {
      clearListMessage();
    }

    try {
      const params = new URLSearchParams({ guild_id: currentGuildId });
      if (nameFilter) params.append('name', nameFilter);
      if (descriptionFilter) params.append('description', descriptionFilter);

      const response = await api.get(`/categories?${params.toString()}`);
      setCategories(response.data);
    } catch (err: any) {
      const { detail } = parseApiError(err);
      showListMessage('error', detail || err.message || 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  }, [clearListMessage, currentGuildId, descriptionFilter, hasToken, nameFilter, showListMessage]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const submitCategory = async () => {

    try {
      if (!currentGuildId || !hasToken) {
        throw new Error('Access denied. Please login first.');
      }

      const payload = {
        ...formData,
        guild_id: currentGuildId
      };

      if (editingCategory) {
        await api.put(`/categories/${editingCategory.id}`, payload);
      } else {
        await api.post('/categories', payload);
      }

      showListMessage('success', `Category ${editingCategory ? 'updated' : 'created'} successfully`);

      clearFormMessage();

      setShowForm(false);

      setEditingCategory(null);

      resetForm();

      loadCategories({ preserveMessage: true });

    } catch (error: any) {

      const { detail } = parseApiError(error);

      showListMessage('error', detail || error.message || 'Error saving category');

    }

  };



  const handleSubmit = (e: React.FormEvent) => {

    e.preventDefault();

    if (!formData.name.trim()) {

      showFormMessage('error', 'Name is required');

      return;

    }



    const action = editingCategory ? 'update' : 'create';

    requestConfirmation({

      title: `${editingCategory ? 'Update' : 'Create'} Category`,

      message: `Are you sure you want to ${action} this category?`,

      confirmLabel: editingCategory ? 'Update' : 'Create',

      onConfirm: submitCategory

    });

  };



  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || ''
    });
    setShowForm(true);
  };

  const deleteCategory = async (categoryId: string) => {

    try {
      await api.delete(`/categories/${categoryId}`);

      showListMessage('success', 'Category deleted successfully');

      loadCategories({ preserveMessage: true });

    } catch (error: any) {

      const { detail } = parseApiError(error);

      showListMessage('error', detail || error.message || 'Error deleting category');

    }

  };



  const handleDelete = (categoryId: string) => {

    requestConfirmation({

      title: 'Delete Category',

      message: 'Are you sure you want to delete this category? This action cannot be undone.',

      confirmLabel: 'Delete',

      onConfirm: () => deleteCategory(categoryId)

    });

  };



  const resetForm = () => {
    setShowForm(false);
    setEditingCategory(null);
    setFormData({
      name: '',
      description: ''
    });
    clearFormMessage();
  };

  if (!hasToken) {
    return <div>Access denied. Please login first.</div>;
  }

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
      {listMessage && (
        <div style={{ marginBottom: theme.spacing[4] }}>
          <AdminMessage
            type={listMessage.type}
            message={listMessage.text}
            onClose={clearListMessage}
          />
        </div>
      )}

      {showForm && (
        <div style={adminPageStyles.formContainer}>
          <h4 style={adminPageStyles.formTitle}>
            {editingCategory ? 'Edit Category' : 'Create New Category'}
          </h4>

          {formMessage && (
            <div style={{ marginBottom: theme.spacing[4] }}>
              <AdminMessage
                type={formMessage.type}
                message={formMessage.text}
                onClose={clearFormMessage}
              />
            </div>
          )}
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

    </div>
  );
};

export default CategoriesList;


