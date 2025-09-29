import React, { useState, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authPageStyles, authPageCSS } from '../components/AuthPageStyles';

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
    <div style={authPageStyles.pageContainer}>
      <form onSubmit={handleSubmit} style={authPageStyles.formContainer}>
        <h2 style={authPageStyles.formTitle}>
          SphereConnect Registration
        </h2>

        <div style={authPageStyles.inputContainer}>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
            required
            style={authPageStyles.inputBase}
            onFocus={(e) => {
              Object.assign(e.target.style, authPageStyles.getInputFocusStyles());
            }}
            onBlur={(e) => {
              Object.assign(e.target.style, authPageStyles.getInputBlurStyles());
            }}
          />
        </div>

        <div style={authPageStyles.inputContainer}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email (optional)"
            style={authPageStyles.inputBase}
            onFocus={(e) => {
              Object.assign(e.target.style, authPageStyles.getInputFocusStyles());
            }}
            onBlur={(e) => {
              Object.assign(e.target.style, authPageStyles.getInputBlurStyles());
            }}
          />
        </div>

        <div style={authPageStyles.inputContainer}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password (min 8 characters)"
            required
            style={authPageStyles.inputBase}
            onFocus={(e) => {
              Object.assign(e.target.style, authPageStyles.getInputFocusStyles());
            }}
            onBlur={(e) => {
              Object.assign(e.target.style, authPageStyles.getInputBlurStyles());
            }}
          />
        </div>

        <div style={authPageStyles.inputContainer}>
          <input
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="6-digit PIN"
            maxLength={6}
            required
            style={{
              ...authPageStyles.inputBase,
              ...authPageStyles.pinInput
            }}
            onFocus={(e) => {
              Object.assign(e.target.style, authPageStyles.getInputFocusStyles());
            }}
            onBlur={(e) => {
              Object.assign(e.target.style, authPageStyles.getInputBlurStyles());
            }}
          />
        </div>

        <div style={{ marginBottom: authPageStyles.inputContainer.marginBottom }}>
          <input
            type="text"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            placeholder="Invite Code (optional)"
            style={authPageStyles.inputBase}
            onFocus={(e) => {
              Object.assign(e.target.style, authPageStyles.getInputFocusStyles());
            }}
            onBlur={(e) => {
              Object.assign(e.target.style, authPageStyles.getInputBlurStyles());
            }}
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          style={{
            ...authPageStyles.buttonBase,
            ...authPageStyles.getButtonPrimaryStyles(isLoading)
          }}
          onMouseEnter={(e) => {
            if (!isLoading) {
              Object.assign((e.target as HTMLElement).style, authPageStyles.getButtonHoverStyles());
            }
          }}
          onMouseLeave={(e) => {
            if (!isLoading) {
              Object.assign((e.target as HTMLElement).style, authPageStyles.getButtonLeaveStyles());
            }
          }}
        >
          {isLoading ? 'Registering...' : 'Register'}
        </button>

        {/* Login CTA */}
        <div style={authPageStyles.linkContainer}>
          <span style={authPageStyles.linkText}>
            Already have an account?{' '}
          </span>
          <Link
            to="/login"
            style={authPageStyles.linkBase}
            onMouseEnter={(e) => {
              Object.assign((e.target as HTMLElement).style, authPageStyles.getLinkHoverStyles());
            }}
            onMouseLeave={(e) => {
              Object.assign((e.target as HTMLElement).style, authPageStyles.getLinkLeaveStyles());
            }}
          >
            Login here
          </Link>
        </div>

        {message && (
          <p style={authPageStyles.getMessageStyles(message.includes('Error'))}>
            {message}
          </p>
        )}
      </form>

      <style>{authPageCSS}</style>
    </div>
  );
}

export default Register;