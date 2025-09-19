import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import UsersManager from '../../components/UsersManager';

// Mock the GuildContext
const mockUseGuild = jest.fn();
jest.mock('../../contexts/GuildContext', () => ({
  useGuild: () => mockUseGuild()
}));

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

// Mock fetch
global.fetch = jest.fn();

describe('UsersManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseGuild.mockReturnValue({
      currentGuildId: 'test-guild-id',
      guildName: 'Test Guild'
    });
    mockLocalStorage.getItem.mockReturnValue('mock-token');
  });

  describe('Component Rendering', () => {
    test('renders loading state initially', () => {
      (global.fetch as jest.Mock).mockImplementationOnce(() =>
        new Promise(() => {}) // Never resolves
      );

      render(<UsersManager />);
      expect(screen.getByText('Loading users...')).toBeInTheDocument();
    });

    test('renders users table when data is loaded', async () => {
      const mockUsers = [
        {
          id: '1',
          name: 'John Doe',
          username: 'johndoe',
          email: 'john@example.com',
          rank: 'rank-1',
          availability: 'online',
          phonetic: 'john doe',
          created_at: '2025-01-01T00:00:00Z'
        }
      ];

      const mockRanks = [{ id: 'rank-1', name: 'Recruit', access_levels: [] }];
      const mockAccessLevels = [{ id: 'access-1', name: 'view_guilds', user_actions: ['view_guilds'] }];

      (global.fetch as jest.Mock)
        .mockImplementationOnce(() => Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockUsers)
        }))
        .mockImplementationOnce(() => Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockRanks)
        }))
        .mockImplementationOnce(() => Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockAccessLevels)
        }));

      render(<UsersManager />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      expect(screen.getByText('johndoe')).toBeInTheDocument();
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
    });

    test('shows access denied when no token', () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      render(<UsersManager />);
      expect(screen.getByText('Access denied. Please login first.')).toBeInTheDocument();
    });
  });

  describe('User Creation', () => {
    test('opens create user form when Create User button is clicked', async () => {
      const mockUsers = [];
      const mockRanks = [];
      const mockAccessLevels = [];

      (global.fetch as jest.Mock)
        .mockImplementation(() => Promise.resolve({
          ok: true,
          json: () => Promise.resolve([])
        }));

      render(<UsersManager />);

      await waitFor(() => {
        expect(screen.getByText('Create User')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Create User'));
      expect(screen.getByText('Create New User')).toBeInTheDocument();
    });

    test('submits create user form with valid data', async () => {
      const mockUsers = [];
      const mockRanks = [{ id: 'rank-1', name: 'Recruit', access_levels: [] }];
      const mockAccessLevels = [];

      (global.fetch as jest.Mock)
        .mockImplementation(() => Promise.resolve({
          ok: true,
          json: () => Promise.resolve([])
        }))
        .mockImplementationOnce(() => Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ message: 'User created successfully', user_id: 'new-user-id' })
        }));

      render(<UsersManager />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('Create User'));
      });

      // Fill form
      fireEvent.change(screen.getByPlaceholderText('Enter display name'), { target: { value: 'Jane Doe' } });
      fireEvent.change(screen.getByPlaceholderText('Enter login username'), { target: { value: 'janedoe' } });
      fireEvent.change(screen.getByPlaceholderText('Enter email (optional)'), { target: { value: 'jane@example.com' } });
      fireEvent.change(screen.getByPlaceholderText('Enter password'), { target: { value: 'password123' } });
      fireEvent.change(screen.getByPlaceholderText('6-digit PIN'), { target: { value: '123456' } });

      // Mock window.confirm
      window.confirm = jest.fn(() => true);

      fireEvent.click(screen.getByText('Create'));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          'http://localhost:8000/api/admin/users',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({
              name: 'Jane Doe',
              username: 'janedoe',
              email: 'jane@example.com',
              password: 'password123',
              pin: '123456',
              rank_id: '',
              phonetic: '',
              availability: 'offline',
              guild_id: 'test-guild-id'
            })
          })
        );
      });
    });
  });

  describe('User Editing', () => {
    test('opens edit form when Edit button is clicked', async () => {
      const mockUsers = [
        {
          id: '1',
          name: 'John Doe',
          username: 'johndoe',
          email: 'john@example.com',
          rank: 'rank-1',
          availability: 'online',
          phonetic: 'john doe'
        }
      ];

      (global.fetch as jest.Mock)
        .mockImplementation(() => Promise.resolve({
          ok: true,
          json: () => Promise.resolve([])
        }))
        .mockImplementationOnce(() => Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockUsers)
        }));

      render(<UsersManager />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      fireEvent.click(screen.getAllByText('Edit')[0]);
      expect(screen.getByText('Edit User')).toBeInTheDocument();
    });
  });

  describe('User Deletion', () => {
    test('deletes user when Delete button is clicked and confirmed', async () => {
      const mockUsers = [
        {
          id: '1',
          name: 'John Doe',
          username: 'johndoe',
          email: 'john@example.com',
          rank: 'rank-1',
          availability: 'online'
        }
      ];

      (global.fetch as jest.Mock)
        .mockImplementation(() => Promise.resolve({
          ok: true,
          json: () => Promise.resolve([])
        }))
        .mockImplementationOnce(() => Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockUsers)
        }))
        .mockImplementationOnce(() => Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ message: 'User deleted successfully' })
        }));

      render(<UsersManager />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      // Mock window.confirm
      window.confirm = jest.fn(() => true);

      fireEvent.click(screen.getAllByText('Delete')[0]);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          'http://localhost:8000/api/admin/users/1',
          expect.objectContaining({ method: 'DELETE' })
        );
      });
    });
  });

  describe('Rank Assignment', () => {
    test('assigns rank when rank is selected from dropdown', async () => {
      const mockUsers = [
        {
          id: '1',
          name: 'John Doe',
          username: 'johndoe',
          email: 'john@example.com',
          rank: null,
          availability: 'online'
        }
      ];

      const mockRanks = [{ id: 'rank-1', name: 'Recruit', access_levels: [] }];

      (global.fetch as jest.Mock)
        .mockImplementation(() => Promise.resolve({
          ok: true,
          json: () => Promise.resolve([])
        }))
        .mockImplementationOnce(() => Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockUsers)
        }))
        .mockImplementationOnce(() => Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockRanks)
        }))
        .mockImplementationOnce(() => Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ message: 'Rank assigned successfully' })
        }));

      render(<UsersManager />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const rankSelect = screen.getByDisplayValue('Assign Rank');
      fireEvent.change(rankSelect, { target: { value: 'rank-1' } });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          'http://localhost:8000/api/admin/users/1',
          expect.objectContaining({
            method: 'PUT',
            body: JSON.stringify({ rank_id: 'rank-1' })
          })
        );
      });
    });
  });

  describe('Access Level Assignment', () => {
    test('assigns access level when selected from dropdown', async () => {
      const mockUsers = [
        {
          id: '1',
          name: 'John Doe',
          username: 'johndoe',
          email: 'john@example.com',
          rank: null,
          availability: 'online'
        }
      ];

      const mockAccessLevels = [{ id: 'access-1', name: 'view_guilds', user_actions: ['view_guilds'] }];

      (global.fetch as jest.Mock)
        .mockImplementation(() => Promise.resolve({
          ok: true,
          json: () => Promise.resolve([])
        }))
        .mockImplementationOnce(() => Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockUsers)
        }))
        .mockImplementationOnce(() => Promise.resolve({
          ok: true,
          json: () => Promise.resolve([])
        }))
        .mockImplementationOnce(() => Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockAccessLevels)
        }))
        .mockImplementationOnce(() => Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ message: 'Access level assigned successfully' })
        }));

      render(<UsersManager />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const accessSelect = screen.getByDisplayValue('Assign Access');
      fireEvent.change(accessSelect, { target: { value: 'access-1' } });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          'http://localhost:8000/api/admin/user_access',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({
              user_id: '1',
              access_level_id: 'access-1'
            })
          })
        );
      });
    });
  });

  describe('Error Handling', () => {
    test('shows error message when API call fails', async () => {
      (global.fetch as jest.Mock)
        .mockImplementation(() => Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ detail: 'API Error' })
        }));

      render(<UsersManager />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load users')).toBeInTheDocument();
      });
    });

    test('shows permission error when user lacks manage_users permission', async () => {
      (global.fetch as jest.Mock)
        .mockImplementationOnce(() => Promise.resolve({
          ok: false,
          status: 403,
          json: () => Promise.resolve({ detail: 'Insufficient permissions' })
        }));

      render(<UsersManager />);

      await waitFor(() => {
        expect(screen.getByText('Insufficient permissions to manage users. You need manage_users permission.')).toBeInTheDocument();
      });
    });
  });
});