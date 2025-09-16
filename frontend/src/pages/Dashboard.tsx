import React from 'react';
import { useNavigate } from 'react-router-dom';

function Dashboard() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login'); // Redirect instead of reload
  };

  return (
    <div>
      <h1>Welcome to SphereConnect Dashboard</h1>
      <p>This is your community hub! Token: {localStorage.getItem('token') || 'No token'}</p>
      <button onClick={handleLogout}>Logout</button>
    </div>
  );
}

export default Dashboard;