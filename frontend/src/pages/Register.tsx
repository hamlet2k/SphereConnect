import React, { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

function Register() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const validateForm = () => {
    if (username.length < 3) {
      setMessage('Username must be at least 3 characters');
      return false;
    }
    if (password.length < 8) {
      setMessage('Password must be at least 8 characters');
      return false;
    }
    if (!/^\d{6}$/.test(pin)) {
      setMessage('PIN must be exactly 6 digits');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    if (!validateForm()) {
      setIsLoading(false);
      return;
    }

    try {
      const requestBody: any = {
        name: username,
        username: username,
        email: email || undefined,
        password: password,
        pin: pin
      };

      if (inviteCode.trim()) {
        requestBody.invite_code = inviteCode.trim();
      }

      const response = await fetch('http://localhost:8000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Registration failed');
      }

      setMessage('Registration successful! Redirecting to login...');
      setTimeout(() => navigate('/login', { state: { message: 'Registered successfully! Please log in.' } }), 2000);
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
      padding: '20px',
      fontFamily: 'Arial, sans-serif'
    }}>
      <form onSubmit={handleSubmit} style={{
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        padding: '40px',
        borderRadius: '10px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        maxWidth: '400px',
        width: '100%'
      }}>
        <h2 style={{
          textAlign: 'center',
          marginBottom: '30px',
          color: '#ffffff',
          fontSize: '28px',
          textShadow: '0 0 10px rgba(255, 255, 255, 0.5)'
        }}>
          SphereConnect Registration
        </h2>

        <div style={{ marginBottom: '20px' }}>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
            required
            style={{
              width: '100%',
              padding: '15px',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '5px',
              fontSize: '16px',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              color: '#ffffff',
              outline: 'none'
            }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email (optional)"
            style={{
              width: '100%',
              padding: '15px',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '5px',
              fontSize: '16px',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              color: '#ffffff',
              outline: 'none'
            }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password (min 8 characters)"
            required
            style={{
              width: '100%',
              padding: '15px',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '5px',
              fontSize: '16px',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              color: '#ffffff',
              outline: 'none'
            }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <input
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="6-digit PIN"
            maxLength={6}
            required
            style={{
              width: '100%',
              padding: '15px',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '5px',
              fontSize: '16px',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              color: '#ffffff',
              outline: 'none',
              textAlign: 'center',
              letterSpacing: '4px'
            }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <input
            type="text"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            placeholder="Invite Code (optional)"
            style={{
              width: '100%',
              padding: '15px',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '5px',
              fontSize: '16px',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              color: '#ffffff',
              outline: 'none'
            }}
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          style={{
            width: '100%',
            padding: '15px',
            backgroundColor: isLoading ? '#666' : '#4a90e2',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            fontSize: '16px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.3s'
          }}
        >
          {isLoading ? 'Registering...' : 'Register'}
        </button>

        {message && (
          <p style={{
            marginTop: '20px',
            color: message.includes('Error') ? '#ff6b6b' : '#51cf66',
            textAlign: 'center',
            fontWeight: 'bold'
          }}>
            {message}
          </p>
        )}

        <p style={{
          marginTop: '20px',
          textAlign: 'center',
          color: '#cccccc',
          fontSize: '14px'
        }}>
          Already have an account? <a href="/login" style={{ color: '#4a90e2', textDecoration: 'none' }}>Login here</a>
        </p>
      </form>
    </div>
  );
}

export default Register;