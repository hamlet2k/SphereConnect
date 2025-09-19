import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGuild } from '../contexts/GuildContext';
import { theme } from '../theme';
import GuildList from '../components/GuildList';
import InviteForm from '../components/InviteForm';
import JoinForm from '../components/JoinForm';
import GuildRequestApproval from '../components/GuildRequestApproval';
import InviteManagement from '../components/InviteManagement';
import AccessLevelManager from '../components/AccessLevelManager';
import RanksManager from '../components/RanksManager';

type ActiveTab = 'users' | 'ranks' | 'objectives' | 'tasks' | 'squads' | 'access-levels' | 'categories' | 'guilds' | 'invites' | 'guild-requests';

interface User {
  id: string;
  name: string;
  rank?: string;
  squad_id?: string;
  availability: string;
}

interface Rank {
  id: string;
  name: string;
  access_levels: string[];
}

interface Objective {
  id: string;
  name: string;
  description: any;
  priority: string;
  progress: any;
  categories: string[];
}

interface Task {
  id: string;
  name: string;
  description?: string;
  status: string;
  priority: string;
  progress: any;
  schedule?: any;
}

interface Guild {
  id: string;
  name: string;
  creator_id?: string;
  member_limit: number;
  billing_tier: string;
  is_solo: boolean;
  is_deletable: boolean;
  type: string;
}

function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [ranks, setRanks] = useState<Rank[]>([]);
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  const { currentGuildId, guildName, setCurrentGuild } = useGuild();

  // Modal states
  const [inviteFormOpen, setInviteFormOpen] = useState(false);
  const [joinFormOpen, setJoinFormOpen] = useState(false);
  const [selectedGuildForInvite, setSelectedGuildForInvite] = useState<{id: string, name: string} | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [joinLoading, setJoinLoading] = useState(false);
  const [inviteMessage, setInviteMessage] = useState('');
  const [joinMessage, setJoinMessage] = useState('');

  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }

    // Load initial data based on active tab
    loadData();

    // Load guilds for switcher
    const loadGuilds = async () => {
      try {
        const headers = { 'Authorization': `Bearer ${token}` };
        const guildsResponse = await fetch(`http://localhost:8000/api/users/${user.id}/guilds`, { headers });
        if (guildsResponse.ok) {
          const guildsData = await guildsResponse.json();
          setGuilds(guildsData);
        }
      } catch (error) {
        console.error('Error loading guilds:', error);
      }
    };

    loadGuilds();
  }, [activeTab, token, navigate]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const headers = { 'Authorization': `Bearer ${token}` };

      switch (activeTab) {
        case 'users':
          // Load users for the guild
          const usersResponse = await fetch(`http://localhost:8000/api/admin/users?guild_id=${currentGuildId}`, { headers });
          if (usersResponse.ok) {
            const usersData = await usersResponse.json();
            setUsers(usersData);
          }
          break;
        case 'ranks':
          const ranksResponse = await fetch(`http://localhost:8000/api/admin/ranks?guild_id=${currentGuildId}`, { headers });
          if (ranksResponse.ok) {
            const ranksData = await ranksResponse.json();
            setRanks(ranksData);
          }
          break;
        case 'objectives':
          const objectivesResponse = await fetch(`http://localhost:8000/api/admin/objectives?guild_id=${currentGuildId}`, { headers });
          if (objectivesResponse.ok) {
            const objectivesData = await objectivesResponse.json();
            setObjectives(objectivesData);
          }
          break;
        case 'tasks':
          const tasksResponse = await fetch(`http://localhost:8000/api/admin/tasks?guild_id=${currentGuildId}`, { headers });
          if (tasksResponse.ok) {
            const tasksData = await tasksResponse.json();
            setTasks(tasksData);
          }
          break;
        case 'guilds':
          // Skip redundant API call if guilds are already loaded from the dropdown
          if (guilds.length > 0) {
            break;
          }
          const guildsResponse = await fetch(`http://localhost:8000/api/users/${user.id}/guilds`, { headers });
          if (guildsResponse.ok) {
            const guildsData = await guildsResponse.json();
            setGuilds(guildsData);
          }
          break;
      }
    } catch (error) {
      setMessage('Error loading data');
    } finally {
      setLoading(false);
    }
  }, [activeTab, token, currentGuildId]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('lastActivity');
    navigate('/login');
  };

  // Guild operation handlers
  const handleGuildSwitch = async (guildId: string) => {
    try {
      const response = await fetch(`http://localhost:8000/api/users/${user.id}/switch-guild`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ guild_id: guildId })
      });

      if (response.ok) {
        const result = await response.json();
        // Fetch new guild details
        const guildResponse = await fetch(`http://localhost:8000/api/guilds/${guildId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (guildResponse.ok) {
          const guildData = await guildResponse.json();
          setCurrentGuild(guildId, guildData.name);
        }
        // Reload data for new guild
        loadData();
        setMessage('Successfully switched guild');
      } else if (response.status === 402) {
        setMessage('Guild limit reached. Upgrade to add more guilds.');
      } else {
        setMessage('Failed to switch guild');
      }
    } catch (error) {
      setMessage('Error switching guild');
    }
  };

  const handleInvite = (guildId: string) => {
    const guild = guilds.find(g => g.id === guildId);
    if (guild) {
      setSelectedGuildForInvite({ id: guildId, name: guild.name });
      setInviteFormOpen(true);
    }
  };

  const handleInviteSubmit = async (guildId: string, inviteData: any) => {
    setInviteLoading(true);
    setInviteMessage('');

    try {
      const response = await fetch('http://localhost:8000/api/invites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(inviteData)
      });

      if (response.ok) {
        const result = await response.json();
        setInviteMessage('Invite created successfully!');
        // Reload guilds to update member counts
        loadData();
        return result;
      } else if (response.status === 402) {
        setInviteMessage('Member limit reached. Upgrade to add more members.');
        throw new Error('Member limit reached');
      } else {
        const error = await response.json();
        setInviteMessage(error.detail || 'Failed to create invite');
        throw new Error(error.detail || 'Failed to create invite');
      }
    } catch (error) {
      throw error;
    } finally {
      setInviteLoading(false);
    }
  };

  const handleJoin = () => {
    setJoinFormOpen(true);
  };

  const handleJoinSubmit = async (inviteCode: string) => {
    setJoinLoading(true);
    setJoinMessage('');

    try {
      const response = await fetch(`http://localhost:8000/api/users/${user.id}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ invite_code: inviteCode })
      });

      if (response.ok) {
        const result = await response.json();
        setJoinMessage('Successfully joined guild!');
        // Reload guilds and switch to new guild
        loadData();
        if (result.current_guild_id) {
          setCurrentGuild(result.current_guild_id, result.guild_name);
        }
        return result;
      } else if (response.status === 402) {
        setJoinMessage('Guild member limit reached. Cannot join at this time.');
        throw new Error('Member limit reached');
      } else if (response.status === 422) {
        setJoinMessage('Invalid or expired invite code.');
        throw new Error('Invalid invite code');
      } else {
        const error = await response.json();
        setJoinMessage(error.detail || 'Failed to join guild');
        throw new Error(error.detail || 'Failed to join guild');
      }
    } catch (error) {
      throw error;
    } finally {
      setJoinLoading(false);
    }
  };

  const handleLeave = async (guildId: string) => {
    try {
      const response = await fetch(`http://localhost:8000/api/users/${user.id}/leave`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ guild_id: guildId })
      });

      if (response.ok) {
        const result = await response.json();
        setMessage('Successfully left guild and switched to personal guild');
        // Reload guilds and switch to personal guild
        loadData();
        if (result.current_guild_id) {
          setCurrentGuild(result.current_guild_id, result.guild_name);
        }
      } else {
        setMessage('Failed to leave guild');
      }
    } catch (error) {
      setMessage('Error leaving guild');
    }
  };

  const handleKick = async (userId: string) => {
    // This would require admin permissions and user selection
    // For now, just show a placeholder
    setMessage('Kick functionality requires user selection - coming soon');
  };

  const handleDelete = async (guildId: string) => {
    try {
      const response = await fetch(`http://localhost:8000/api/admin/guilds/${guildId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setMessage('Guild deleted successfully');
        // Reload guilds
        loadData();
      } else if (response.status === 403) {
        setMessage('Cannot delete personal guilds or guilds you do not own');
      } else {
        setMessage('Failed to delete guild');
      }
    } catch (error) {
      setMessage('Error deleting guild');
    }
  };

  const renderUsersTab = () => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h3 style={{ margin: 0 }}>Users Management</h3>
        <button
          style={{
            padding: '8px 16px',
            backgroundColor: '#3182ce',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Add User
        </button>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f7fafc' }}>
              <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #e2e8f0' }}>Name</th>
              <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #e2e8f0' }}>Rank</th>
              <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #e2e8f0' }}>Availability</th>
              <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #e2e8f0' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                <td style={{ padding: '12px', border: '1px solid #e2e8f0' }}>{user.name}</td>
                <td style={{ padding: '12px', border: '1px solid #e2e8f0' }}>{user.rank || 'N/A'}</td>
                <td style={{ padding: '12px', border: '1px solid #e2e8f0' }}>{user.availability}</td>
                <td style={{ padding: '12px', border: '1px solid #e2e8f0' }}>
                  <button style={{ marginRight: '8px', padding: '4px 8px', backgroundColor: '#3182ce', color: 'white', border: 'none', borderRadius: '4px' }}>
                    Edit
                  </button>
                  <button style={{ padding: '4px 8px', backgroundColor: '#e53e3e', color: 'white', border: 'none', borderRadius: '4px' }}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderRanksTab = () => <RanksManager />;

  const renderObjectivesTab = () => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h3 style={{ margin: 0 }}>Objectives Management</h3>
        <button
          style={{
            padding: '8px 16px',
            backgroundColor: '#3182ce',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Create Objective
        </button>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f7fafc' }}>
              <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #e2e8f0' }}>Name</th>
              <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #e2e8f0' }}>Priority</th>
              <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #e2e8f0' }}>Progress</th>
              <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #e2e8f0' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {objectives.map(objective => (
              <tr key={objective.id}>
                <td style={{ padding: '12px', border: '1px solid #e2e8f0' }}>{objective.name}</td>
                <td style={{ padding: '12px', border: '1px solid #e2e8f0' }}>{objective.priority}</td>
                <td style={{ padding: '12px', border: '1px solid #e2e8f0' }}>
                  {JSON.stringify(objective.progress)}
                </td>
                <td style={{ padding: '12px', border: '1px solid #e2e8f0' }}>
                  <button style={{ marginRight: '8px', padding: '4px 8px', backgroundColor: '#3182ce', color: 'white', border: 'none', borderRadius: '4px' }}>
                    Edit
                  </button>
                  <button style={{ padding: '4px 8px', backgroundColor: '#e53e3e', color: 'white', border: 'none', borderRadius: '4px' }}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderTasksTab = () => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h3 style={{ margin: 0 }}>Tasks Management</h3>
        <button
          style={{
            padding: '8px 16px',
            backgroundColor: '#3182ce',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Create Task
        </button>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f7fafc' }}>
              <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #e2e8f0' }}>Name</th>
              <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #e2e8f0' }}>Status</th>
              <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #e2e8f0' }}>Priority</th>
              <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #e2e8f0' }}>Schedule</th>
              <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #e2e8f0' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map(task => (
              <tr key={task.id}>
                <td style={{ padding: '12px', border: '1px solid #e2e8f0' }}>{task.name}</td>
                <td style={{ padding: '12px', border: '1px solid #e2e8f0' }}>{task.status}</td>
                <td style={{ padding: '12px', border: '1px solid #e2e8f0' }}>{task.priority}</td>
                <td style={{ padding: '12px', border: '1px solid #e2e8f0' }}>
                  {task.schedule ? JSON.stringify(task.schedule) : 'N/A'}
                </td>
                <td style={{ padding: '12px', border: '1px solid #e2e8f0' }}>
                  <button style={{ marginRight: '8px', padding: '4px 8px', backgroundColor: '#3182ce', color: 'white', border: 'none', borderRadius: '4px' }}>
                    Edit
                  </button>
                  <button style={{ padding: '4px 8px', backgroundColor: '#e53e3e', color: 'white', border: 'none', borderRadius: '4px' }}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderGuildsTab = () => (
    <GuildList
      guilds={guilds}
      currentGuildId={currentGuildId || ''}
      onGuildSwitch={handleGuildSwitch}
      onInvite={handleInvite}
      onJoin={handleJoin}
      onLeave={handleLeave}
      onKick={handleKick}
      onDelete={handleDelete}
      loading={loading}
      message={message}
    />
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'users':
        return renderUsersTab();
      case 'ranks':
        return renderRanksTab();
      case 'objectives':
        return renderObjectivesTab();
      case 'tasks':
        return renderTasksTab();
      case 'guilds':
        return renderGuildsTab();
      case 'invites':
        return <InviteManagement />;
      case 'guild-requests':
        return <GuildRequestApproval />;
      case 'access-levels':
        return <AccessLevelManager />;
      default:
        return <div>Select a tab to manage entities</div>;
    }
  };

  if (!token) {
    return <div>Access denied. Please login first.</div>;
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: theme.colors.background,
      backgroundImage: `radial-gradient(circle at 20% 50%, ${theme.colors.primary}10 0%, transparent 50%), radial-gradient(circle at 80% 20%, ${theme.colors.secondary}10 0%, transparent 50%)`,
      fontFamily: theme.typography.fontFamily
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: theme.colors.surface,
        borderBottom: `1px solid ${theme.colors.border}`,
        padding: theme.spacing[4],
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: theme.shadows.md
      }}>
        <h1 style={{
          margin: 0,
          color: theme.colors.primary,
          fontSize: theme.typography.fontSize['2xl'],
          fontWeight: theme.typography.fontWeight.bold,
          textShadow: theme.shadows.neon
        }}>
          SphereConnect Admin
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[4] }}>
          <span style={{
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.medium
          }}>
            Logged in as {user.name} | {guildName}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[2] }}>
            <label
              htmlFor="guild-select"
              style={{
                fontSize: theme.typography.fontSize.sm,
                color: theme.colors.textSecondary,
                fontWeight: theme.typography.fontWeight.medium
              }}
            >
              Current Guild:
            </label>
            <select
              id="guild-select"
              value={currentGuildId || ''}
              onChange={async (e) => {
                const newGuildId = e.target.value;
                await handleGuildSwitch(newGuildId);
              }}
              style={{
                padding: `${theme.spacing[1]} ${theme.spacing[2]}`,
                backgroundColor: theme.colors.background,
                border: `2px solid ${theme.colors.border}`,
                borderRadius: theme.borderRadius.lg,
                color: theme.colors.text,
                fontSize: theme.typography.fontSize.sm,
                fontFamily: theme.typography.fontFamily,
                cursor: 'pointer',
                outline: 'none',
                transition: 'all 0.2s ease-in-out'
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
              {guilds.map(guild => (
                <option key={guild.id} value={guild.id}>
                  {guild.name} {guild.is_solo ? '(Personal)' : ''}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleLogout}
            style={{
              padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
              backgroundColor: theme.colors.error,
              color: theme.colors.text,
              border: 'none',
              borderRadius: theme.borderRadius.lg,
              fontSize: theme.typography.fontSize.sm,
              fontWeight: theme.typography.fontWeight.semibold,
              cursor: 'pointer',
              transition: 'all 0.2s ease-in-out',
              boxShadow: `0 0 10px ${theme.colors.error}40`
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
            Logout
          </button>
        </div>
      </div>

      <div style={{ display: 'flex' }}>
        {/* Sidebar */}
        <div style={{
          width: '280px',
          backgroundColor: theme.colors.surface,
          borderRight: `1px solid ${theme.colors.border}`,
          padding: `${theme.spacing[6]} 0`,
          minHeight: 'calc(100vh - 80px)',
          boxShadow: theme.shadows.md
        }}>
          <nav>
            <div style={{ padding: `0 ${theme.spacing[6]}`, marginBottom: theme.spacing[2] }}>
              <h3 style={{
                margin: `0 0 ${theme.spacing[4]} 0`,
                color: theme.colors.primary,
                fontSize: theme.typography.fontSize.lg,
                fontWeight: theme.typography.fontWeight.bold,
                textShadow: theme.shadows.neon
              }}>
                Management
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[1] }}>
                <button
                  onClick={() => setActiveTab('users')}
                  style={{
                    padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
                    backgroundColor: activeTab === 'users' ? theme.colors.primary : 'transparent',
                    color: activeTab === 'users' ? theme.colors.background : theme.colors.textSecondary,
                    border: 'none',
                    borderRadius: theme.borderRadius.lg,
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: theme.typography.fontSize.sm,
                    fontWeight: theme.typography.fontWeight.medium,
                    fontFamily: theme.typography.fontFamily,
                    transition: 'all 0.2s ease-in-out',
                    width: '100%',
                    boxShadow: activeTab === 'users' ? theme.shadows.neon : 'none'
                  }}
                  onMouseEnter={(e) => {
                    if (activeTab !== 'users') {
                      (e.target as HTMLElement).style.backgroundColor = theme.colors.surfaceHover;
                      (e.target as HTMLElement).style.color = theme.colors.text;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeTab !== 'users') {
                      (e.target as HTMLElement).style.backgroundColor = 'transparent';
                      (e.target as HTMLElement).style.color = theme.colors.textSecondary;
                    }
                  }}
                >
                  👥 Users
                </button>
                <button
                  onClick={() => setActiveTab('ranks')}
                  style={{
                    padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
                    backgroundColor: activeTab === 'ranks' ? theme.colors.primary : 'transparent',
                    color: activeTab === 'ranks' ? theme.colors.background : theme.colors.textSecondary,
                    border: 'none',
                    borderRadius: theme.borderRadius.lg,
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: theme.typography.fontSize.sm,
                    fontWeight: theme.typography.fontWeight.medium,
                    fontFamily: theme.typography.fontFamily,
                    transition: 'all 0.2s ease-in-out',
                    width: '100%',
                    boxShadow: activeTab === 'ranks' ? theme.shadows.neon : 'none'
                  }}
                  onMouseEnter={(e) => {
                    if (activeTab !== 'ranks') {
                      (e.target as HTMLElement).style.backgroundColor = theme.colors.surfaceHover;
                      (e.target as HTMLElement).style.color = theme.colors.text;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeTab !== 'ranks') {
                      (e.target as HTMLElement).style.backgroundColor = 'transparent';
                      (e.target as HTMLElement).style.color = theme.colors.textSecondary;
                    }
                  }}
                >
                  🎖️ Ranks
                </button>
                <button
                  onClick={() => setActiveTab('objectives')}
                  style={{
                    padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
                    backgroundColor: activeTab === 'objectives' ? theme.colors.primary : 'transparent',
                    color: activeTab === 'objectives' ? theme.colors.background : theme.colors.textSecondary,
                    border: 'none',
                    borderRadius: theme.borderRadius.lg,
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: theme.typography.fontSize.sm,
                    fontWeight: theme.typography.fontWeight.medium,
                    fontFamily: theme.typography.fontFamily,
                    transition: 'all 0.2s ease-in-out',
                    width: '100%',
                    boxShadow: activeTab === 'objectives' ? theme.shadows.neon : 'none'
                  }}
                  onMouseEnter={(e) => {
                    if (activeTab !== 'objectives') {
                      (e.target as HTMLElement).style.backgroundColor = theme.colors.surfaceHover;
                      (e.target as HTMLElement).style.color = theme.colors.text;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeTab !== 'objectives') {
                      (e.target as HTMLElement).style.backgroundColor = 'transparent';
                      (e.target as HTMLElement).style.color = theme.colors.textSecondary;
                    }
                  }}
                >
                  🎯 Objectives
                </button>
                <button
                  onClick={() => setActiveTab('tasks')}
                  style={{
                    padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
                    backgroundColor: activeTab === 'tasks' ? theme.colors.primary : 'transparent',
                    color: activeTab === 'tasks' ? theme.colors.background : theme.colors.textSecondary,
                    border: 'none',
                    borderRadius: theme.borderRadius.lg,
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: theme.typography.fontSize.sm,
                    fontWeight: theme.typography.fontWeight.medium,
                    fontFamily: theme.typography.fontFamily,
                    transition: 'all 0.2s ease-in-out',
                    width: '100%',
                    boxShadow: activeTab === 'tasks' ? theme.shadows.neon : 'none'
                  }}
                  onMouseEnter={(e) => {
                    if (activeTab !== 'tasks') {
                      (e.target as HTMLElement).style.backgroundColor = theme.colors.surfaceHover;
                      (e.target as HTMLElement).style.color = theme.colors.text;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeTab !== 'tasks') {
                      (e.target as HTMLElement).style.backgroundColor = 'transparent';
                      (e.target as HTMLElement).style.color = theme.colors.textSecondary;
                    }
                  }}
                >
                  📋 Tasks
                </button>
                <button
                  onClick={() => setActiveTab('squads')}
                  style={{
                    padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
                    backgroundColor: activeTab === 'squads' ? theme.colors.primary : 'transparent',
                    color: activeTab === 'squads' ? theme.colors.background : theme.colors.textSecondary,
                    border: 'none',
                    borderRadius: theme.borderRadius.lg,
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: theme.typography.fontSize.sm,
                    fontWeight: theme.typography.fontWeight.medium,
                    fontFamily: theme.typography.fontFamily,
                    transition: 'all 0.2s ease-in-out',
                    width: '100%',
                    boxShadow: activeTab === 'squads' ? theme.shadows.neon : 'none'
                  }}
                  onMouseEnter={(e) => {
                    if (activeTab !== 'squads') {
                      (e.target as HTMLElement).style.backgroundColor = theme.colors.surfaceHover;
                      (e.target as HTMLElement).style.color = theme.colors.text;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeTab !== 'squads') {
                      (e.target as HTMLElement).style.backgroundColor = 'transparent';
                      (e.target as HTMLElement).style.color = theme.colors.textSecondary;
                    }
                  }}
                >
                  👨‍👩‍👧‍👦 Squads
                </button>
                <button
                  onClick={() => setActiveTab('access-levels')}
                  style={{
                    padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
                    backgroundColor: activeTab === 'access-levels' ? theme.colors.primary : 'transparent',
                    color: activeTab === 'access-levels' ? theme.colors.background : theme.colors.textSecondary,
                    border: 'none',
                    borderRadius: theme.borderRadius.lg,
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: theme.typography.fontSize.sm,
                    fontWeight: theme.typography.fontWeight.medium,
                    fontFamily: theme.typography.fontFamily,
                    transition: 'all 0.2s ease-in-out',
                    width: '100%',
                    boxShadow: activeTab === 'access-levels' ? theme.shadows.neon : 'none'
                  }}
                  onMouseEnter={(e) => {
                    if (activeTab !== 'access-levels') {
                      (e.target as HTMLElement).style.backgroundColor = theme.colors.surfaceHover;
                      (e.target as HTMLElement).style.color = theme.colors.text;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeTab !== 'access-levels') {
                      (e.target as HTMLElement).style.backgroundColor = 'transparent';
                      (e.target as HTMLElement).style.color = theme.colors.textSecondary;
                    }
                  }}
                >
                  🔐 Access Levels
                </button>
                <button
                  onClick={() => setActiveTab('categories')}
                  style={{
                    padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
                    backgroundColor: activeTab === 'categories' ? theme.colors.primary : 'transparent',
                    color: activeTab === 'categories' ? theme.colors.background : theme.colors.textSecondary,
                    border: 'none',
                    borderRadius: theme.borderRadius.lg,
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: theme.typography.fontSize.sm,
                    fontWeight: theme.typography.fontWeight.medium,
                    fontFamily: theme.typography.fontFamily,
                    transition: 'all 0.2s ease-in-out',
                    width: '100%',
                    boxShadow: activeTab === 'categories' ? theme.shadows.neon : 'none'
                  }}
                  onMouseEnter={(e) => {
                    if (activeTab !== 'categories') {
                      (e.target as HTMLElement).style.backgroundColor = theme.colors.surfaceHover;
                      (e.target as HTMLElement).style.color = theme.colors.text;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeTab !== 'categories') {
                      (e.target as HTMLElement).style.backgroundColor = 'transparent';
                      (e.target as HTMLElement).style.color = theme.colors.textSecondary;
                    }
                  }}
                >
                  📂 Categories
                </button>
                <button
                  onClick={() => setActiveTab('guilds')}
                  style={{
                    padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
                    backgroundColor: activeTab === 'guilds' ? theme.colors.primary : 'transparent',
                    color: activeTab === 'guilds' ? theme.colors.background : theme.colors.textSecondary,
                    border: 'none',
                    borderRadius: theme.borderRadius.lg,
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: theme.typography.fontSize.sm,
                    fontWeight: theme.typography.fontWeight.medium,
                    fontFamily: theme.typography.fontFamily,
                    transition: 'all 0.2s ease-in-out',
                    width: '100%',
                    boxShadow: activeTab === 'guilds' ? theme.shadows.neon : 'none'
                  }}
                  onMouseEnter={(e) => {
                    if (activeTab !== 'guilds') {
                      (e.target as HTMLElement).style.backgroundColor = theme.colors.surfaceHover;
                      (e.target as HTMLElement).style.color = theme.colors.text;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeTab !== 'guilds') {
                      (e.target as HTMLElement).style.backgroundColor = 'transparent';
                      (e.target as HTMLElement).style.color = theme.colors.textSecondary;
                    }
                  }}
                >
                  🏰 Guilds
                </button>
                <button
                  onClick={() => setActiveTab('guild-requests')}
                  style={{
                    padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
                    backgroundColor: activeTab === 'guild-requests' ? theme.colors.primary : 'transparent',
                    color: activeTab === 'guild-requests' ? theme.colors.background : theme.colors.textSecondary,
                    border: 'none',
                    borderRadius: theme.borderRadius.lg,
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: theme.typography.fontSize.sm,
                    fontWeight: theme.typography.fontWeight.medium,
                    fontFamily: theme.typography.fontFamily,
                    transition: 'all 0.2s ease-in-out',
                    width: '100%',
                    boxShadow: activeTab === 'guild-requests' ? theme.shadows.neon : 'none'
                  }}
                  onMouseEnter={(e) => {
                    if (activeTab !== 'guild-requests') {
                      (e.target as HTMLElement).style.backgroundColor = theme.colors.surfaceHover;
                      (e.target as HTMLElement).style.color = theme.colors.text;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeTab !== 'guild-requests') {
                      (e.target as HTMLElement).style.backgroundColor = 'transparent';
                      (e.target as HTMLElement).style.color = theme.colors.textSecondary;
                    }
                  }}
                >
                  📋 Guild Requests
                </button>
                <button
                  onClick={() => setActiveTab('invites')}
                  style={{
                    padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
                    backgroundColor: activeTab === 'invites' ? theme.colors.primary : 'transparent',
                    color: activeTab === 'invites' ? theme.colors.background : theme.colors.textSecondary,
                    border: 'none',
                    borderRadius: theme.borderRadius.lg,
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: theme.typography.fontSize.sm,
                    fontWeight: theme.typography.fontWeight.medium,
                    fontFamily: theme.typography.fontFamily,
                    transition: 'all 0.2s ease-in-out',
                    width: '100%',
                    boxShadow: activeTab === 'invites' ? theme.shadows.neon : 'none'
                  }}
                  onMouseEnter={(e) => {
                    if (activeTab !== 'invites') {
                      (e.target as HTMLElement).style.backgroundColor = theme.colors.surfaceHover;
                      (e.target as HTMLElement).style.color = theme.colors.text;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeTab !== 'invites') {
                      (e.target as HTMLElement).style.backgroundColor = 'transparent';
                      (e.target as HTMLElement).style.color = theme.colors.textSecondary;
                    }
                  }}
                >
                  📨 Invites
                </button>
              </div>
            </div>
          </nav>
        </div>

        {/* Main Content */}
        <div style={{
          flex: 1,
          padding: theme.spacing[6],
          backgroundColor: theme.colors.background
        }}>
          {loading ? (
            <div style={{
              textAlign: 'center',
              padding: theme.spacing[10]
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                border: `4px solid ${theme.colors.surfaceHover}`,
                borderTop: `4px solid ${theme.colors.primary}`,
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: `0 auto ${theme.spacing[4]}`
              }}></div>
              <p style={{
                color: theme.colors.textSecondary,
                fontSize: theme.typography.fontSize.base,
                margin: 0
              }}>
                Loading...
              </p>
            </div>
          ) : (
            renderContent()
          )}

          {message && (
            <div style={{
              marginTop: theme.spacing[6],
              padding: theme.spacing[3],
              backgroundColor: message.includes('Error') || message.includes('Failed') ?
                `${theme.colors.error}20` : `${theme.colors.success}20`,
              border: `1px solid ${message.includes('Error') || message.includes('Failed') ?
                theme.colors.error : theme.colors.success}`,
              borderRadius: theme.borderRadius.lg,
              color: message.includes('Error') || message.includes('Failed') ?
                theme.colors.error : theme.colors.success,
              fontSize: theme.typography.fontSize.sm,
              fontWeight: theme.typography.fontWeight.medium
            }}>
              {message}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <InviteForm
        guildId={selectedGuildForInvite?.id || ''}
        guildName={selectedGuildForInvite?.name || ''}
        isOpen={inviteFormOpen}
        onClose={() => {
          setInviteFormOpen(false);
          setSelectedGuildForInvite(null);
          setInviteMessage('');
        }}
        onInvite={handleInviteSubmit}
        loading={inviteLoading}
        message={inviteMessage}
      />

      <JoinForm
        isOpen={joinFormOpen}
        onClose={() => {
          setJoinFormOpen(false);
          setJoinMessage('');
        }}
        onJoin={handleJoinSubmit}
        loading={joinLoading}
        message={joinMessage}
      />

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default AdminDashboard;