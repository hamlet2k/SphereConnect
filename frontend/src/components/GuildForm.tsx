import React, { useState } from 'react';
import { theme } from '../theme';
import { adminPageStyles } from './AdminPageStyles';
import AdminMessage from './AdminMessage';
import { useAdminMessage } from '../hooks/useAdminMessage';

interface GuildFormProps {
  onSuccess: (guild: any) => void;
  onCancel: () => void;
  isOpen: boolean;
  modal?: boolean; // Default true for backward compatibility
}

const GuildForm: React.FC<GuildFormProps> = ({
  onSuccess,
  onCancel,
  isOpen,
  modal = true
}) => {
  const [formData, setFormData] = useState({
    name: ''
  });

  const [loading, setLoading] = useState(false);
  const { message, showMessage, clearMessage } = useAdminMessage();

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    clearMessage();

    try {
      // Validate required fields
      if (!formData.name.trim()) {
        throw new Error('Guild name is required');
      }

      if (formData.name.trim().length < 3) {
        throw new Error('Guild name must be at least 3 characters');
      }

      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8000/api/admin/guilds', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const result = await response.json();
        onSuccess(result);
      } else if (response.status === 402) {
        showMessage('error', 'Guild limit reached. Upgrade to add more guilds.');
      } else {
        const errorData = await response.json();
        showMessage('error', errorData.detail || 'Failed to create guild');
      }
    } catch (err: any) {
      showMessage('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const formContent = (
    <>
      {message && (
        <AdminMessage
          type={message.type}
          message={message.text}
          onClose={clearMessage}
        />
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
            Guild Information
          </h4>

          <div style={{ marginBottom: theme.spacing[4] }}>
            <label style={{
              display: 'block',
              marginBottom: theme.spacing[1],
              fontWeight: theme.typography.fontWeight.semibold,
              color: theme.colors.text,
              fontSize: theme.typography.fontSize.sm
            }}>
              Guild Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              style={adminPageStyles.formInput}
              placeholder="Enter guild name"
              required
            />
            <small style={{
              display: 'block',
              marginTop: theme.spacing[1],
              color: theme.colors.textSecondary,
              fontSize: theme.typography.fontSize.xs
            }}>
              Guilds start with 2 member limit on the free tier. Upgrade for more members.
            </small>
          </div>
        </div>

        {/* Form Actions */}
        <div style={adminPageStyles.formButtons}>
          <button
            type="submit"
            disabled={loading}
            style={adminPageStyles.formPrimaryButton}
            onMouseEnter={(e) => {
              if (!loading) {
                (e.target as HTMLElement).style.backgroundColor = theme.colors.primaryHover;
                (e.target as HTMLElement).style.transform = 'translateY(-1px)';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                (e.target as HTMLElement).style.backgroundColor = theme.colors.success;
                (e.target as HTMLElement).style.transform = 'translateY(0)';
              }
            }}
          >
            {loading ? 'Creating...' : 'Create Guild'}
          </button>
          <button
            type="button"
            onClick={onCancel}
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
        zIndex: 1000
      }}>
        <div style={{
          backgroundColor: theme.colors.surface,
          borderRadius: theme.borderRadius.xl,
          padding: theme.spacing[6],
          width: '90%',
          maxWidth: '500px',
          maxHeight: '90vh',
          overflowY: 'auto',
          border: `1px solid ${theme.colors.border}`,
          boxShadow: theme.shadows.lg
        }}>
          <h3 style={{
            marginTop: 0,
            marginBottom: theme.spacing[6],
            color: theme.colors.primary,
            fontSize: theme.typography.fontSize['2xl'],
            fontWeight: theme.typography.fontWeight.bold,
            textShadow: theme.shadows.neon
          }}>
            Create New Guild
          </h3>

          {formContent}
        </div>
      </div>
    );
  }

  return formContent;
};

export default GuildForm;