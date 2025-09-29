import React, { useState, useEffect } from 'react';
import { useGuild } from '../contexts/GuildContext';
import { adminPageStyles, getMessageStyle } from './AdminPageStyles';

interface GuildRequest {
  id: string;
  user_id: string;
  user_name: string;
  guild_id: string;
  guild_name: string;
  status: 'pending' | 'approved' | 'denied';
  created_at: string;
}

function GuildRequestApproval() {
  const [requests, setRequests] = useState<GuildRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const { currentGuildId } = useGuild();
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (currentGuildId) {
      loadRequests();
    }
  }, [currentGuildId]);

  const loadRequests = async () => {
    if (!token || !currentGuildId) return;

    setLoading(true);
    try {
      const response = await fetch(`http://localhost:8000/api/admin/guild_requests?guild_id=${currentGuildId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setRequests(data);
      } else {
        setMessage('Failed to load guild requests');
      }
    } catch (error) {
      setMessage('Error loading guild requests');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId: string) => {
    if (!token) return;

    try {
      const response = await fetch(`http://localhost:8000/api/admin/guild_requests/${requestId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'approved' })
      });

      if (response.ok) {
        setMessage('Request approved successfully');
        loadRequests(); // Refresh the list
      } else {
        const error = await response.json();
        setMessage(error.detail || 'Failed to approve request');
      }
    } catch (error) {
      setMessage('Error approving request');
    }
  };

  const handleReject = async (requestId: string) => {
    if (!token) return;

    try {
      const response = await fetch(`http://localhost:8000/api/admin/guild_requests/${requestId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'denied' })
      });

      if (response.ok) {
        setMessage('Request rejected successfully');
        loadRequests(); // Refresh the list
      } else {
        const error = await response.json();
        setMessage(error.detail || 'Failed to reject request');
      }
    } catch (error) {
      setMessage('Error rejecting request');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#fbbf24'; // yellow
      case 'approved': return '#10b981'; // green
      case 'denied': return '#ef4444'; // red
      default: return '#6b7280'; // gray
    }
  };

  return (
    <div style={adminPageStyles.container as any}>
      <div style={adminPageStyles.header as any}>
        <h3 style={adminPageStyles.title as any}>Guild Request Approval</h3>
        <p style={{
          margin: '8px 0',
          color: '#6b7280',
          fontSize: '14px'
        }}>
          Review and approve/reject guild join requests from users
        </p>
      </div>

      {loading ? (
        <div style={adminPageStyles.loadingContainer as any}>
          <div style={adminPageStyles.loadingSpinner as any}></div>
          <p style={adminPageStyles.loadingText as any}>Loading requests...</p>
        </div>
      ) : (
        <div style={adminPageStyles.tableContainer as any}>
          <table style={adminPageStyles.table as any}>
            <thead>
              <tr style={adminPageStyles.tableHeaderRow as any}>
                <th style={adminPageStyles.tableHeaderCell as any}>User</th>
                <th style={adminPageStyles.tableHeaderCell as any}>Guild</th>
                <th style={adminPageStyles.tableHeaderCell as any}>Status</th>
                <th style={adminPageStyles.tableHeaderCell as any}>Requested</th>
                <th style={adminPageStyles.tableHeaderCell as any}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={5} style={adminPageStyles.emptyState as any}>
                    No guild requests found
                  </td>
                </tr>
              ) : (
                requests.map(request => (
                  <tr key={request.id} style={adminPageStyles.tableBodyRow as any}>
                    <td style={adminPageStyles.tableBodyCell as any}>
                      {request.user_name}
                    </td>
                    <td style={adminPageStyles.tableBodyCell as any}>
                      {request.guild_name}
                    </td>
                    <td style={adminPageStyles.tableBodyCell as any}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        color: 'white',
                        backgroundColor: getStatusColor(request.status),
                        textTransform: 'uppercase'
                      }}>
                        {request.status}
                      </span>
                    </td>
                    <td style={adminPageStyles.tableBodyCell as any}>
                      {new Date(request.created_at).toLocaleDateString()}
                    </td>
                    <td style={adminPageStyles.tableBodyCell as any}>
                      {request.status === 'pending' ? (
                        <div style={adminPageStyles.actionButtons as any}>
                          <button
                            onClick={() => handleApprove(request.id)}
                            style={adminPageStyles.actionButtonPrimary as any}
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(request.id)}
                            style={adminPageStyles.actionButtonDanger as any}
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span style={{ color: '#6b7280', fontSize: '12px' }}>
                          {request.status === 'approved' ? 'Approved' : 'Rejected'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {message && (
        <div style={getMessageStyle(message) as any}>
          {message}
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
}

export default GuildRequestApproval;