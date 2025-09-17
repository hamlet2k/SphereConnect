import React, { useState, FormEvent } from 'react';
import { theme } from '../theme';

interface InviteFormProps {
  guildId: string;
  guildName: string;
  isOpen: boolean;
  onClose: () => void;
  onInvite: (guildId: string, inviteData: any) => Promise<any>;
  loading?: boolean;
  message?: string;
}

const InviteForm: React.FC<InviteFormProps> = ({
  guildId,
  guildName,
  isOpen,
  onClose,
  onInvite,
  loading = false,
  message = ''
}) => {
  const [expiresIn, setExpiresIn] = useState<string>('24'); // hours
  const [usesLeft, setUsesLeft] = useState<string>('1');
  const [inviteCode, setInviteCode] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const inviteData = {
      guild_id: guildId,
      expires_at: expiresIn ? new Date(Date.now() + parseInt(expiresIn) * 60 * 60 * 1000).toISOString() : null,
      uses_left: parseInt(usesLeft) || 1
    };

    try {
      const result = await onInvite(guildId, inviteData);
      // The result should contain the invite code
      if (result && (result as any).code) {
        setInviteCode((result as any).code);
      }
    } catch (error) {
      console.error('Failed to create invite:', error);
    }
  };

  const copyToClipboard = async () => {
    if (inviteCode) {
      try {
        await navigator.clipboard.writeText(inviteCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        console.error('Failed to copy to clipboard:', error);
      }
    }
  };

  const resetForm = () => {
    setExpiresIn('24');
    setUsesLeft('1');
    setInviteCode('');
    setCopied(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
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
            Invite to {guildName}
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
            backgroundColor: message.includes('Error') || message.includes('Failed') ?
              `${theme.colors.error}20` : `${theme.colors.success}20`,
            border: `1px solid ${message.includes('Error') || message.includes('Failed') ?
              theme.colors.error : theme.colors.success}`,
            borderRadius: theme.borderRadius.lg,
            color: message.includes('Error') || message.includes('Failed') ?
              theme.colors.error : theme.colors.success,
            fontSize: theme.typography.fontSize.sm
          }}>
            {message}
          </div>
        )}

        {/* Invite Code Display */}
        {inviteCode && (
          <div style={{
            marginBottom: theme.spacing[6],
            padding: theme.spacing[4],
            backgroundColor: `${theme.colors.success}10`,
            border: `2px solid ${theme.colors.success}`,
            borderRadius: theme.borderRadius.lg
          }}>
            <h4 style={{
              margin: `0 0 ${theme.spacing[3]} 0`,
              color: theme.colors.success,
              fontSize: theme.typography.fontSize.base,
              fontWeight: theme.typography.fontWeight.semibold
            }}>
              Invite Code Generated!
            </h4>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing[3],
              marginBottom: theme.spacing[3]
            }}>
              <code style={{
                flex: 1,
                padding: theme.spacing[2],
                backgroundColor: theme.colors.background,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: theme.borderRadius.sm,
                color: theme.colors.primary,
                fontSize: theme.typography.fontSize.sm,
                fontWeight: theme.typography.fontWeight.medium,
                wordBreak: 'break-all'
              }}>
                {inviteCode}
              </code>
              <button
                onClick={copyToClipboard}
                style={{
                  padding: `${theme.spacing[2]} ${theme.spacing[3]}`,
                  backgroundColor: copied ? theme.colors.success : theme.colors.primary,
                  color: theme.colors.background,
                  border: 'none',
                  borderRadius: theme.borderRadius.sm,
                  fontSize: theme.typography.fontSize.sm,
                  fontWeight: theme.typography.fontWeight.medium,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease-in-out'
                }}
                onMouseEnter={(e) => {
                  (e.target as HTMLElement).style.backgroundColor = copied ? theme.colors.success : theme.colors.primaryHover;
                  (e.target as HTMLElement).style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLElement).style.backgroundColor = copied ? theme.colors.success : theme.colors.primary;
                  (e.target as HTMLElement).style.transform = 'translateY(0)';
                }}
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <p style={{
              margin: 0,
              color: theme.colors.textSecondary,
              fontSize: theme.typography.fontSize.sm
            }}>
              Share this code with players you want to invite. The code can be used {usesLeft} time(s) and expires in {expiresIn} hours.
            </p>
          </div>
        )}

        {/* Form */}
        {!inviteCode && (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: theme.spacing[4] }}>
              <label style={{
                display: 'block',
                marginBottom: theme.spacing[2],
                color: theme.colors.text,
                fontSize: theme.typography.fontSize.sm,
                fontWeight: theme.typography.fontWeight.medium
              }}>
                Expiration Time (hours)
              </label>
              <select
                value={expiresIn}
                onChange={(e) => setExpiresIn(e.target.value)}
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
              >
                <option value="1">1 hour</option>
                <option value="6">6 hours</option>
                <option value="24">24 hours</option>
                <option value="72">3 days</option>
                <option value="168">1 week</option>
                <option value="">Never expires</option>
              </select>
            </div>

            <div style={{ marginBottom: theme.spacing[6] }}>
              <label style={{
                display: 'block',
                marginBottom: theme.spacing[2],
                color: theme.colors.text,
                fontSize: theme.typography.fontSize.sm,
                fontWeight: theme.typography.fontWeight.medium
              }}>
                Uses Left
              </label>
              <input
                type="number"
                value={usesLeft}
                onChange={(e) => setUsesLeft(e.target.value)}
                min="1"
                max="10"
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
                Maximum 10 uses per invite code
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
                disabled={loading}
                style={{
                  padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
                  backgroundColor: loading ? theme.colors.surfaceHover : theme.colors.primary,
                  color: loading ? theme.colors.textMuted : theme.colors.background,
                  border: 'none',
                  borderRadius: theme.borderRadius.lg,
                  fontSize: theme.typography.fontSize.sm,
                  fontWeight: theme.typography.fontWeight.semibold,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease-in-out',
                  boxShadow: loading ? 'none' : theme.shadows.neon
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    (e.target as HTMLElement).style.backgroundColor = theme.colors.primaryHover;
                    (e.target as HTMLElement).style.transform = 'translateY(-1px)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loading) {
                    (e.target as HTMLElement).style.backgroundColor = theme.colors.primary;
                    (e.target as HTMLElement).style.transform = 'translateY(0)';
                  }
                }}
              >
                {loading ? 'Generating...' : 'Generate Invite'}
              </button>
            </div>
          </form>
        )}

        {/* Close button when invite code is shown */}
        {inviteCode && (
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end'
          }}>
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
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default InviteForm;