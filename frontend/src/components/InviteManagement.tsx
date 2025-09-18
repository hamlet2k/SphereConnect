import React, { useState, useEffect } from 'react';
import { useGuild } from '../contexts/GuildContext';
import { theme } from '../theme';

interface Invite {
  id: string;
  code: string;
  guild_id: string;
  expires_at: string;
  uses_left: number;
  guild_name?: string;
}

function InviteManagement() {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const { currentGuildId } = useGuild();
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (currentGuildId) {
      loadInvites();
    }
  }, [currentGuildId]);

  const loadInvites = async () => {
    setLoading(true);
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const response = await fetch(`http://localhost:8000/api/admin/invites?guild_id=${currentGuildId}`, { headers });

      if (response.ok) {
        const invitesData = await response.json();
        setInvites(invitesData);
      } else {
        setMessage('Failed to load invites');
      }
    } catch (error) {
      setMessage('Error loading invites');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvite = async () => {
    try {
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      };
      const response = await fetch('http://localhost:8000/api/invites', {
        method: 'POST',
        headers,
        body: JSON.stringify({ guild_id: currentGuildId })
      });

      if (response.ok) {
        const newInvite = await response.json();
        setInvites([...invites, newInvite]);
        setMessage('Invite created successfully');
      } else if (response.status === 402) {
        setMessage('Member limit reached. Upgrade to create more invites.');
      } else {
        setMessage('Failed to create invite');
      }
    } catch (error) {
      setMessage('Error creating invite');
    }
  };

  const handleDeleteInvite = async (inviteCode: string) => {
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const response = await fetch(`http://localhost:8000/api/admin/invites/${inviteCode}`, {
        method: 'DELETE',
        headers
      });

      if (response.ok) {
        setInvites(invites.filter(invite => invite.code !== inviteCode));
        setMessage('Invite deleted successfully');
      } else {
        setMessage('Failed to delete invite');
      }
    } catch (error) {
      setMessage('Error deleting invite');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h3 style={{ margin: 0 }}>Invite Management</h3>
        <button
          onClick={handleCreateInvite}
          style={{
            padding: '8px 16px',
            backgroundColor: theme.colors.primary,
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Create Invite
        </button>
      </div>

      {message && (
        <div style={{
          marginBottom: '16px',
          padding: '12px',
          backgroundColor: message.includes('Error') || message.includes('Failed') ?
            `${theme.colors.error}20` : `${theme.colors.success}20`,
          border: `1px solid ${message.includes('Error') || message.includes('Failed') ?
            theme.colors.error : theme.colors.success}`,
          borderRadius: '4px',
          color: message.includes('Error') || message.includes('Failed') ?
            theme.colors.error : theme.colors.success
        }}>
          {message}
        </div>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f7fafc' }}>
              <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #e2e8f0' }}>Code</th>
              <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #e2e8f0' }}>Guild</th>
              <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #e2e8f0' }}>Expires At</th>
              <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #e2e8f0' }}>Uses Left</th>
              <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #e2e8f0' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {invites.map(invite => (
              <tr key={invite.id}>
                <td style={{ padding: '12px', border: '1px solid #e2e8f0', fontFamily: 'monospace' }}>
                  {invite.code}
                </td>
                <td style={{ padding: '12px', border: '1px solid #e2e8f0' }}>
                  {invite.guild_name || invite.guild_id}
                </td>
                <td style={{ padding: '12px', border: '1px solid #e2e8f0' }}>
                  {formatDate(invite.expires_at)}
                </td>
                <td style={{ padding: '12px', border: '1px solid #e2e8f0' }}>
                  {invite.uses_left}
                </td>
                <td style={{ padding: '12px', border: '1px solid #e2e8f0' }}>
                  <button
                    onClick={() => handleDeleteInvite(invite.code)}
                    style={{
                      padding: '4px 8px',
                      backgroundColor: '#e53e3e',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {invites.length === 0 && !loading && (
        <div style={{ textAlign: 'center', padding: '40px', color: theme.colors.textSecondary }}>
          No invites found. Create your first invite to get started.
        </div>
      )}
    </div>
  );
}

export default InviteManagement;