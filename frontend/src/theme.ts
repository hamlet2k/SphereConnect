// Star Citizen-inspired theme for SphereConnect
// Dark background with neon accents for futuristic feel

export const theme = {
  colors: {
    // Background colors
    background: '#1A202C', // Dark slate
    surface: '#2D3748', // Slightly lighter dark
    surfaceHover: '#4A5568', // Even lighter for hover states

    // Primary colors (neon cyan for Star Citizen feel)
    primary: '#00F4FF', // Bright cyan
    primaryHover: '#00D4E0', // Slightly darker cyan
    primaryLight: '#80FAFF', // Light cyan for accents

    // Secondary colors
    secondary: '#FF6B35', // Orange accent
    secondaryHover: '#E55A2B', // Darker orange

    // Status colors
    success: '#38A169', // Green
    warning: '#D69E2E', // Yellow
    error: '#E53E3E', // Red
    info: '#3182CE', // Blue

    // Text colors
    text: '#F7FAFC', // Off-white
    textSecondary: '#A0AEC0', // Gray
    textMuted: '#718096', // Darker gray

    // Border colors
    border: '#4A5568',
    borderLight: '#718096',
  },

  typography: {
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: {
      xs: '0.75rem', // 12px
      sm: '0.875rem', // 14px
      base: '1rem', // 16px
      lg: '1.125rem', // 18px
      xl: '1.25rem', // 20px
      '2xl': '1.5rem', // 24px
      '3xl': '1.875rem', // 30px
      '4xl': '2.25rem', // 36px
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    lineHeight: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.625,
    },
  },

  spacing: {
    px: '1px',
    0: '0',
    1: '0.25rem', // 4px
    2: '0.5rem', // 8px
    3: '0.75rem', // 12px
    4: '1rem', // 16px
    5: '1.25rem', // 20px
    6: '1.5rem', // 24px
    8: '2rem', // 32px
    10: '2.5rem', // 40px
    12: '3rem', // 48px
    16: '4rem', // 64px
    20: '5rem', // 80px
    24: '6rem', // 96px
  },

  borderRadius: {
    none: '0',
    sm: '0.125rem', // 2px
    base: '0.25rem', // 4px
    md: '0.375rem', // 6px
    lg: '0.5rem', // 8px
    xl: '0.75rem', // 12px
    '2xl': '1rem', // 16px
    '3xl': '1.5rem', // 24px
    full: '9999px',
  },

  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    base: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
    neon: `0 0 10px ${'#00F4FF'}40, 0 0 20px ${'#00F4FF'}20, 0 0 30px ${'#00F4FF'}10`,
  },

  components: {
    button: {
      base: {
        fontFamily: '"Inter", sans-serif',
        fontWeight: 600,
        borderRadius: '0.5rem',
        transition: 'all 0.2s ease-in-out',
        cursor: 'pointer',
        border: 'none',
        outline: 'none',
      },
      variants: {
        primary: {
          backgroundColor: '#00F4FF',
          color: '#1A202C',
          boxShadow: `0 0 10px ${'#00F4FF'}40`,
          '&:hover': {
            backgroundColor: '#00D4E0',
            boxShadow: `0 0 15px ${'#00F4FF'}60`,
            transform: 'translateY(-1px)',
          },
          '&:active': {
            transform: 'translateY(0)',
          },
        },
        secondary: {
          backgroundColor: '#FF6B35',
          color: '#F7FAFC',
          '&:hover': {
            backgroundColor: '#E55A2B',
            transform: 'translateY(-1px)',
          },
        },
        outline: {
          backgroundColor: 'transparent',
          color: '#00F4FF',
          border: `2px solid #00F4FF`,
          '&:hover': {
            backgroundColor: '#00F4FF',
            color: '#1A202C',
          },
        },
        ghost: {
          backgroundColor: 'transparent',
          color: '#A0AEC0',
          '&:hover': {
            backgroundColor: '#4A5568',
            color: '#F7FAFC',
          },
        },
      },
      sizes: {
        sm: {
          padding: '0.5rem 1rem',
          fontSize: '0.875rem',
        },
        base: {
          padding: '0.75rem 1.5rem',
          fontSize: '1rem',
        },
        lg: {
          padding: '1rem 2rem',
          fontSize: '1.125rem',
        },
      },
    },

    input: {
      base: {
        fontFamily: '"Inter", sans-serif',
        backgroundColor: '#2D3748',
        border: '2px solid #4A5568',
        borderRadius: '0.5rem',
        color: '#F7FAFC',
        fontSize: '1rem',
        padding: '0.75rem 1rem',
        transition: 'all 0.2s ease-in-out',
        '&:focus': {
          outline: 'none',
          borderColor: '#00F4FF',
          boxShadow: `0 0 0 3px ${'#00F4FF'}20`,
        },
        '&::placeholder': {
          color: '#718096',
        },
      },
    },

    card: {
      base: {
        backgroundColor: '#2D3748',
        border: '1px solid #4A5568',
        borderRadius: '0.75rem',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      },
    },

    table: {
      base: {
        width: '100%',
        borderCollapse: 'collapse',
        backgroundColor: '#2D3748',
        borderRadius: '0.5rem',
        overflow: 'hidden',
      },
      header: {
        backgroundColor: '#4A5568',
        color: '#F7FAFC',
        fontWeight: 600,
        padding: '1rem',
        textAlign: 'left',
        borderBottom: '1px solid #718096',
      },
      cell: {
        padding: '1rem',
        borderBottom: '1px solid #4A5568',
        color: '#F7FAFC',
      },
      row: {
        '&:hover': {
          backgroundColor: '#374151',
        },
      },
    },
  },
};

// Helper function to get theme values
export const getThemeValue = (path: string): any => {
  return path.split('.').reduce((obj: any, key: string) => obj?.[key], theme);
};

// CSS custom properties for global styles
export const globalCss = `
  :root {
    --color-background: ${theme.colors.background};
    --color-surface: ${theme.colors.surface};
    --color-primary: ${theme.colors.primary};
    --color-text: ${theme.colors.text};
    --color-border: ${theme.colors.border};
    --font-family: ${theme.typography.fontFamily};
  }

  * {
    box-sizing: border-box;
  }

  body {
    margin: 0;
    font-family: ${theme.typography.fontFamily};
    background-color: ${theme.colors.background};
    color: ${theme.colors.text};
    line-height: ${theme.typography.lineHeight.normal};
  }

  /* Custom scrollbar */
  ::-webkit-scrollbar {
    width: 8px;
  }

  ::-webkit-scrollbar-track {
    background: ${theme.colors.surface};
  }

  ::-webkit-scrollbar-thumb {
    background: ${theme.colors.primary};
    border-radius: 4px;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: ${theme.colors.primaryHover};
  }
`;