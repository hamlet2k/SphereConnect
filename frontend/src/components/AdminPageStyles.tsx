// Reusable styles for admin pages in SphereConnect
// This provides consistent styling across all admin management components

import { theme } from '../theme';

// Base action button style
const actionButtonBase = {
  padding: `${theme.spacing[1]} ${theme.spacing[2]}`,
  border: 'none',
  borderRadius: theme.borderRadius.sm,
  fontSize: theme.typography.fontSize.xs,
  fontWeight: theme.typography.fontWeight.medium,
  cursor: 'pointer'
};

// Base message container style
const messageContainerBase = {
  marginTop: theme.spacing[4],
  padding: theme.spacing[3],
  borderRadius: theme.borderRadius.lg,
  fontSize: theme.typography.fontSize.sm
};

export const adminPageStyles = {
  // Main container for admin pages
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing[6],
    border: `1px solid ${theme.colors.border}`,
    boxShadow: theme.shadows.lg
  },

  // Header section with title and action buttons
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing[6]
  },

  // Page title styling
  title: {
    margin: 0,
    color: theme.colors.primary,
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    textShadow: theme.shadows.neon
  },

  // Primary action button (Create, Add, etc.)
  primaryButton: {
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
  },

  // Form container styling
  formContainer: {
    backgroundColor: theme.colors.background,
    padding: theme.spacing[6],
    borderRadius: theme.borderRadius.xl,
    marginBottom: theme.spacing[6],
    border: `1px solid ${theme.colors.border}`,
    boxShadow: theme.shadows.md
  },

  // Form title styling
  formTitle: {
    margin: '0 0 16px 0',
    color: theme.colors.primary,
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold
  },

  // Form field container
  formField: {
    marginBottom: theme.spacing[4]
  },

  // Form label styling
  formLabel: {
    display: 'block',
    marginBottom: theme.spacing[2],
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text,
    fontSize: theme.typography.fontSize.sm
  },

  // Form input styling
  formInput: {
    width: '100%',
    maxWidth: '100%',
    boxSizing: 'border-box' as const,
    padding: `${theme.spacing[2]} ${theme.spacing[3]}`,
    backgroundColor: theme.colors.background,
    border: `2px solid ${theme.colors.border}`,
    borderRadius: theme.borderRadius.lg,
    color: theme.colors.text,
    fontSize: theme.typography.fontSize.sm,
    outline: 'none',
    transition: 'all 0.2s ease-in-out'
  },

  // Form help text
  formHelp: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.fontSize.xs,
    marginTop: theme.spacing[1],
    display: 'block'
  },

  // Checkbox grid container
  checkboxGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: theme.spacing[2]
  },

  // Individual checkbox item
  checkboxItem: {
    display: 'flex',
    alignItems: 'center',
    padding: theme.spacing[2],
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    border: `1px solid ${theme.colors.border}`,
    cursor: 'pointer',
    transition: 'all 0.2s ease-in-out'
  },

  // Form button container
  formButtons: {
    display: 'flex',
    gap: theme.spacing[2],
    justifyContent: 'flex-start'
  },

  // Primary form button
  formPrimaryButton: {
    padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
    backgroundColor: theme.colors.primary,
    color: theme.colors.background,
    border: 'none',
    borderRadius: theme.borderRadius.lg,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    cursor: 'pointer',
    transition: 'all 0.2s ease-in-out',
    boxShadow: `0 0 10px ${theme.colors.primary}40`
  },

  // Secondary form button
  formSecondaryButton: {
    padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
    backgroundColor: theme.colors.surfaceHover,
    color: theme.colors.text,
    border: 'none',
    borderRadius: theme.borderRadius.lg,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    cursor: 'pointer',
    transition: 'all 0.2s ease-in-out'
  },

  // Loading spinner container
  loadingContainer: {
    textAlign: 'center',
    padding: theme.spacing[8]
  },

  // Loading spinner
  loadingSpinner: {
    width: '40px',
    height: '40px',
    border: `4px solid ${theme.colors.surfaceHover}`,
    borderTop: `4px solid ${theme.colors.primary}`,
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto'
  },

  // Loading text
  loadingText: {
    marginTop: theme.spacing[4],
    color: theme.colors.textSecondary,
    fontSize: theme.typography.fontSize.sm
  },

  // Table container
  tableContainer: {
    overflowX: 'auto',
    borderRadius: theme.borderRadius.lg,
    border: `1px solid ${theme.colors.border}`
  },

  // Table styling
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    backgroundColor: theme.colors.surface,
    fontSize: theme.typography.fontSize.sm
  },

  // Table header row
  tableHeaderRow: {
    backgroundColor: theme.colors.surfaceHover,
    borderBottom: `2px solid ${theme.colors.border}`
  },

  // Table header cell
  tableHeaderCell: {
    padding: theme.spacing[4],
    textAlign: 'left',
    color: theme.colors.text,
    fontWeight: theme.typography.fontWeight.semibold,
    fontSize: theme.typography.fontSize.sm
  },

  // Table body row
  tableBodyRow: {
    borderBottom: `1px solid ${theme.colors.border}`,
    transition: 'background-color 0.2s ease-in-out',
    cursor: 'pointer'
  },

  // Table body cell
  tableBodyCell: {
    padding: theme.spacing[4],
    color: theme.colors.text
  },

  // Table body cell with medium weight
  tableBodyCellMedium: {
    padding: theme.spacing[4],
    color: theme.colors.text,
    fontWeight: theme.typography.fontWeight.medium
  },

  // Table body cell with muted color
  tableBodyCellMuted: {
    padding: theme.spacing[4],
    color: theme.colors.textSecondary
  },

  // Action buttons container
  actionButtons: {
    display: 'flex',
    gap: theme.spacing[2],
    flexWrap: 'wrap'
  },

  // Action button (Edit, Delete, etc.)
  actionButton: actionButtonBase,

  // Primary action button
  actionButtonPrimary: {
    ...actionButtonBase,
    backgroundColor: theme.colors.primary,
    color: theme.colors.background
  },

  // Danger action button
  actionButtonDanger: {
    ...actionButtonBase,
    backgroundColor: theme.colors.error,
    color: theme.colors.text
  },

  // Empty state container
  emptyState: {
    textAlign: 'center',
    padding: theme.spacing[8],
    color: theme.colors.textMuted,
    fontSize: theme.typography.fontSize.sm
  },

  // Message container
  messageContainer: messageContainerBase,

  // Success message
  messageSuccess: {
    ...messageContainerBase,
    backgroundColor: `${theme.colors.success}20`,
    border: `1px solid ${theme.colors.success}`,
    color: theme.colors.success
  },

  // Info message
  messageInfo: {
    ...messageContainerBase,
    backgroundColor: `${theme.colors.info}20`,
    border: `1px solid ${theme.colors.info}`,
    color: theme.colors.info
  },

  // Error message
  messageError: {
    ...messageContainerBase,
    backgroundColor: `${theme.colors.error}20`,
    border: `1px solid ${theme.colors.error}`,
    color: theme.colors.error
  }
};

// Helper functions for dynamic styling
export const getMessageStyleByType = (type: 'success' | 'error' | 'info') => {
  switch (type) {
    case 'error':
      return adminPageStyles.messageError;
    case 'info':
      return adminPageStyles.messageInfo;
    default:
      return adminPageStyles.messageSuccess;
  }
};

export const getMessageStyle = (message: string) => {
  if (!message) {
    return adminPageStyles.messageContainer;
  }

  const lower = message.toLowerCase();
  const isError = lower.includes('error') || lower.includes('failed') ||
                  lower.includes('denied') || lower.includes('insufficient') ||
                  lower.includes('cannot') || lower.includes('not found');

  const isInfo = lower.includes('pending') || lower.includes('awaiting') ||
                 lower.includes('processing') || lower.includes('notice');

  if (isError) {
    return getMessageStyleByType('error');
  }

  if (isInfo) {
    return getMessageStyleByType('info');
  }

  return getMessageStyleByType('success');
};

export const getButtonHoverStyle = (buttonType: 'primary' | 'secondary') => {
  if (buttonType === 'primary') {
    return {
      backgroundColor: theme.colors.secondaryHover,
      transform: 'translateY(-1px)'
    };
  }
  return {
    backgroundColor: theme.colors.border
  };
};