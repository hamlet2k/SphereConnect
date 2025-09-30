import React, { useEffect } from 'react';
import { theme } from '../theme';
import { getMessageStyleByType } from './AdminPageStyles';

export type AdminMessageType = 'success' | 'error' | 'info';

export interface AdminMessageState {
  type: AdminMessageType;
  text: string;
}

interface AdminMessageProps {
  type: AdminMessageType;
  message: string;
  onClose?: () => void;
  autoDismissMs?: number;
}

const DEFAULT_AUTO_DISMISS_MS = 5000;

const AdminMessage: React.FC<AdminMessageProps> = ({
  type,
  message,
  onClose,
  autoDismissMs = DEFAULT_AUTO_DISMISS_MS
}) => {
  useEffect(() => {
    if (!message || type === 'error' || !onClose) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      onClose();
    }, autoDismissMs);

    return () => window.clearTimeout(timer);
  }, [autoDismissMs, message, onClose, type]);

  if (!message) {
    return null;
  }

  const baseStyle = getMessageStyleByType(type);
  const combinedStyle: React.CSSProperties = {
    ...baseStyle,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing[3]
  };

  const closeButtonStyle: React.CSSProperties = {
    background: 'transparent',
    border: 'none',
    color: baseStyle.color ?? theme.colors.text,
    cursor: 'pointer',
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.bold,
    lineHeight: 1,
    marginLeft: theme.spacing[2]
  };

  return (
    <div
      data-message-type={type}
      role={type === 'error' ? 'alert' : 'status'}
      aria-live={type === 'error' ? 'assertive' : 'polite'}
      style={combinedStyle}
    >
      <span>{message}</span>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Dismiss message"
          style={closeButtonStyle}
        >
          &times;
        </button>
      )}
    </div>
  );
};

export default AdminMessage;
