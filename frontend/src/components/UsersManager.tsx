import React, { useEffect, useMemo, useState } from 'react';
import { useGuild } from '../contexts/GuildContext';
import { theme } from '../theme';
import { adminPageStyles } from './AdminPageStyles';
import AdminMessage from './AdminMessage';
import { useAdminMessage } from '../hooks/useAdminMessage';
import api from '../api';
import { parseApiError } from '../utils/errorUtils';

interface Rank {
  id: string;
  name: string;
  access_levels: string[];
}

interface AccessLevel {
  id: string;
  name: string;
  user_actions: string[];
}

interface Squad {
  id: string;
  name: string;
}

interface PreferenceOption {
  id: string;
  name: string;
  description?: string | null;
}

interface UserAccessLevelSummary {
  id: string;
  name: string;
}

interface UserPreferenceSummary {
  id: string;
  name: string;
  description?: string | null;
}

interface UserIdentitySummary {
  name: string;
  username: string;
  email?: string | null;
}

interface UserGuildState {
  rank_id?: string | null;
  squad_id?: string | null;
  access_levels: UserAccessLevelSummary[];
}

interface ManagedUser {
  id: string;
  identity: UserIdentitySummary;
  guild_state: UserGuildState;
  availability?: string;
  phonetic?: string;
  preferences: UserPreferenceSummary[];
  created_at?: string;
}

interface GuildStatePayload {
  rank_id?: string;
  squad_id?: string;
  access_level_ids?: string[];
}

const UsersManager: React.FC = () => {
  const { currentGuildId } = useGuild();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [ranks, setRanks] = useState<Rank[]>([]);
  const [accessLevels, setAccessLevels] = useState<AccessLevel[]>([]);
  const [squads, setSquads] = useState<Squad[]>([]);
  const [preferencesCatalog, setPreferencesCatalog] = useState<PreferenceOption[]>([]);
  const [selectedPreferences, setSelectedPreferences] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { message, showMessage, clearMessage } = useAdminMessage();
  const hasToken = useMemo(() => Boolean(localStorage.getItem('token')), []);

  useEffect(() => {
    if (!currentGuildId || !hasToken) {
      return;
    }

    loadRanks();
    loadAccessLevels();
    loadSquads();
    loadPreferencesCatalog();
  }, [currentGuildId, hasToken]);

  useEffect(() => {
    if (!currentGuildId || !hasToken) {
      return;
    }

    loadUsers();
  }, [currentGuildId, hasToken, selectedPreferences.join(',')]);

  const loadUsers = async () => {
    if (!currentGuildId) {
      return;
    }

    setLoading(true);
    try {
      let url = `/admin/users?guild_id=${currentGuildId}`;
      if (selectedPreferences.length > 0) {
        const preferenceParams = selectedPreferences.map((id) => `preference_ids=${encodeURIComponent(id)}`).join('&');
        url = `${url}&${preferenceParams}`;
      }

      const response = await api.get<ManagedUser[]>(url);
      setUsers(response.data);
    } catch (error) {
      console.error('Error loading users', error);
      const { status, detail } = parseApiError(error);
      if (status === 403) {
        showMessage('error', 'Insufficient permissions to manage users. You need manage_users permission.');
        setUsers([]);
        return;
      }
      showMessage('error', 'Error loading users');
    } finally {
      setLoading(false);
    }
  };

  const loadRanks = async () => {
    if (!currentGuildId) {
      return;
    }

    try {
      const response = await api.get<Rank[]>(`/admin/ranks?guild_id=${currentGuildId}`);
      setRanks(response.data);
    } catch (error) {
      console.error('Error loading ranks', error);
      setRanks([]);
    }
  };

  const loadAccessLevels = async () => {
    if (!currentGuildId) {
      return;
    }

    try {
      const response = await api.get<AccessLevel[]>(`/admin/access-levels?guild_id=${currentGuildId}`);
      setAccessLevels(response.data);
    } catch (error) {
      console.error('Error loading access levels', error);
      setAccessLevels([]);
    }
  };

  const loadSquads = async () => {
    if (!currentGuildId) {
      return;
    }

    try {
      const response = await api.get<Squad[]>(`/admin/squads?guild_id=${currentGuildId}`);
      setSquads(response.data);
    } catch (error) {
      console.error('Error loading squads', error);
      setSquads([]);
    }
  };

  const loadPreferencesCatalog = async () => {
    if (!hasToken) {
      return;
    }

    try {
      const response = await api.get<PreferenceOption[]>('/preferences');
      setPreferencesCatalog(response.data);
    } catch (error) {
      console.error('Error loading preferences catalog', error);
      setPreferencesCatalog([]);
    }
  };

  const updateGuildState = async (userId: string, payload: GuildStatePayload, successMessage: string) => {
    if (!hasToken) {
      return;
    }

    try {
      const response = await api.patch(`/admin/users/${userId}`, payload);
      const result = response.data;
      const updatedUser: ManagedUser | undefined = result.user;
      if (updatedUser) {
        setUsers((prev) => prev.map((user) => (user.id === updatedUser.id ? updatedUser : user)));
      }
      showMessage('success', successMessage);
    } catch (error) {
      console.error('Error updating user', error);
      const { detail } = parseApiError(error);
      if (detail) {
        showMessage('error', detail);
        return;
      }
      showMessage('error', 'Error updating user');
    }
  };

  const handleRankChange = (userId: string, rankId: string) => {
    updateGuildState(userId, { rank_id: rankId }, 'Rank updated successfully');
  };

  const handleSquadChange = (userId: string, squadId: string) => {
    updateGuildState(userId, { squad_id: squadId }, 'Squad updated successfully');
  };

  const handleAccessLevelToggle = (user: ManagedUser, accessLevelId: string, checked: boolean) => {
    const currentAccess = user.guild_state.access_levels.map((level) => level.id);
    const nextAccess = checked
      ? [...new Set([...currentAccess, accessLevelId])]
      : currentAccess.filter((id) => id !== accessLevelId);

    updateGuildState(user.id, { access_level_ids: nextAccess }, 'Access levels updated');
  };

  const togglePreferenceFilter = (preferenceId: string) => {
    setSelectedPreferences((prev) => {
      if (prev.includes(preferenceId)) {
        return prev.filter((id) => id !== preferenceId);
      }
      return [...prev, preferenceId];
    });
  };

  const selectedPreferenceNames = useMemo(() => {
    const lookup = new Map(preferencesCatalog.map((pref) => [pref.id, pref.name]));
    return selectedPreferences.map((id) => lookup.get(id) || id);
  }, [preferencesCatalog, selectedPreferences]);

  if (!hasToken) {
    return <div>Access denied. Please login first.</div>;
  }

  return (
    <div style={adminPageStyles.container}>
      <div style={adminPageStyles.header}>
        <h3 style={adminPageStyles.title}>Users Management</h3>
        <p style={{
          margin: 0,
          color: theme.colors.textSecondary,
          fontSize: theme.typography.fontSize.sm
        }}>
          Identities are self-managed. Assign ranks, squads, and access levels, and filter by global preferences.
        </p>
      </div>

      {preferencesCatalog.length > 0 && (
        <div style={{
          ...adminPageStyles.formContainer,
          marginBottom: theme.spacing[4]
        }}>
          <h4 style={adminPageStyles.formTitle}>Preference Filters</h4>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: theme.spacing[2]
          }}>
            {preferencesCatalog.map((preference) => {
              const isSelected = selectedPreferences.includes(preference.id);
              return (
                <button
                  key={preference.id}
                  onClick={() => togglePreferenceFilter(preference.id)}
                  style={{
                    padding: `${theme.spacing[1]} ${theme.spacing[3]}`,
                    borderRadius: theme.borderRadius.full,
                    border: `1px solid ${isSelected ? theme.colors.primary : theme.colors.border}`,
                    backgroundColor: isSelected ? theme.colors.primary : theme.colors.surface,
                    color: isSelected ? theme.colors.background : theme.colors.text,
                    cursor: 'pointer',
                    fontSize: theme.typography.fontSize.sm
                  }}
                >
                  {preference.name}
                </button>
              );
            })}
          </div>
          {selectedPreferences.length > 0 && (
            <p style={{
              marginTop: theme.spacing[3],
              color: theme.colors.textSecondary,
              fontSize: theme.typography.fontSize.xs
            }}>
              Active filters: {selectedPreferenceNames.join(', ')}
            </p>
          )}
        </div>
      )}

      {message && (
        <AdminMessage
          type={message.type}
          message={message.text}
          onClose={clearMessage}
        />
      )}

      {loading ? (
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
            Loading users...
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[4] }}>
          {users.map((user) => {
            const currentRankId = user.guild_state.rank_id || '';
            const currentSquadId = user.guild_state.squad_id || '';
            const assignedAccess = user.guild_state.access_levels.map((level) => level.id);

            return (
              <div
                key={user.id}
                style={{
                  padding: theme.spacing[4],
                  borderRadius: theme.borderRadius.lg,
                  border: `1px solid ${theme.colors.border}`,
                  backgroundColor: theme.colors.surface,
                  boxShadow: theme.shadows.sm
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: theme.spacing[4], flexWrap: 'wrap' }}>
                  <div>
                    <h4 style={{
                      margin: 0,
                      color: theme.colors.text,
                      fontSize: theme.typography.fontSize.lg
                    }}>
                      {user.identity.name}
                    </h4>
                    <p style={{
                      margin: 0,
                      color: theme.colors.textSecondary,
                      fontSize: theme.typography.fontSize.sm
                    }}>
                      Username: {user.identity.username}
                    </p>
                    <p style={{
                      margin: 0,
                      color: theme.colors.textSecondary,
                      fontSize: theme.typography.fontSize.sm
                    }}>
                      Email: {user.identity.email || 'Not provided'}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    {user.preferences.length > 0 ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: theme.spacing[1], justifyContent: 'flex-end' }}>
                        {user.preferences.map((preference) => (
                          <span
                            key={preference.id}
                            style={{
                              padding: `${theme.spacing[1]} ${theme.spacing[2]}`,
                              borderRadius: theme.borderRadius.full,
                              backgroundColor: theme.colors.surfaceHover,
                              color: theme.colors.textSecondary,
                              fontSize: theme.typography.fontSize.xs
                            }}
                          >
                            {preference.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p style={{
                        margin: 0,
                        color: theme.colors.textMuted,
                        fontSize: theme.typography.fontSize.xs
                      }}>
                        No preferences selected
                      </p>
                    )}
                  </div>
                </div>

                <div style={{
                  marginTop: theme.spacing[4],
                  display: 'grid',
                  gap: theme.spacing[4],
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))'
                }}>
                  <div>
                    <label style={adminPageStyles.formLabel}>Rank</label>
                    <select
                      value={currentRankId}
                      onChange={(event) => handleRankChange(user.id, event.target.value)}
                      style={adminPageStyles.formInput}
                    >
                      <option value="">Unassigned</option>
                      {ranks.map((rank) => (
                        <option key={rank.id} value={rank.id}>{rank.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={adminPageStyles.formLabel}>Squad</label>
                    <select
                      value={currentSquadId}
                      onChange={(event) => handleSquadChange(user.id, event.target.value)}
                      style={adminPageStyles.formInput}
                    >
                      <option value="">No squad</option>
                      {squads.map((squad) => (
                        <option key={squad.id} value={squad.id}>{squad.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={adminPageStyles.formLabel}>Access Levels</label>
                    <div style={{
                      border: `1px solid ${theme.colors.border}`,
                      borderRadius: theme.borderRadius.md,
                      padding: theme.spacing[2],
                      maxHeight: '160px',
                      overflowY: 'auto'
                    }}>
                      {accessLevels.length === 0 && (
                        <p style={{
                          margin: 0,
                          color: theme.colors.textMuted,
                          fontSize: theme.typography.fontSize.xs
                        }}>
                          No access levels configured.
                        </p>
                      )}
                      {accessLevels.map((accessLevel) => {
                        const isChecked = assignedAccess.includes(accessLevel.id);
                        return (
                          <label
                            key={accessLevel.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: theme.spacing[2],
                              fontSize: theme.typography.fontSize.sm,
                              color: theme.colors.text,
                              padding: `${theme.spacing[1]} 0`
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(event) => handleAccessLevelToggle(user, accessLevel.id, event.target.checked)}
                            />
                            <span>{accessLevel.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {users.length === 0 && !loading && (
            <div style={{
              textAlign: 'center',
              padding: theme.spacing[8],
              color: theme.colors.textMuted,
              fontSize: theme.typography.fontSize.sm
            }}>
              No members found for this guild.
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default UsersManager;
