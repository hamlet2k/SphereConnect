import { theme } from '../theme';

// Common styles for Login and Register pages
export const authPageStyles = {
  // Page container
  pageContainer: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
    backgroundImage: `radial-gradient(circle at 20% 50%, ${theme.colors.primary}10 0%, transparent 50%), radial-gradient(circle at 80% 20%, ${theme.colors.secondary}10 0%, transparent 50%)`,
    padding: theme.spacing[4],
    fontFamily: theme.typography.fontFamily
  },

  // Form container
  formContainer: {
    maxWidth: '400px',
    margin: '0 auto',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing[8],
    borderRadius: theme.borderRadius.xl,
    border: `1px solid ${theme.colors.border}`,
    boxShadow: theme.shadows.lg
  },

  // Form title
  formTitle: {
    textAlign: 'center' as const,
    marginBottom: theme.spacing[6],
    color: theme.colors.primary,
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.bold,
    textShadow: theme.shadows.neon
  },

  // Input field container
  inputContainer: {
    marginBottom: theme.spacing[4]
  },

  // Input field (base styles)
  inputBase: {
    width: '100%',
    padding: theme.spacing[3],
    backgroundColor: theme.colors.background,
    border: `2px solid ${theme.colors.border}`,
    borderRadius: theme.borderRadius.lg,
    color: theme.colors.text,
    fontSize: theme.typography.fontSize.base,
    fontFamily: theme.typography.fontFamily,
    transition: 'all 0.2s ease-in-out',
    outline: 'none',
    boxSizing: 'border-box' as const
  },

  // Input focus styles (functions)
  getInputFocusStyles: () => ({
    borderColor: theme.colors.primary,
    boxShadow: `0 0 0 3px ${theme.colors.primary}20`
  }),

  getInputBlurStyles: () => ({
    borderColor: theme.colors.border,
    boxShadow: 'none'
  }),

  // Special input styles
  pinInput: {
    textAlign: 'center' as const,
    letterSpacing: '4px'
  },

  // Button styles
  buttonBase: {
    width: '100%',
    padding: theme.spacing[3],
    border: 'none',
    borderRadius: theme.borderRadius.lg,
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    fontFamily: theme.typography.fontFamily,
    cursor: 'pointer',
    transition: 'all 0.2s ease-in-out',
    marginBottom: theme.spacing[4]
  },

  getButtonPrimaryStyles: (isLoading: boolean) => ({
    backgroundColor: isLoading ? theme.colors.surfaceHover : theme.colors.primary,
    color: theme.colors.background,
    boxShadow: isLoading ? 'none' : theme.shadows.neon
  }),

  getButtonHoverStyles: () => ({
    backgroundColor: theme.colors.primaryHover,
    transform: 'translateY(-1px)'
  }),

  getButtonLeaveStyles: () => ({
    backgroundColor: theme.colors.primary,
    transform: 'translateY(0)'
  }),

  // Link styles
  linkContainer: {
    textAlign: 'center' as const,
    marginBottom: theme.spacing[4]
  },

  linkText: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.fontSize.sm
  },

  linkBase: {
    color: theme.colors.primary,
    textDecoration: 'none',
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    transition: 'all 0.2s ease-in-out'
  },

  getLinkHoverStyles: () => ({
    color: theme.colors.primaryHover,
    textShadow: theme.shadows.neon
  }),

  getLinkLeaveStyles: () => ({
    color: theme.colors.primary,
    textShadow: 'none'
  }),

  // Message styles
  getMessageStyles: (isError: boolean) => ({
    marginTop: theme.spacing[4],
    color: isError ? theme.colors.error : theme.colors.success,
    textAlign: 'center' as const,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium
  }),

  // Special form elements
  pinForm: {
    maxWidth: '400px',
    margin: '0 auto'
  },

  pinTitle: {
    textAlign: 'center' as const,
    marginBottom: '24px'
  },

  pinDescription: {
    textAlign: 'center' as const,
    marginBottom: '24px',
    color: '#4a5568'
  },

  backButton: {
    width: '100%',
    padding: '12px',
    backgroundColor: 'transparent',
    color: '#3182ce',
    border: '1px solid #3182ce',
    borderRadius: '4px',
    fontSize: '16px',
    cursor: 'pointer',
    marginTop: '12px'
  },

  successContainer: {
    textAlign: 'center' as const,
    maxWidth: '400px',
    margin: '0 auto'
  },

  successTitle: {
    color: '#38a169',
    marginBottom: '24px'
  },

  successMessage: {
    color: '#4a5568',
    marginBottom: '24px'
  },

  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #3182ce',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto'
  }
};

// CSS for animations and special styles
export const authPageCSS = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  /* Custom placeholder styling */
  input::placeholder {
    color: ${theme.colors.textMuted} !important;
  }
`;