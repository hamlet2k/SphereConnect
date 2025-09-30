import React, { useState, useEffect } from 'react';
import { useGuild } from '../contexts/GuildContext';
import { theme } from '../theme';
import { adminPageStyles } from './AdminPageStyles';
import AdminMessage from './AdminMessage';
import { useAdminMessage } from '../hooks/useAdminMessage';
import InviteForm from './InviteForm';

interface Invite {
  id: string;
  code: string;
  guild_id: string;
  guild_name: string;
  expires_at: string;
  uses_left: number;
}

function InviteManagement() {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(false);
  const { message, showMessage, clearMessage } = useAdminMessage();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const { currentGuildId } = useGuild();
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (currentGuildId) {
      loadInvites();
    }
  }, [currentGuildId]);

  const loadInvites = async () => {
    setLoading(true);
    clearMessage();
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const response = await fetch(`http://localhost:8000/api/admin/invites?guild_id=${currentGuildId}`, { headers });

      if (response.ok) {
        const invitesData = await response.json();
        setInvites(invitesData);
      } else {
        showMessage('error', 'Failed to load invites');
      }
    } catch (error) {
      showMessage('error', 'Error loading invites');
    } finally {
      setLoading(false);
    }
  };

  const handleInviteSuccess = async (result: any) => {
    setInvites([...invites, result]);
    showMessage('success', 'Invite created successfully');
    setShowCreateForm(false);
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
        showMessage('success', 'Invite deleted successfully');
      } else {
        showMessage('error', 'Failed to delete invite');
      }
    } catch (error) {
      showMessage('error', 'Error deleting invite');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showMessage('success', 'Invite code copied to clipboard!');

    } catch (error) {
      showMessage('error', 'Failed to copy to clipboard');
    }
  };

  return (
    <div style={adminPageStyles.container}>
      <div style={adminPageStyles.header}>
        <h3 style={adminPageStyles.title}>Invite Management</h3>
        <button
          onClick={() => setShowCreateForm(true)}
          style={adminPageStyles.primaryButton}
        >
          Create Invite
        </button>
      </div>

      {message && (
        <AdminMessage
          type={message.type}
          message={message.text}
          onClose={clearMessage}
        />
      )}

      {showCreateForm && (
        <div style={adminPageStyles.formContainer}>
          <h4 style={adminPageStyles.formTitle}>Create New Invite</h4>
          <InviteForm
            guildId={currentGuildId || ''}
            guildName="Current Guild"
            isOpen={showCreateForm}
            onInvite={async (guildId: string, inviteData: any) => {
              const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              };

              const response = await fetch('http://localhost:8000/api/invites', {
                method: 'POST',
                headers,
                body: JSON.stringify(inviteData)
              });

              if (response.ok) {
                const result = await response.json();
                handleInviteSuccess(result);
                return result;
              } else if (response.status === 402) {
                throw new Error('Member limit reached. Upgrade to create more invites.');
              } else {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to create invite');
              }
            }}
            onClose={() => setShowCreateForm(false)}
            modal={false}
          />
        </div>
      )}

      <div style={adminPageStyles.tableContainer as any}>
        <table style={adminPageStyles.table as any}>
          <thead>
            <tr style={adminPageStyles.tableHeaderRow as any}>
              <th style={adminPageStyles.tableHeaderCell as any}>Code</th>
              <th style={adminPageStyles.tableHeaderCell as any}>Guild</th>
              <th style={adminPageStyles.tableHeaderCell as any}>Expires At</th>
              <th style={adminPageStyles.tableHeaderCell as any}>Uses Left</th>
              <th style={adminPageStyles.tableHeaderCell as any}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {invites.map(invite => (
              <tr key={invite.id} style={adminPageStyles.tableBodyRow as any}>
                <td style={{...(adminPageStyles.tableBodyCell as any), fontFamily: 'monospace'}}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[2] }}>
                    <span>{invite.code}</span>
                    <button
                      onClick={() => copyToClipboard(invite.code)}
                      style={{
                        padding: '2px 6px',
                        backgroundColor: theme.colors.primary,
                        color: theme.colors.background,
                        border: 'none',
                        borderRadius: theme.borderRadius.sm,
                        fontSize: '12px',
                        cursor: 'pointer',
                        fontWeight: 'bold'
                      }}
                      title="Copy to clipboard"
                    >
                      📋
                    </button>
                  </div>
                </td>
                <td style={adminPageStyles.tableBodyCell as any}>
                  {invite.guild_name}
                </td>
                <td style={adminPageStyles.tableBodyCell as any}>
                  {formatDate(invite.expires_at)}
                </td>
                <td style={adminPageStyles.tableBodyCell as any}>
                  {invite.uses_left}
                </td>
                <td style={adminPageStyles.tableBodyCell as any}>
                  <div style={adminPageStyles.actionButtons as any}>
                    <button
                      onClick={() => handleDeleteInvite(invite.code)}
                      style={adminPageStyles.actionButtonDanger as any}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {invites.length === 0 && !loading && (
        <div style={adminPageStyles.emptyState as any}>
          No invites found. Create your first invite to get started.
        </div>
      )}
    </div>
  );
}

export default InviteManagement;