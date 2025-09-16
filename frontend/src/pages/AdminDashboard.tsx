import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

type ActiveTab = 'users' | 'ranks' | 'objectives' | 'tasks' | 'squads' | 'access-levels' | 'categories';

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

function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [ranks, setRanks] = useState<Rank[]>([]);
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }

    // Load initial data based on active tab
    loadData();
  }, [activeTab, token, navigate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const headers = { 'Authorization': `Bearer ${token}` };

      switch (activeTab) {
        case 'users':
          // Load users for the guild
          const usersResponse = await fetch(`http://localhost:8000/api/admin/users?guild_id=${user.guild_id}`, { headers });
          if (usersResponse.ok) {
            const usersData = await usersResponse.json();
            setUsers(usersData);
          }
          break;
        case 'ranks':
          const ranksResponse = await fetch(`http://localhost:8000/api/admin/ranks?guild_id=${user.guild_id}`, { headers });
          if (ranksResponse.ok) {
            const ranksData = await ranksResponse.json();
            setRanks(ranksData);
          }
          break;
        case 'objectives':
          const objectivesResponse = await fetch(`http://localhost:8000/api/admin/objectives?guild_id=${user.guild_id}`, { headers });
          if (objectivesResponse.ok) {
            const objectivesData = await objectivesResponse.json();
            setObjectives(objectivesData);
          }
          break;
        case 'tasks':
          const tasksResponse = await fetch(`http://localhost:8000/api/admin/tasks?guild_id=${user.guild_id}`, { headers });
          if (tasksResponse.ok) {
            const tasksData = await tasksResponse.json();
            setTasks(tasksData);
          }
          break;
      }
    } catch (error) {
      setMessage('Error loading data');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('lastActivity');
    navigate('/login');
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

  const renderRanksTab = () => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h3 style={{ margin: 0 }}>Ranks Management</h3>
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
          Add Rank
        </button>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f7fafc' }}>
              <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #e2e8f0' }}>Name</th>
              <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #e2e8f0' }}>Access Levels</th>
              <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #e2e8f0' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {ranks.map(rank => (
              <tr key={rank.id}>
                <td style={{ padding: '12px', border: '1px solid #e2e8f0' }}>{rank.name}</td>
                <td style={{ padding: '12px', border: '1px solid #e2e8f0' }}>
                  {rank.access_levels.join(', ')}
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
      default:
        return <div>Select a tab to manage entities</div>;
    }
  };

  if (!token) {
    return <div>Access denied. Please login first.</div>;
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f7fafc' }}>
      {/* Header */}
      <div style={{
        backgroundColor: 'white',
        borderBottom: '1px solid #e2e8f0',
        padding: '16px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h1 style={{ margin: 0, color: '#2d3748' }}>SphereConnect Admin</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span>Welcome, {user.name}</span>
          <button
            onClick={handleLogout}
            style={{
              padding: '8px 16px',
              backgroundColor: '#e53e3e',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Logout
          </button>
        </div>
      </div>

      <div style={{ display: 'flex' }}>
        {/* Sidebar */}
        <div style={{
          width: '250px',
          backgroundColor: 'white',
          borderRight: '1px solid #e2e8f0',
          padding: '24px 0',
          minHeight: 'calc(100vh - 80px)'
        }}>
          <nav>
            <div style={{ padding: '8px 24px', marginBottom: '8px' }}>
              <h3 style={{ margin: '0 0 16px 0', color: '#4a5568' }}>Management</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <button
                  onClick={() => setActiveTab('users')}
                  style={{
                    padding: '12px 16px',
                    backgroundColor: activeTab === 'users' ? '#3182ce' : 'transparent',
                    color: activeTab === 'users' ? 'white' : '#4a5568',
                    border: 'none',
                    borderRadius: '4px',
                    textAlign: 'left',
                    cursor: 'pointer'
                  }}
                >
                  👥 Users
                </button>
                <button
                  onClick={() => setActiveTab('ranks')}
                  style={{
                    padding: '12px 16px',
                    backgroundColor: activeTab === 'ranks' ? '#3182ce' : 'transparent',
                    color: activeTab === 'ranks' ? 'white' : '#4a5568',
                    border: 'none',
                    borderRadius: '4px',
                    textAlign: 'left',
                    cursor: 'pointer'
                  }}
                >
                  🎖️ Ranks
                </button>
                <button
                  onClick={() => setActiveTab('objectives')}
                  style={{
                    padding: '12px 16px',
                    backgroundColor: activeTab === 'objectives' ? '#3182ce' : 'transparent',
                    color: activeTab === 'objectives' ? 'white' : '#4a5568',
                    border: 'none',
                    borderRadius: '4px',
                    textAlign: 'left',
                    cursor: 'pointer'
                  }}
                >
                  🎯 Objectives
                </button>
                <button
                  onClick={() => setActiveTab('tasks')}
                  style={{
                    padding: '12px 16px',
                    backgroundColor: activeTab === 'tasks' ? '#3182ce' : 'transparent',
                    color: activeTab === 'tasks' ? 'white' : '#4a5568',
                    border: 'none',
                    borderRadius: '4px',
                    textAlign: 'left',
                    cursor: 'pointer'
                  }}
                >
                  📋 Tasks
                </button>
                <button
                  onClick={() => setActiveTab('squads')}
                  style={{
                    padding: '12px 16px',
                    backgroundColor: activeTab === 'squads' ? '#3182ce' : 'transparent',
                    color: activeTab === 'squads' ? 'white' : '#4a5568',
                    border: 'none',
                    borderRadius: '4px',
                    textAlign: 'left',
                    cursor: 'pointer'
                  }}
                >
                  👨‍👩‍👧‍👦 Squads
                </button>
                <button
                  onClick={() => setActiveTab('access-levels')}
                  style={{
                    padding: '12px 16px',
                    backgroundColor: activeTab === 'access-levels' ? '#3182ce' : 'transparent',
                    color: activeTab === 'access-levels' ? 'white' : '#4a5568',
                    border: 'none',
                    borderRadius: '4px',
                    textAlign: 'left',
                    cursor: 'pointer'
                  }}
                >
                  🔐 Access Levels
                </button>
                <button
                  onClick={() => setActiveTab('categories')}
                  style={{
                    padding: '12px 16px',
                    backgroundColor: activeTab === 'categories' ? '#3182ce' : 'transparent',
                    color: activeTab === 'categories' ? 'white' : '#4a5568',
                    border: 'none',
                    borderRadius: '4px',
                    textAlign: 'left',
                    cursor: 'pointer'
                  }}
                >
                  📂 Categories
                </button>
              </div>
            </div>
          </nav>
        </div>

        {/* Main Content */}
        <div style={{ flex: 1, padding: '24px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                border: '4px solid #f3f3f3',
                borderTop: '4px solid #3182ce',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 16px'
              }}></div>
              <p>Loading...</p>
            </div>
          ) : (
            renderContent()
          )}

          {message && (
            <div style={{
              marginTop: '24px',
              padding: '12px',
              backgroundColor: message.includes('Error') ? '#fed7d7' : '#c6f6d5',
              color: message.includes('Error') ? '#c53030' : '#276749',
              borderRadius: '4px'
            }}>
              {message}
            </div>
          )}
        </div>
      </div>

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