import React, { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    fetch('http://localhost:8000/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
      .then((res) => {
        if (!res.ok) throw new Error('Login failed');
        return res.json();
      })
      .then((data) => {
        localStorage.setItem('token', data.access_token);
        setMessage(`Logged in! Token: ${data.access_token}`);
        navigate('/dashboard');
      })
      .catch((err) => setMessage(`Error: ${err.message}`));
  };

  return (
    <div>
      <h2>Login</h2>
      <form onSubmit={handleSubmit} noValidate>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Username"
          required
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          required
        />
        <button type="submit">Login</button>
        {message && <p>{message}</p>}
      </form>
    </div>
  );
}

export default Login;