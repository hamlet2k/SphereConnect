import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { GuildProvider } from './contexts/GuildContext';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import DebugOverlay from './components/DebugOverlay';
import { DEBUG_OVERLAY_ENABLED } from './hooks/useDebugOverlay';

function App() {
  return (
    <GuildProvider>
      <Router>
        {DEBUG_OVERLAY_ENABLED && <DebugOverlay />}
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/admin" element={<AdminDashboard />} />
        </Routes>
      </Router>
    </GuildProvider>
  );
}

export default App;