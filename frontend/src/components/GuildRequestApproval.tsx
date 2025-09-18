import React, { useState, useEffect } from 'react';
import { useGuild } from '../contexts/GuildContext';

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
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ margin: 0 }}>Guild Request Approval</h3>
        <p style={{ margin: '8px 0', color: '#6b7280' }}>
          Review and approve/reject guild join requests from users
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #f3f4f6',
            borderTop: '4px solid #3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }}></div>
          <p>Loading requests...</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb' }}>
                <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #e5e7eb' }}>User</th>
                <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #e5e7eb' }}>Guild</th>
                <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #e5e7eb' }}>Status</th>
                <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #e5e7eb' }}>Requested</th>
                <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #e5e7eb' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
                    No guild requests found
                  </td>
                </tr>
              ) : (
                requests.map(request => (
                  <tr key={request.id}>
                    <td style={{ padding: '12px', border: '1px solid #e5e7eb' }}>
                      {request.user_name}
                    </td>
                    <td style={{ padding: '12px', border: '1px solid #e5e7eb' }}>
                      {request.guild_name}
                    </td>
                    <td style={{ padding: '12px', border: '1px solid #e5e7eb' }}>
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
                    <td style={{ padding: '12px', border: '1px solid #e5e7eb' }}>
                      {new Date(request.created_at).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '12px', border: '1px solid #e5e7eb' }}>
                      {request.status === 'pending' ? (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => handleApprove(request.id)}
                            style={{
                              padding: '6px 12px',
                              backgroundColor: '#10b981',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '12px'
                            }}
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(request.id)}
                            style={{
                              padding: '6px 12px',
                              backgroundColor: '#ef4444',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '12px'
                            }}
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
        <div style={{
          marginTop: '16px',
          padding: '12px',
          borderRadius: '4px',
          backgroundColor: message.includes('Error') || message.includes('Failed') ? '#fef2f2' : '#f0fdf4',
          border: `1px solid ${message.includes('Error') || message.includes('Failed') ? '#fca5a5' : '#bbf7d0'}`,
          color: message.includes('Error') || message.includes('Failed') ? '#dc2626' : '#166534'
        }}>
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