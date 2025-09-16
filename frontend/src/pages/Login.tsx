import React, { useState, useEffect, FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useGuild } from '../contexts/GuildContext';

type LoginStep = 'credentials' | 'pin' | 'mfa' | 'success';

interface LoginData {
  name: string;
  password: string;
  guild_id: string;
}

interface PinData {
  user_id: string;
  pin: string;
}

interface MfaData {
  user_id: string;
  totp_code: string;
}

function Login() {
  const [step, setStep] = useState<LoginStep>('credentials');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [guildId, setGuildId] = useState('');
  const [pin, setPin] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [userId, setUserId] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { setCurrentGuild } = useGuild();

  useEffect(() => {
    if (location.state?.message) {
      setMessage(location.state.message);
    }
  }, [location.state]);

  // Auto-logoff timer
  useEffect(() => {
    const checkInactivity = () => {
      const lastActivity = localStorage.getItem('lastActivity');
      if (lastActivity) {
        const timeDiff = Date.now() - parseInt(lastActivity);
        // Auto-logoff after 30 minutes of inactivity
        if (timeDiff > 30 * 60 * 1000) {
          handleLogout();
        }
      }
    };

    const updateActivity = () => {
      localStorage.setItem('lastActivity', Date.now().toString());
    };

    // Check inactivity every minute
    const interval = setInterval(checkInactivity, 60000);

    // Update activity on user interactions
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, updateActivity);
    });

    updateActivity(); // Initial activity

    return () => {
      clearInterval(interval);
      events.forEach(event => {
        document.removeEventListener(event, updateActivity);
      });
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('lastActivity');
    localStorage.removeItem('user');
    setStep('credentials');
    setUsername('');
    setPassword('');
    setPin('');
    setTotpCode('');
    setMessage('Session expired due to inactivity');
  };

  const handleCredentialsSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    try {
      const loginData: LoginData = {
        name: username,
        password: password,
        guild_id: guildId || 'default-guild-id' // Use a default for now
      };

      const response = await fetch('http://localhost:8000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Login failed');
      }

      setUserId(data.user.id);

      if (data.requires_mfa) {
        setStep('mfa');
        setMessage('MFA required. Please enter your TOTP code.');
      } else {
        // Store token and user
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('lastActivity', Date.now().toString());

        // Fetch current guild details and set context
        const currentGuildId = data.user.current_guild_id;
        if (currentGuildId) {
          try {
            const guildResponse = await fetch(`http://localhost:8000/api/guilds/${currentGuildId}`, {
              headers: { 'Authorization': `Bearer ${data.access_token}` }
            });
            const guildData = await guildResponse.json();
            if (guildResponse.ok) {
              setCurrentGuild(currentGuildId, guildData.name);
            }
          } catch (err) {
            console.error('Failed to fetch guild details:', err);
          }
        }

        setStep('success');
        setTimeout(() => navigate('/admin'), 1000);
      }
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePinSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    try {
      const pinData: PinData = {
        user_id: userId,
        pin: pin
      };

      const response = await fetch('http://localhost:8000/api/auth/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pinData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'PIN verification failed');
      }

      setMessage('PIN verified successfully!');
      setStep('success');
      setTimeout(() => navigate('/admin'), 1000);
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMfaSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    try {
      const mfaData: MfaData = {
        user_id: userId,
        totp_code: totpCode
      };

      const response = await fetch('http://localhost:8000/api/auth/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mfaData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'MFA verification failed');
      }

      // Store token and proceed
      const loginData: LoginData = {
        name: username,
        password: password,
        guild_id: guildId || 'default-guild-id'
      };

      const loginResponse = await fetch('http://localhost:8000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData),
      });

      const loginResult = await loginResponse.json();

      if (loginResponse.ok) {
        localStorage.setItem('token', loginResult.access_token);
        localStorage.setItem('user', JSON.stringify(loginResult.user));
        localStorage.setItem('lastActivity', Date.now().toString());
        setMessage('Login successful!');
        setStep('success');
        setTimeout(() => navigate('/admin'), 1000);
      }
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const renderCredentialsForm = () => (
    <form onSubmit={handleCredentialsSubmit} style={{ maxWidth: '400px', margin: '0 auto' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '24px' }}>SphereConnect Login</h2>

      <div style={{ marginBottom: '16px' }}>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Username"
          required
          style={{
            width: '100%',
            padding: '12px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            fontSize: '16px'
          }}
        />
      </div>

      <div style={{ marginBottom: '16px' }}>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          required
          style={{
            width: '100%',
            padding: '12px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            fontSize: '16px'
          }}
        />
      </div>

      <div style={{ marginBottom: '16px' }}>
        <input
          type="text"
          value={guildId}
          onChange={(e) => setGuildId(e.target.value)}
          placeholder="Guild ID (optional)"
          style={{
            width: '100%',
            padding: '12px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            fontSize: '16px'
          }}
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        style={{
          width: '100%',
          padding: '12px',
          backgroundColor: isLoading ? '#ccc' : '#3182ce',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          fontSize: '16px',
          cursor: isLoading ? 'not-allowed' : 'pointer'
        }}
      >
        {isLoading ? 'Logging in...' : 'Login'}
      </button>

      {message && (
        <p style={{
          marginTop: '16px',
          color: message.includes('Error') ? '#e53e3e' : '#38a169',
          textAlign: 'center'
        }}>
          {message}
        </p>
      )}
    </form>
  );

  const renderPinForm = () => (
    <form onSubmit={handlePinSubmit} style={{ maxWidth: '400px', margin: '0 auto' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '24px' }}>Enter PIN</h2>
      <p style={{ textAlign: 'center', marginBottom: '24px', color: '#4a5568' }}>
        Please enter your 6-digit PIN for voice authentication
      </p>

      <div style={{ marginBottom: '16px' }}>
        <input
          type="password"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          placeholder="Enter PIN"
          maxLength={6}
          required
          style={{
            width: '100%',
            padding: '12px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            fontSize: '16px',
            textAlign: 'center',
            letterSpacing: '4px'
          }}
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        style={{
          width: '100%',
          padding: '12px',
          backgroundColor: isLoading ? '#ccc' : '#3182ce',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          fontSize: '16px',
          cursor: isLoading ? 'not-allowed' : 'pointer'
        }}
      >
        {isLoading ? 'Verifying...' : 'Verify PIN'}
      </button>

      <button
        type="button"
        onClick={() => setStep('credentials')}
        style={{
          width: '100%',
          padding: '12px',
          backgroundColor: 'transparent',
          color: '#3182ce',
          border: '1px solid #3182ce',
          borderRadius: '4px',
          fontSize: '16px',
          cursor: 'pointer',
          marginTop: '12px'
        }}
      >
        Back to Login
      </button>

      {message && (
        <p style={{
          marginTop: '16px',
          color: message.includes('Error') ? '#e53e3e' : '#38a169',
          textAlign: 'center'
        }}>
          {message}
        </p>
      )}
    </form>
  );

  const renderMfaForm = () => (
    <form onSubmit={handleMfaSubmit} style={{ maxWidth: '400px', margin: '0 auto' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '24px' }}>Multi-Factor Authentication</h2>
      <p style={{ textAlign: 'center', marginBottom: '24px', color: '#4a5568' }}>
        Enter the 6-digit code from your authenticator app
      </p>

      <div style={{ marginBottom: '16px' }}>
        <input
          type="text"
          value={totpCode}
          onChange={(e) => setTotpCode(e.target.value)}
          placeholder="000000"
          maxLength={6}
          required
          style={{
            width: '100%',
            padding: '12px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            fontSize: '16px',
            textAlign: 'center',
            letterSpacing: '4px'
          }}
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        style={{
          width: '100%',
          padding: '12px',
          backgroundColor: isLoading ? '#ccc' : '#3182ce',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          fontSize: '16px',
          cursor: isLoading ? 'not-allowed' : 'pointer'
        }}
      >
        {isLoading ? 'Verifying...' : 'Verify Code'}
      </button>

      <button
        type="button"
        onClick={() => setStep('credentials')}
        style={{
          width: '100%',
          padding: '12px',
          backgroundColor: 'transparent',
          color: '#3182ce',
          border: '1px solid #3182ce',
          borderRadius: '4px',
          fontSize: '16px',
          cursor: 'pointer',
          marginTop: '12px'
        }}
      >
        Back to Login
      </button>

      {message && (
        <p style={{
          marginTop: '16px',
          color: message.includes('Error') ? '#e53e3e' : '#38a169',
          textAlign: 'center'
        }}>
          {message}
        </p>
      )}
    </form>
  );

  const renderSuccess = () => (
    <div style={{ textAlign: 'center', maxWidth: '400px', margin: '0 auto' }}>
      <h2 style={{ color: '#38a169', marginBottom: '24px' }}>Login Successful!</h2>
      <p style={{ color: '#4a5568', marginBottom: '24px' }}>
        Redirecting to dashboard...
      </p>
      <div style={{
        width: '40px',
        height: '40px',
        border: '4px solid #f3f3f3',
        borderTop: '4px solid #3182ce',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
        margin: '0 auto'
      }}></div>
    </div>
  );

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f7fafc',
      padding: '20px'
    }}>
      {step === 'credentials' && renderCredentialsForm()}
      {step === 'pin' && renderPinForm()}
      {step === 'mfa' && renderMfaForm()}
      {step === 'success' && renderSuccess()}

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default Login;