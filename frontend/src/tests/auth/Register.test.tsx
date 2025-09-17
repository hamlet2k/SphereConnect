import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Register from '../../pages/Register';

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
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const renderRegister = () => {
  render(
    <BrowserRouter>
      <Register />
    </BrowserRouter>
  );
};

describe('Register Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

  test('renders registration form', () => {
    renderRegister();

    expect(screen.getByText('SphereConnect Registration')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Username')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Password (min 8 characters)')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('6-digit PIN')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Invite Code (optional)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Register' })).toBeInTheDocument();
  });

  test('validates username length', async () => {
    renderRegister();

    const usernameInput = screen.getByPlaceholderText('Username');
    const submitButton = screen.getByRole('button', { name: 'Register' });

    fireEvent.change(usernameInput, { target: { value: 'ab' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Username must be at least 3 characters')).toBeInTheDocument();
    });
  });

  test('validates password length', async () => {
    renderRegister();

    const usernameInput = screen.getByPlaceholderText('Username');
    const passwordInput = screen.getByPlaceholderText('Password (min 8 characters)');
    const submitButton = screen.getByRole('button', { name: 'Register' });

    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'short' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument();
    });
  });

  test('validates PIN format', async () => {
    renderRegister();

    const usernameInput = screen.getByPlaceholderText('Username');
    const passwordInput = screen.getByPlaceholderText('Password (min 8 characters)');
    const pinInput = screen.getByPlaceholderText('6-digit PIN');
    const submitButton = screen.getByRole('button', { name: 'Register' });

    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(pinInput, { target: { value: '12345' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('PIN must be exactly 6 digits')).toBeInTheDocument();
    });
  });

  test('submits form successfully without invite code', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'User registered successfully' }),
    });

    renderRegister();

    const usernameInput = screen.getByPlaceholderText('Username');
    const passwordInput = screen.getByPlaceholderText('Password (min 8 characters)');
    const pinInput = screen.getByPlaceholderText('6-digit PIN');
    const submitButton = screen.getByRole('button', { name: 'Register' });

    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(pinInput, { target: { value: '123456' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('http://localhost:8000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'testuser',
          password: 'password123',
          pin: '123456'
        }),
      });
    });

    await waitFor(() => {
      expect(screen.getByText('Registration successful! Redirecting to login...')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login', {
        state: { message: 'Registered successfully! Please log in.' }
      });
    });
  });

  test('submits form with invite code', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'User registered successfully', invite_processed: true }),
    });

    renderRegister();

    const usernameInput = screen.getByPlaceholderText('Username');
    const passwordInput = screen.getByPlaceholderText('Password (min 8 characters)');
    const pinInput = screen.getByPlaceholderText('6-digit PIN');
    const inviteCodeInput = screen.getByPlaceholderText('Invite Code (optional)');
    const submitButton = screen.getByRole('button', { name: 'Register' });

    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(pinInput, { target: { value: '123456' } });
    fireEvent.change(inviteCodeInput, { target: { value: 'ABC123XYZ' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('http://localhost:8000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'testuser',
          password: 'password123',
          pin: '123456',
          invite_code: 'ABC123XYZ'
        }),
      });
    });
  });

  test('handles 409 conflict error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({ detail: 'User already exists' }),
    });

    renderRegister();

    const usernameInput = screen.getByPlaceholderText('Username');
    const passwordInput = screen.getByPlaceholderText('Password (min 8 characters)');
    const pinInput = screen.getByPlaceholderText('6-digit PIN');
    const submitButton = screen.getByRole('button', { name: 'Register' });

    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(pinInput, { target: { value: '123456' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Error: User already exists')).toBeInTheDocument();
    });
  });

  test('handles 422 validation error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 422,
      json: async () => ({ detail: 'Password must be at least 8 characters' }),
    });

    renderRegister();

    const usernameInput = screen.getByPlaceholderText('Username');
    const passwordInput = screen.getByPlaceholderText('Password (min 8 characters)');
    const pinInput = screen.getByPlaceholderText('6-digit PIN');
    const submitButton = screen.getByRole('button', { name: 'Register' });

    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(pinInput, { target: { value: '123456' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Error: Password must be at least 8 characters')).toBeInTheDocument();
    });
  });

  test('disables button during loading', async () => {
    mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

    renderRegister();

    const usernameInput = screen.getByPlaceholderText('Username');
    const passwordInput = screen.getByPlaceholderText('Password (min 8 characters)');
    const pinInput = screen.getByPlaceholderText('6-digit PIN');
    const submitButton = screen.getByRole('button', { name: 'Register' });

    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(pinInput, { target: { value: '123456' } });
    fireEvent.click(submitButton);

    expect(submitButton).toBeDisabled();
    expect(submitButton).toHaveTextContent('Registering...');
  });
});