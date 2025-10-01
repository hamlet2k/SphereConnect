import React from 'react';
import { adminPageStyles } from './AdminPageStyles';
import { theme } from '../theme';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.65)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1200,
  padding: theme.spacing[4]
};

const modalStyle: React.CSSProperties = {
  ...adminPageStyles.formContainer,
  maxWidth: '460px',
  width: '100%',
  marginBottom: 0
};

const titleStyle: React.CSSProperties = {
  margin: `0 0 ${theme.spacing[3]} 0`,
  color: theme.colors.primary,
  fontSize: theme.typography.fontSize.lg,
  fontWeight: theme.typography.fontWeight.bold,
  textShadow: theme.shadows.neon
};

const messageStyle: React.CSSProperties = {
  margin: `0 0 ${theme.spacing[6]} 0`,
  color: theme.colors.text,
  fontSize: theme.typography.fontSize.sm,
  lineHeight: 1.6
};

const buttonRowStyle: React.CSSProperties = {
  ...adminPageStyles.formButtons,
  justifyContent: 'flex-end'
};

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel'
}) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <h3 style={titleStyle}>{title}</h3>
        <p style={messageStyle}>{message}</p>
        <div style={buttonRowStyle}>
          <button
            type="button"
            style={adminPageStyles.formSecondaryButton}
            onClick={onCancel}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.backgroundColor = theme.colors.border;
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.backgroundColor = theme.colors.surfaceHover;
            }}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            style={adminPageStyles.formPrimaryButton}
            onClick={onConfirm}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.backgroundColor = theme.colors.primaryHover;
              (e.target as HTMLElement).style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.backgroundColor = theme.colors.primary;
              (e.target as HTMLElement).style.transform = 'translateY(0)';
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
