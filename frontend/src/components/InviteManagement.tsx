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
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [expiresAt, setExpiresAt] = useState('');
  const [usesLeft, setUsesLeft] = useState(1);
  const [creating, setCreating] = useState(false);
  const { currentGuildId } = useGuild();
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (currentGuildId) {
      loadInvites();
    }
  }, [currentGuildId]);

  // Set default expiration date (+7 days) when modal opens
  useEffect(() => {
    if (showCreateModal) {
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + 7);
      setExpiresAt(defaultDate.toISOString().split('T')[0]); // YYYY-MM-DD format
      setUsesLeft(1);
    }
  }, [showCreateModal]);

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
    if (!expiresAt || usesLeft < 1) {
      setMessage('Please fill in all required fields');
      return;
    }

    setCreating(true);
    try {
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      };

      // Convert date to ISO format with time
      const expiresAtDateTime = new Date(expiresAt + 'T23:59:59Z').toISOString();

      const response = await fetch('http://localhost:8000/api/invites', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          guild_id: currentGuildId,
          expires_at: expiresAtDateTime,
          uses_left: usesLeft
        })
      });

      if (response.ok) {
        const newInvite = await response.json();
        setInvites([...invites, newInvite]);
        setMessage('Invite created successfully');
        setShowCreateModal(false);
      } else if (response.status === 402) {
        setMessage('Member limit reached. Upgrade to create more invites.');
      } else {
        const error = await response.json();
        setMessage(error.detail || 'Failed to create invite');
      }
    } catch (error) {
      setMessage('Error creating invite');
    } finally {
      setCreating(false);
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
          onClick={() => setShowCreateModal(true)}
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

      {/* Create Invite Modal */}
      {showCreateModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: theme.colors.surface,
            borderRadius: '8px',
            padding: '24px',
            width: '400px',
            maxWidth: '90vw',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)'
          }}>
            <h3 style={{ margin: '0 0 20px 0', color: theme.colors.primary }}>
              Create Invite
            </h3>

            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: 'bold',
                color: theme.colors.text
              }}>
                Expires At
              </label>
              <input
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: `2px solid ${theme.colors.border}`,
                  borderRadius: '4px',
                  backgroundColor: theme.colors.background,
                  color: theme.colors.text,
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: 'bold',
                color: theme.colors.text
              }}>
                Uses Left
              </label>
              <input
                type="number"
                min="1"
                value={usesLeft}
                onChange={(e) => setUsesLeft(parseInt(e.target.value) || 1)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: `2px solid ${theme.colors.border}`,
                  borderRadius: '4px',
                  backgroundColor: theme.colors.background,
                  color: theme.colors.text,
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: 'transparent',
                  color: theme.colors.textSecondary,
                  border: `1px solid ${theme.colors.border}`,
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateInvite}
                disabled={creating}
                style={{
                  padding: '8px 16px',
                  backgroundColor: theme.colors.primary,
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: creating ? 'not-allowed' : 'pointer',
                  opacity: creating ? 0.6 : 1
                }}
              >
                {creating ? 'Creating...' : 'Create Invite'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default InviteManagement;