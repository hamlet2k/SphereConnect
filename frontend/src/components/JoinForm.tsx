import React, { useState, FormEvent } from 'react';
import { theme } from '../theme';
import { adminPageStyles, getMessageStyle } from './AdminPageStyles';

interface JoinFormProps {
  isOpen: boolean;
  onClose: () => void;
  onJoin: (inviteCode: string) => Promise<any>;
  loading?: boolean;
  message?: string;
  modal?: boolean; // Default true for backward compatibility
}

const JoinForm: React.FC<JoinFormProps> = ({
  isOpen,
  onClose,
  onJoin,
  loading = false,
  message = '',
  modal = true
}) => {
  const [inviteCode, setInviteCode] = useState<string>('');
  const [joined, setJoined] = useState<boolean>(false);
  const [guildName, setGuildName] = useState<string>('');

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!inviteCode.trim()) {
      return;
    }

    console.log('JoinForm: Starting join request with invite code:', inviteCode.trim());

    try {
      const result = await onJoin(inviteCode.trim());
      console.log('JoinForm: Join request completed, result:', result);
      if (result && result.guild_name) {
        setGuildName(result.guild_name);
        setJoined(true);
      }
    } catch (error) {
      console.error('JoinForm: Failed to join guild:', error);
    }
  };

  const resetForm = () => {
    setInviteCode('');
    setJoined(false);
    setGuildName('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleJoinAnother = () => {
    resetForm();
  };

  if (!isOpen) return null;

  const formContent = (
    <>
      {/* Header - only show in modal mode */}
      {modal && (
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
            Join Guild
          </h3>
          <button
            onClick={handleClose}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              color: theme.colors.textSecondary,
              fontSize: theme.typography.fontSize.lg,
              cursor: 'pointer',
              padding: theme.spacing[1],
              borderRadius: theme.borderRadius.sm,
              transition: 'all 0.2s ease-in-out'
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.backgroundColor = theme.colors.surfaceHover;
              (e.target as HTMLElement).style.color = theme.colors.text;
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.backgroundColor = 'transparent';
              (e.target as HTMLElement).style.color = theme.colors.textSecondary;
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Inline header */}
      {!modal && (
        <div style={{ marginBottom: theme.spacing[4] }}>
          <h4 style={{
            margin: 0,
            color: theme.colors.primary,
            fontSize: theme.typography.fontSize.lg,
            fontWeight: theme.typography.fontWeight.semibold
          }}>
            Join a Guild
          </h4>
        </div>
      )}

      {/* Message */}
      {message && (
        <div style={getMessageStyle(message)}>
          {message}
        </div>
      )}

      {/* Success Message - only show in modal mode */}
      {modal && joined && guildName && (
        <div style={{
          marginBottom: theme.spacing[6],
          padding: theme.spacing[4],
          backgroundColor: `${theme.colors.success}10`,
          border: `2px solid ${theme.colors.success}`,
          borderRadius: theme.borderRadius.lg,
          textAlign: 'center'
        }}>
          <div style={{
            fontSize: theme.typography.fontSize['3xl'],
            marginBottom: theme.spacing[2]
          }}>
            🎉
          </div>
          <h4 style={{
            margin: `0 0 ${theme.spacing[3]} 0`,
            color: theme.colors.success,
            fontSize: theme.typography.fontSize.lg,
            fontWeight: theme.typography.fontWeight.semibold
          }}>
            Request Sent!
          </h4>
          <p style={{
            margin: 0,
            color: theme.colors.textSecondary,
            fontSize: theme.typography.fontSize.sm
          }}>
            Your request to join {guildName} has been sent. A guild leader will review your request.
          </p>
        </div>
      )}

      {/* Form */}
      {!joined && (
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: theme.spacing[4] }}>
            <label style={{
              display: 'block',
              marginBottom: theme.spacing[2],
              color: theme.colors.text,
              fontSize: theme.typography.fontSize.sm,
              fontWeight: theme.typography.fontWeight.medium
            }}>
              Invite Code
            </label>
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="Enter invite code (e.g., AbC123dEf456)"
              required
              style={adminPageStyles.formInput}
            />
            <p style={{
              margin: `${theme.spacing[2]} 0 0 0`,
              color: theme.colors.textSecondary,
              fontSize: theme.typography.fontSize.xs
            }}>
              Enter the invite code provided by a guild member
            </p>
          </div>

          {/* Action Buttons */}
          <div style={adminPageStyles.formButtons}>
            <button
              type="submit"
              disabled={loading || !inviteCode.trim()}
              style={adminPageStyles.formPrimaryButton}
              onMouseEnter={(e) => {
                if (!loading && inviteCode.trim()) {
                  (e.target as HTMLElement).style.backgroundColor = theme.colors.primaryHover;
                  (e.target as HTMLElement).style.transform = 'translateY(-1px)';
                }
              }}
              onMouseLeave={(e) => {
                if (!loading && inviteCode.trim()) {
                  (e.target as HTMLElement).style.backgroundColor = theme.colors.primary;
                  (e.target as HTMLElement).style.transform = 'translateY(0)';
                }
              }}
            >
              {loading ? 'Joining...' : 'Join Guild'}
            </button>
            <button
              type="button"
              onClick={handleClose}
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
      )}

      {/* Success Actions - only show in modal mode */}
      {modal && joined && (
        <div style={{
          ...adminPageStyles.formButtons,
          justifyContent: 'center'
        }}>
          <button
            onClick={handleJoinAnother}
            style={adminPageStyles.formSecondaryButton}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.backgroundColor = theme.colors.primary;
              (e.target as HTMLElement).style.color = theme.colors.background;
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.backgroundColor = theme.colors.surfaceHover;
              (e.target as HTMLElement).style.color = theme.colors.textSecondary;
            }}
          >
            Join Another Guild
          </button>
          <button
            onClick={handleClose}
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
            Continue
          </button>
        </div>
      )}
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
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        fontFamily: theme.typography.fontFamily
      }}>
        <div style={{
          backgroundColor: theme.colors.surface,
          borderRadius: theme.borderRadius.xl,
          padding: theme.spacing[6],
          maxWidth: '500px',
          width: '90%',
          maxHeight: '90vh',
          overflow: 'auto',
          border: `1px solid ${theme.colors.border}`,
          boxShadow: theme.shadows['2xl']
        }}>
          {formContent}
        </div>
      </div>
    );
  }

  return formContent;
};

export default JoinForm;