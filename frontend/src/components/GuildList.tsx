import React, { useState, useCallback } from 'react';
import { theme } from '../theme';
import { adminPageStyles } from './AdminPageStyles';
import GuildForm from './GuildForm';
import JoinForm from './JoinForm';
import InviteForm from './InviteForm';
import api from '../api';

interface Guild {
  id: string;
  name: string;
  creator_id?: string;
  member_limit: number;
  billing_tier: string;
  is_solo: boolean;
  is_deletable: boolean;
  type: string;
  approved_count?: number; // Count of approved guild requests
}

interface GuildListProps {
  guilds: Guild[];
  currentGuildId: string;
  onGuildSwitch: (guildId: string) => void;
  onInvite: (guildId: string) => void;
  onJoin: () => void;
  onLeave: (guildId: string) => void;
  onKick: (userId: string) => void;
  onDelete: (guildId: string) => void;
  onGuildCreateSuccess?: (guild: any) => void;
  onInviteSuccess?: () => void;
  loading?: boolean;
  message?: string;
}

const GuildList: React.FC<GuildListProps> = ({
  guilds,
  currentGuildId,
  onGuildSwitch,
  onInvite,
  onJoin,
  onLeave,
  onKick,
  onDelete,
  onGuildCreateSuccess,
  onInviteSuccess,
  loading = false,
  message = ''
}) => {
  // Form states
  const [showForm, setShowForm] = useState(false);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState<{guildId: string, guildName: string} | null>(null);
  const [formMessage, setFormMessage] = useState('');

  const handleInvite = useCallback((guildId: string) => {
    const guild = guilds.find(g => g.id === guildId);
    if (guild) {
      setShowInviteForm({guildId, guildName: guild.name});
      setFormMessage('');
    }
  }, [guilds]);

  const handleLeave = async (guildId: string) => {
    if (window.confirm('Are you sure you want to leave this guild? You will be switched to your personal guild.')) {
      onLeave(guildId);
    }
  };

  const handleDelete = async (guildId: string) => {
    const guild = guilds.find(g => g.id === guildId);
    if (guild?.is_solo) {
      alert('Personal guilds cannot be deleted.');
      return;
    }

    if (window.confirm('Are you sure you want to delete this guild? This action cannot be undone.')) {
      onDelete(guildId);
    }
  };

  const handleCreateGuild = () => {
    setShowForm(true);
    setFormMessage('');
  };

  const handleFormSuccess = (guild: any) => {
    setShowForm(false);
    setFormMessage('');
    if (onGuildCreateSuccess) {
      onGuildCreateSuccess(guild);
    }
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setFormMessage('');
  };

  const handleJoinClick = () => {
    setShowJoinForm(true);
    setFormMessage('');
  };

  const handleJoinFormSuccess = async (result: any) => {
    setShowJoinForm(false);
    setFormMessage(`Request to join ${result.guild_name || 'guild'} sent`);
    // Reload data after a short delay
    setTimeout(() => {
      if (onGuildCreateSuccess) {
        onGuildCreateSuccess(null); // Trigger reload
      }
    }, 1000);
  };

  const handleJoinFormCancel = () => {
    setShowJoinForm(false);
    setFormMessage('');
  };

  const handleInviteFormSuccess = async (result: any) => {
    setShowInviteForm(null);
    setFormMessage('Invite code generated successfully!');
    if (onInviteSuccess) {
      onInviteSuccess();
    }
  };

  const handleInviteFormCancel = () => {
    setShowInviteForm(null);
    setFormMessage('');
  };

  const displayMessage = formMessage || (message && !message.startsWith('Guild') && !message.startsWith('Successfully') ? message : '');

  const getMemberStatus = (guild: Guild) => {
    const approvedCount = guild.approved_count || 0;
    const limit = guild.member_limit;
    const percentage = (approvedCount / limit) * 100;

    if (percentage >= 100) {
      return { text: `${approvedCount}/${limit} (Full)`, color: theme.colors.error };
    } else if (percentage >= 80) {
      return { text: `${approvedCount}/${limit} (Near Limit)`, color: theme.colors.warning };
    } else {
      return { text: `${approvedCount}/${limit}`, color: theme.colors.success };
    }
  };

  return (
    <div style={adminPageStyles.container}>
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
          Guild Management
        </h3>
        <div style={{
          display: 'flex',
          gap: theme.spacing[3]
        }}>
          <button
            onClick={handleCreateGuild}
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
              boxShadow: `0 0 10px ${theme.colors.primary}40`
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.backgroundColor = '#E55A2B';
              (e.target as HTMLElement).style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.backgroundColor = '#FF6B35';
              (e.target as HTMLElement).style.transform = 'translateY(0)';
            }}
          >
            Create Guild
          </button>
          <button
            onClick={handleJoinClick}
            style={{
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
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.backgroundColor = theme.colors.secondaryHover;
              (e.target as HTMLElement).style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.backgroundColor = theme.colors.secondary;
              (e.target as HTMLElement).style.transform = 'translateY(0)';
            }}
          >
            Join Guild
          </button>
        </div>
      </div>

      {showForm && (
        <div style={adminPageStyles.formContainer}>
          <h4 style={adminPageStyles.formTitle}>Create New Guild</h4>
          <GuildForm
            onSuccess={handleFormSuccess}
            onCancel={handleFormCancel}
            isOpen={showForm}
            modal={false}
          />
        </div>
      )}

      {showJoinForm && (
        <div style={adminPageStyles.formContainer}>
          <JoinForm
            onJoin={async (inviteCode: string) => {
              const user = JSON.parse(localStorage.getItem('user') || '{}');
              const userId = user.id;

              if (!userId) {
                throw new Error('User not found');
              }

              const response = await api.post(`/users/${userId}/join`, { invite_code: inviteCode });
              handleJoinFormSuccess(response.data);
              return response.data;
            }}
            onClose={handleJoinFormCancel}
            isOpen={showJoinForm}
            modal={false}
            message={formMessage}
          />
        </div>
      )}

      {showInviteForm && (
        <div style={adminPageStyles.formContainer}>
          <InviteForm
            guildId={showInviteForm.guildId}
            guildName={showInviteForm.guildName}
            onInvite={async (guildId: string, inviteData: any) => {
              const response = await api.post('/invites', inviteData);
              handleInviteFormSuccess(response.data);
              return response.data;
            }}
            onClose={handleInviteFormCancel}
            isOpen={true}
            modal={false}
          />
        </div>
      )}

      {displayMessage && !showJoinForm && (
        <div style={{
          marginBottom: theme.spacing[4],
          padding: theme.spacing[3],
          backgroundColor: displayMessage.includes('Error') || displayMessage.includes('Failed') ?
            `${theme.colors.error}20` : `${theme.colors.success}20`,
          border: `1px solid ${displayMessage.includes('Error') || displayMessage.includes('Failed') ?
            theme.colors.error : theme.colors.success}`,
          borderRadius: theme.borderRadius.lg,
          color: displayMessage.includes('Error') || displayMessage.includes('Failed') ?
            theme.colors.error : theme.colors.success
        }}>
          {displayMessage}
        </div>
      )}

      <div style={{
        overflowX: 'auto',
        borderRadius: theme.borderRadius.lg,
        border: `1px solid ${theme.colors.border}`
      }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          backgroundColor: theme.colors.surface,
          fontSize: theme.typography.fontSize.sm
        }}>
          <thead>
            <tr style={{
              backgroundColor: theme.colors.surfaceHover,
              borderBottom: `2px solid ${theme.colors.border}`
            }}>
              <th style={{
                padding: theme.spacing[4],
                textAlign: 'left',
                color: theme.colors.text,
                fontWeight: theme.typography.fontWeight.semibold,
                fontSize: theme.typography.fontSize.sm
              }}>
                Guild Name
              </th>
              <th style={{
                padding: theme.spacing[4],
                textAlign: 'left',
                color: theme.colors.text,
                fontWeight: theme.typography.fontWeight.semibold,
                fontSize: theme.typography.fontSize.sm
              }}>
                Type
              </th>
              <th style={{
                padding: theme.spacing[4],
                textAlign: 'left',
                color: theme.colors.text,
                fontWeight: theme.typography.fontWeight.semibold,
                fontSize: theme.typography.fontSize.sm
              }}>
                Tier
              </th>
              <th style={{
                padding: theme.spacing[4],
                textAlign: 'left',
                color: theme.colors.text,
                fontWeight: theme.typography.fontWeight.semibold,
                fontSize: theme.typography.fontSize.sm
              }}>
                Members
              </th>
              <th style={{
                padding: theme.spacing[4],
                textAlign: 'left',
                color: theme.colors.text,
                fontWeight: theme.typography.fontWeight.semibold,
                fontSize: theme.typography.fontSize.sm
              }}>
                Personal
              </th>
              <th style={{
                padding: theme.spacing[4],
                textAlign: 'left',
                color: theme.colors.text,
                fontWeight: theme.typography.fontWeight.semibold,
                fontSize: theme.typography.fontSize.sm
              }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {guilds.map(guild => {
              const memberStatus = getMemberStatus(guild);
              const isCurrentGuild = guild.id === currentGuildId;

              return (
                <tr key={guild.id} style={{
                  borderBottom: `1px solid ${theme.colors.border}`,
                  backgroundColor: isCurrentGuild ? `${theme.colors.primary}10` : 'transparent',
                  transition: 'background-color 0.2s ease-in-out'
                }}>
                  <td style={{
                    padding: theme.spacing[4],
                    color: theme.colors.text,
                    fontWeight: isCurrentGuild ? theme.typography.fontWeight.semibold : theme.typography.fontWeight.normal
                  }}>
                    {guild.name}
                    {isCurrentGuild && (
                      <span style={{
                        marginLeft: theme.spacing[2],
                        color: theme.colors.primary,
                        fontSize: theme.typography.fontSize.xs,
                        fontWeight: theme.typography.fontWeight.bold
                      }}>
                        (Current)
                      </span>
                    )}
                  </td>
                  <td style={{
                    padding: theme.spacing[4],
                    color: theme.colors.textSecondary,
                    fontSize: theme.typography.fontSize.sm
                  }}>
                    {guild.type.replace('game_', '').toUpperCase()}
                  </td>
                  <td style={{
                    padding: theme.spacing[4],
                    color: theme.colors.textSecondary,
                    fontSize: theme.typography.fontSize.sm
                  }}>
                    {guild.billing_tier.toUpperCase()}
                  </td>
                  <td style={{
                    padding: theme.spacing[4],
                    color: memberStatus.color,
                    fontSize: theme.typography.fontSize.sm,
                    fontWeight: theme.typography.fontWeight.medium
                  }}>
                    {memberStatus.text}
                  </td>
                  <td style={{
                    padding: theme.spacing[4],
                    color: theme.colors.textSecondary,
                    fontSize: theme.typography.fontSize.sm
                  }}>
                    {guild.is_solo ? 'Yes' : 'No'}
                  </td>
                  <td style={{
                    padding: theme.spacing[4]
                  }}>
                    <div style={{
                      display: 'flex',
                      gap: theme.spacing[2],
                      flexWrap: 'wrap'
                    }}>
                      {!isCurrentGuild && (
                        <button
                          onClick={() => onGuildSwitch(guild.id)}
                          style={{
                            padding: `${theme.spacing[1]} ${theme.spacing[2]}`,
                            backgroundColor: theme.colors.primary,
                            color: theme.colors.background,
                            border: 'none',
                            borderRadius: theme.borderRadius.sm,
                            fontSize: theme.typography.fontSize.xs,
                            fontWeight: theme.typography.fontWeight.medium,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease-in-out'
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
                          Switch
                        </button>
                      )}

                      <button
                        onClick={() => handleInvite(guild.id)}
                        disabled={(guild.approved_count || 0) >= guild.member_limit}
                        style={{
                          padding: `${theme.spacing[1]} ${theme.spacing[2]}`,
                          backgroundColor: (guild.approved_count || 0) >= guild.member_limit ?
                            theme.colors.surfaceHover : theme.colors.success,
                          color: (guild.approved_count || 0) >= guild.member_limit ?
                            theme.colors.textMuted : theme.colors.text,
                          border: 'none',
                          borderRadius: theme.borderRadius.sm,
                          fontSize: theme.typography.fontSize.xs,
                          fontWeight: theme.typography.fontWeight.medium,
                          cursor: (guild.approved_count || 0) >= guild.member_limit ? 'not-allowed' : 'pointer',
                          transition: 'all 0.2s ease-in-out'
                        }}
                      >
                        Invite
                      </button>

                      {!guild.is_solo && (
                        <button
                          onClick={() => handleLeave(guild.id)}
                          style={{
                            padding: `${theme.spacing[1]} ${theme.spacing[2]}`,
                            backgroundColor: theme.colors.warning,
                            color: theme.colors.text,
                            border: 'none',
                            borderRadius: theme.borderRadius.sm,
                            fontSize: theme.typography.fontSize.xs,
                            fontWeight: theme.typography.fontWeight.medium,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease-in-out'
                          }}
                          onMouseEnter={(e) => {
                            (e.target as HTMLElement).style.backgroundColor = '#D69E2E';
                            (e.target as HTMLElement).style.transform = 'translateY(-1px)';
                          }}
                          onMouseLeave={(e) => {
                            (e.target as HTMLElement).style.backgroundColor = theme.colors.warning;
                            (e.target as HTMLElement).style.transform = 'translateY(0)';
                          }}
                        >
                          Leave
                        </button>
                      )}

                      {!guild.is_solo && guild.is_deletable && (
                        <button
                          onClick={() => handleDelete(guild.id)}
                          style={{
                            padding: `${theme.spacing[1]} ${theme.spacing[2]}`,
                            backgroundColor: theme.colors.error,
                            color: theme.colors.text,
                            border: 'none',
                            borderRadius: theme.borderRadius.sm,
                            fontSize: theme.typography.fontSize.xs,
                            fontWeight: theme.typography.fontWeight.medium,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease-in-out'
                          }}
                          onMouseEnter={(e) => {
                            (e.target as HTMLElement).style.backgroundColor = '#C53030';
                            (e.target as HTMLElement).style.transform = 'translateY(-1px)';
                          }}
                          onMouseLeave={(e) => {
                            (e.target as HTMLElement).style.backgroundColor = theme.colors.error;
                            (e.target as HTMLElement).style.transform = 'translateY(0)';
                          }}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {guilds.length === 0 && !loading && (
        <div style={{
          textAlign: 'center',
          padding: theme.spacing[8],
          color: theme.colors.textMuted,
          fontSize: theme.typography.fontSize.sm
        }}>
          No guilds found. Create a new guild or join an existing one.
        </div>
      )}

      {loading && (
        <div style={{
          textAlign: 'center',
          padding: theme.spacing[8]
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: `4px solid ${theme.colors.surfaceHover}`,
            borderTop: `4px solid ${theme.colors.primary}`,
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto'
          }}></div>
          <p style={{
            marginTop: theme.spacing[4],
            color: theme.colors.textSecondary,
            fontSize: theme.typography.fontSize.sm
          }}>
            Loading guilds...
          </p>
        </div>
      )}
    </div>
  );
};

export default GuildList;