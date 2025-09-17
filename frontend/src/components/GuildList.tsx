//import React, { useState, useEffect } from 'react';
import React, { useState } from 'react';
import { theme } from '../theme';

interface Guild {
  id: string;
  name: string;
  creator_id?: string;
  member_limit: number;
  billing_tier: string;
  is_solo: boolean;
  is_deletable: boolean;
  type: string;
  member_count?: number; // We'll calculate this from API
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
  loading = false,
  message = ''
}) => {
  const [selectedGuild, setSelectedGuild] = useState<string | null>(null);

  const handleInvite = (guildId: string) => {
    setSelectedGuild(guildId);
    onInvite(guildId);
  };

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

  const getMemberStatus = (guild: Guild) => {
    const memberCount = guild.member_count || 0;
    const limit = guild.member_limit;
    const percentage = (memberCount / limit) * 100;

    if (percentage >= 100) {
      return { text: `${memberCount}/${limit} (Full)`, color: theme.colors.error };
    } else if (percentage >= 80) {
      return { text: `${memberCount}/${limit} (Near Limit)`, color: theme.colors.warning };
    } else {
      return { text: `${memberCount}/${limit}`, color: theme.colors.success };
    }
  };

  return (
    <div style={{
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.xl,
      padding: theme.spacing[6],
      border: `1px solid ${theme.colors.border}`,
      boxShadow: theme.shadows.lg
    }}>
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
            onClick={onJoin}
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
            theme.colors.error : theme.colors.success
        }}>
          {message}
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
                        disabled={(guild.member_count || 0) >= guild.member_limit}
                        style={{
                          padding: `${theme.spacing[1]} ${theme.spacing[2]}`,
                          backgroundColor: (guild.member_count || 0) >= guild.member_limit ?
                            theme.colors.surfaceHover : theme.colors.success,
                          color: (guild.member_count || 0) >= guild.member_limit ?
                            theme.colors.textMuted : theme.colors.text,
                          border: 'none',
                          borderRadius: theme.borderRadius.sm,
                          fontSize: theme.typography.fontSize.xs,
                          fontWeight: theme.typography.fontWeight.medium,
                          cursor: (guild.member_count || 0) >= guild.member_limit ? 'not-allowed' : 'pointer',
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