import React, { useState, FormEvent } from 'react';
import { theme } from '../theme';

interface JoinFormProps {
  isOpen: boolean;
  onClose: () => void;
  onJoin: (inviteCode: string) => Promise<any>;
  loading?: boolean;
  message?: string;
}

const JoinForm: React.FC<JoinFormProps> = ({
  isOpen,
  onClose,
  onJoin,
  loading = false,
  message = ''
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
        {/* Header */}
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
            {joined ? 'Successfully Joined!' : 'Join Guild'}
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

        {/* Message */}
        {message && (
          <div style={{
            marginBottom: theme.spacing[4],
            padding: theme.spacing[3],
            backgroundColor: message.includes('Error') || message.includes('Invalid') || message.includes('Failed') ?
              `${theme.colors.error}20` : `${theme.colors.success}20`,
            border: `1px solid ${message.includes('Error') || message.includes('Invalid') || message.includes('Failed') ?
              theme.colors.error : theme.colors.success}`,
            borderRadius: theme.borderRadius.lg,
            color: message.includes('Error') || message.includes('Invalid') || message.includes('Failed') ?
              theme.colors.error : theme.colors.success,
            fontSize: theme.typography.fontSize.sm
          }}>
            {message}
          </div>
        )}

        {/* Success Message */}
        {joined && guildName && (
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
              Welcome to {guildName}!
            </h4>
            <p style={{
              margin: 0,
              color: theme.colors.textSecondary,
              fontSize: theme.typography.fontSize.sm
            }}>
              You have successfully joined the guild. You can now access all guild features and collaborate with other members.
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
                style={{
                  width: '100%',
                  padding: theme.spacing[3],
                  backgroundColor: theme.colors.background,
                  border: `2px solid ${theme.colors.border}`,
                  borderRadius: theme.borderRadius.lg,
                  color: theme.colors.text,
                  fontSize: theme.typography.fontSize.base,
                  fontFamily: theme.typography.fontFamily,
                  transition: 'all 0.2s ease-in-out',
                  outline: 'none'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = theme.colors.primary;
                  e.target.style.boxShadow = `0 0 0 3px ${theme.colors.primary}20`;
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = theme.colors.border;
                  e.target.style.boxShadow = 'none';
                }}
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
            <div style={{
              display: 'flex',
              gap: theme.spacing[3],
              justifyContent: 'flex-end'
            }}>
              <button
                type="button"
                onClick={handleClose}
                style={{
                  padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
                  backgroundColor: 'transparent',
                  color: theme.colors.textSecondary,
                  border: `1px solid ${theme.colors.border}`,
                  borderRadius: theme.borderRadius.lg,
                  fontSize: theme.typography.fontSize.sm,
                  fontWeight: theme.typography.fontWeight.medium,
                  cursor: 'pointer',
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
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !inviteCode.trim()}
                style={{
                  padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
                  backgroundColor: loading || !inviteCode.trim() ? theme.colors.surfaceHover : theme.colors.primary,
                  color: loading || !inviteCode.trim() ? theme.colors.textMuted : theme.colors.background,
                  border: 'none',
                  borderRadius: theme.borderRadius.lg,
                  fontSize: theme.typography.fontSize.sm,
                  fontWeight: theme.typography.fontWeight.semibold,
                  cursor: loading || !inviteCode.trim() ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease-in-out',
                  boxShadow: loading || !inviteCode.trim() ? 'none' : theme.shadows.neon
                }}
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
            </div>
          </form>
        )}

        {/* Success Actions */}
        {joined && (
          <div style={{
            display: 'flex',
            gap: theme.spacing[3],
            justifyContent: 'center'
          }}>
            <button
              onClick={handleJoinAnother}
              style={{
                padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
                backgroundColor: 'transparent',
                color: theme.colors.primary,
                border: `1px solid ${theme.colors.primary}`,
                borderRadius: theme.borderRadius.lg,
                fontSize: theme.typography.fontSize.sm,
                fontWeight: theme.typography.fontWeight.medium,
                cursor: 'pointer',
                transition: 'all 0.2s ease-in-out'
              }}
              onMouseEnter={(e) => {
                (e.target as HTMLElement).style.backgroundColor = theme.colors.primary;
                (e.target as HTMLElement).style.color = theme.colors.background;
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLElement).style.backgroundColor = 'transparent';
                (e.target as HTMLElement).style.color = theme.colors.primary;
              }}
            >
              Join Another Guild
            </button>
            <button
              onClick={handleClose}
              style={{
                padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
                backgroundColor: theme.colors.primary,
                color: theme.colors.background,
                border: 'none',
                borderRadius: theme.borderRadius.lg,
                fontSize: theme.typography.fontSize.sm,
                fontWeight: theme.typography.fontWeight.semibold,
                cursor: 'pointer',
                transition: 'all 0.2s ease-in-out',
                boxShadow: theme.shadows.neon
              }}
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
      </div>
    </div>
  );
};

export default JoinForm;