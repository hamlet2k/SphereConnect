import React, { useState, FormEvent } from 'react';
import { theme } from '../theme';
import { adminPageStyles, getMessageStyle } from './AdminPageStyles';

interface InviteFormProps {
  guildId: string;
  guildName: string;
  isOpen: boolean;
  onClose: () => void;
  onInvite: (guildId: string, inviteData: any) => Promise<any>;
  loading?: boolean;
  message?: string;
  modal?: boolean; // Default true for backward compatibility
}

const InviteForm: React.FC<InviteFormProps> = ({
  guildId,
  guildName,
  isOpen,
  onClose,
  onInvite,
  loading = false,
  message = '',
  modal = true
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
      )}

      {/* Inline header */}
      {!modal && (
        <div style={{ marginBottom: theme.spacing[4] }}>
          <div style={{
            margin: 0,
            color: theme.colors.textSecondary,
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.medium
          }}>
            {guildName}
          </div>
        </div>
      )}

      {/* Message */}
      {message && (
        <div style={getMessageStyle(message)}>
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
                color: theme.colors.text,
                border: 'none',
                borderRadius: theme.borderRadius.sm,
                fontSize: theme.typography.fontSize.xs,
                fontWeight: theme.typography.fontWeight.medium,
                cursor: 'pointer'
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
              style={adminPageStyles.formInput}
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
              style={adminPageStyles.formInput}
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
                  (e.target as HTMLElement).style.backgroundColor = theme.colors.primary;
                  (e.target as HTMLElement).style.transform = 'translateY(0)';
                }
              }}
            >
              {loading ? 'Generating...' : 'Generate Invite'}
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

      {/* Close button when invite code is shown */}
      {inviteCode && (
        <div style={adminPageStyles.formButtons}>
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
            Close
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

export default InviteForm;