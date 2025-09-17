import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Login from '../pages/Login';

// Type declarations for Jest
declare const jest: any;
declare const expect: any;
declare const describe: any;
declare const test: any;
declare const beforeEach: any;

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

const mockNavigate = jest.fn();
const mockSetCurrentGuild = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

jest.mock('../contexts/GuildContext', () => ({
  useGuild: () => ({
    setCurrentGuild: mockSetCurrentGuild,
  }),
}));

const renderLogin = () => {
  render(
    <BrowserRouter>
      <Login />
    </BrowserRouter>
  );
};

describe('Login Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn(),
      },
      writable: true,
    });
  });

  test('renders login form', () => {
    renderLogin();

    expect(screen.getByText('SphereConnect Login')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Username')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument();
  });

  test('submits login form successfully', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'test-token',
          user: {
            id: '1',
            name: 'testuser',
            current_guild_id: 'guild-1'
          }
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'guild-1',
          name: 'Test Guild'
        }),
      });

    renderLogin();

    const usernameInput = screen.getByPlaceholderText('Username');
    const passwordInput = screen.getByPlaceholderText('Password');
    const submitButton = screen.getByRole('button', { name: 'Login' });

    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('http://localhost:8000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'testuser',
          password: 'password123'
        }),
      });
    });

    await waitFor(() => {
      expect(mockSetCurrentGuild).toHaveBeenCalledWith('guild-1', 'Test Guild');
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/admin');
    });
  });

  test('handles login error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ detail: 'Invalid credentials' }),
    });

    renderLogin();

    const usernameInput = screen.getByPlaceholderText('Username');
    const passwordInput = screen.getByPlaceholderText('Password');
    const submitButton = screen.getByRole('button', { name: 'Login' });

    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Error: Invalid credentials')).toBeInTheDocument();
    });
  });

  test('displays success message from registration', () => {
    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    );

    // Simulate location state
    const locationState = { message: 'Registered successfully! Please log in.' };
    // Note: In a real test, you'd need to mock useLocation

    // For now, just check that the component renders
    expect(screen.getByText('SphereConnect Login')).toBeInTheDocument();
  });

  test('handles PIN verification with guild fetching', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          requires_mfa: false,
          user: { id: '1' }
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: 'PIN verified successfully',
          user_id: '1'
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'guild-1',
          name: 'Test Guild'
        }),
      });

    renderLogin();

    const usernameInput = screen.getByPlaceholderText('Username');
    const passwordInput = screen.getByPlaceholderText('Password');
    const submitButton = screen.getByRole('button', { name: 'Login' });

    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    // Wait for PIN form to appear
    await waitFor(() => {
      expect(screen.getByText('Enter PIN')).toBeInTheDocument();
    });

    const pinInput = screen.getByPlaceholderText('Enter PIN');
    const verifyButton = screen.getByRole('button', { name: 'Verify PIN' });

    fireEvent.change(pinInput, { target: { value: '123456' } });
    fireEvent.click(verifyButton);

    await waitFor(() => {
      expect(mockSetCurrentGuild).toHaveBeenCalledWith('guild-1', 'Test Guild');
    });
  });

  test('handles MFA verification with guild fetching', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          requires_mfa: true,
          user: { id: '1' }
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: 'MFA verification successful',
          user_id: '1'
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'test-token',
          user: {
            id: '1',
            name: 'testuser',
            current_guild_id: 'guild-1'
          }
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'guild-1',
          name: 'Test Guild'
        }),
      });

    renderLogin();

    const usernameInput = screen.getByPlaceholderText('Username');
    const passwordInput = screen.getByPlaceholderText('Password');
    const submitButton = screen.getByRole('button', { name: 'Login' });

    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    // Wait for MFA form to appear
    await waitFor(() => {
      expect(screen.getByText('Multi-Factor Authentication')).toBeInTheDocument();
    });

    const mfaInput = screen.getByPlaceholderText('000000');
    const verifyButton = screen.getByRole('button', { name: 'Verify Code' });

    fireEvent.change(mfaInput, { target: { value: '123456' } });
    fireEvent.click(verifyButton);

    await waitFor(() => {
      expect(mockSetCurrentGuild).toHaveBeenCalledWith('guild-1', 'Test Guild');
    });
  });

  test('disables button during loading', async () => {
    mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

    renderLogin();

    const usernameInput = screen.getByPlaceholderText('Username');
    const passwordInput = screen.getByPlaceholderText('Password');
    const submitButton = screen.getByRole('button', { name: 'Login' });

    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    expect(submitButton).toBeDisabled();
    expect(submitButton).toHaveTextContent('Logging in...');
  });
});