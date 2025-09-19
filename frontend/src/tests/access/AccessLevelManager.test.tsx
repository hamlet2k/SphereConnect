import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AccessLevelManager from '../../components/AccessLevelManager';

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

describe('AccessLevelManager', () => {
  const mockCurrentGuildId = '550e8400-e29b-41d4-a716-446655440000';
  const mockToken = 'mock-jwt-token';

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseGuild.mockReturnValue({
      currentGuildId: mockCurrentGuildId,
      guildName: 'Test Guild'
    });
    mockLocalStorage.getItem.mockReturnValue(mockToken);
  });

  describe('Component Rendering', () => {
    test('renders loading state initially', () => {
      (global.fetch as jest.Mock).mockImplementationOnce(() =>
        new Promise(() => {}) // Never resolves
      );

      render(<AccessLevelManager />);
      expect(screen.getByText('Loading access levels...')).toBeInTheDocument();
    });

    test('renders access levels table when data is loaded', async () => {
      const mockAccessLevels = [
        {
          id: '550e8400-e29b-41d4-a716-446655440001',
          name: 'Admin Access',
          user_actions: ['view_guilds', 'manage_guilds']
        }
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAccessLevels)
      });

      render(<AccessLevelManager />);

      await waitFor(() => {
        expect(screen.getByText('Admin Access')).toBeInTheDocument();
        expect(screen.getByText('View Guilds, Manage Guilds')).toBeInTheDocument();
      });
    });

    test('shows access denied when no token', () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      render(<AccessLevelManager />);
      expect(screen.getByText('Access denied. Please login first.')).toBeInTheDocument();
    });
  });

  describe('Create Access Level', () => {
    test('opens create form when Create Access Level button is clicked', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([])
      });

      render(<AccessLevelManager />);

      await waitFor(() => {
        expect(screen.getByText('Create Access Level')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Create Access Level'));
      expect(screen.getByText('Create New Access Level')).toBeInTheDocument();
    });

    test('creates access level successfully with confirmation dialog', async () => {
      const mockResponse = {
        message: 'Access level created successfully',
        id: '550e8400-e29b-41d4-a716-446655440002'
      };

      // Mock window.confirm to return true
      window.confirm = jest.fn(() => true);

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([])
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse)
        });

      render(<AccessLevelManager />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('Create Access Level'));
      });

      // Fill form
      fireEvent.change(screen.getByPlaceholderText('Enter access level name'), {
        target: { value: 'Test Access Level' }
      });

      // Check user actions
      const viewGuildsCheckbox = screen.getByLabelText('View Guilds');
      fireEvent.click(viewGuildsCheckbox);

      // Submit form
      fireEvent.click(screen.getByText('Create'));

      await waitFor(() => {
        expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to create this access level? This will change user permissions.');
        expect(global.fetch).toHaveBeenCalledWith(
          'http://localhost:8000/api/admin/access-levels',
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'Authorization': `Bearer ${mockToken}`,
              'Content-Type': 'application/json'
            }),
            body: JSON.stringify({
              name: 'Test Access Level',
              user_actions: ['view_guilds'],
              guild_id: mockCurrentGuildId
            })
          })
        );
      });
    });

    test('does not create access level when user cancels confirmation', async () => {
      // Mock window.confirm to return false
      window.confirm = jest.fn(() => false);

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([])
      });

      render(<AccessLevelManager />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('Create Access Level'));
      });

      // Fill form
      fireEvent.change(screen.getByPlaceholderText('Enter access level name'), {
        target: { value: 'Test Access Level' }
      });

      // Check user actions
      const viewGuildsCheckbox = screen.getByLabelText('View Guilds');
      fireEvent.click(viewGuildsCheckbox);

      // Submit form
      fireEvent.click(screen.getByText('Create'));

      // Verify confirmation was called but fetch was not called for creation
      expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to create this access level? This will change user permissions.');
      expect(global.fetch).toHaveBeenCalledTimes(1); // Only the initial load
    });

    test('shows validation error when form is incomplete', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([])
      });

      render(<AccessLevelManager />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('Create Access Level'));
      });

      // Submit without filling form
      fireEvent.click(screen.getByText('Create'));

      await waitFor(() => {
        expect(screen.getByText('Name and at least one user action are required')).toBeInTheDocument();
      });
    });
  });

  describe('Edit Access Level', () => {
    test('opens edit form with pre-filled data', async () => {
      const mockAccessLevels = [
        {
          id: '550e8400-e29b-41d4-a716-446655440001',
          name: 'Admin Access',
          user_actions: ['view_guilds', 'manage_guilds']
        }
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAccessLevels)
      });

      render(<AccessLevelManager />);

      await waitFor(() => {
        expect(screen.getByText('Admin Access')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Edit'));
      expect(screen.getByText('Edit Access Level')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Admin Access')).toBeInTheDocument();
    });

    test('updates access level successfully', async () => {
      const mockAccessLevels = [
        {
          id: '550e8400-e29b-41d4-a716-446655440001',
          name: 'Admin Access',
          user_actions: ['view_guilds']
        }
      ];

      const mockUpdateResponse = {
        message: 'Access level updated successfully',
        id: '550e8400-e29b-41d4-a716-446655440001'
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockAccessLevels)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockUpdateResponse)
        });

      render(<AccessLevelManager />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('Edit'));
      });

      // Modify name
      fireEvent.change(screen.getByDisplayValue('Admin Access'), {
        target: { value: 'Updated Admin Access' }
      });

      // Submit form
      fireEvent.click(screen.getByText('Update'));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          'http://localhost:8000/api/admin/access-levels/550e8400-e29b-41d4-a716-446655440001',
          expect.objectContaining({
            method: 'PATCH',
            body: JSON.stringify({
              name: 'Updated Admin Access',
              user_actions: ['view_guilds']
            })
          })
        );
      });
    });
  });

  describe('Delete Access Level', () => {
    test('deletes access level after confirmation with updated message', async () => {
      const mockAccessLevels = [
        {
          id: '550e8400-e29b-41d4-a716-446655440001',
          name: 'Test Access',
          user_actions: ['view_guilds']
        }
      ];

      const mockDeleteResponse = {
        message: 'Access level deleted successfully'
      };

      // Mock window.confirm
      window.confirm = jest.fn(() => true);

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockAccessLevels)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockDeleteResponse)
        });

      render(<AccessLevelManager />);

      await waitFor(() => {
        expect(screen.getByText('Test Access')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Delete'));

      await waitFor(() => {
        expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete this access level? This will permanently remove it and may affect user permissions.');
        expect(global.fetch).toHaveBeenCalledWith(
          'http://localhost:8000/api/admin/access-levels/550e8400-e29b-41d4-a716-446655440001',
          expect.objectContaining({
            method: 'DELETE'
          })
        );
      });
    });

    test('does not delete when user cancels confirmation', async () => {
      const mockAccessLevels = [
        {
          id: '550e8400-e29b-41d4-a716-446655440001',
          name: 'Test Access',
          user_actions: ['view_guilds']
        }
      ];

      // Mock window.confirm to return false
      window.confirm = jest.fn(() => false);

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAccessLevels)
      });

      render(<AccessLevelManager />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('Delete'));
      });

      // Verify fetch was not called for delete
      expect(global.fetch).toHaveBeenCalledTimes(1); // Only the initial load
    });
  });

  describe('Error Handling', () => {
    test('handles API errors gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      render(<AccessLevelManager />);

      await waitFor(() => {
        expect(screen.getByText('Error loading access levels')).toBeInTheDocument();
      });
    });

    test('handles 403 insufficient permissions error when loading', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: () => Promise.resolve({ detail: 'Insufficient permissions' })
      });

      render(<AccessLevelManager />);

      await waitFor(() => {
        expect(screen.getByText('Insufficient permissions to manage access levels. You need manage_rbac permission.')).toBeInTheDocument();
      });
    });

    test('handles create access level API error', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([])
        })
        .mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({ detail: 'Failed to create access level' })
        });

      render(<AccessLevelManager />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('Create Access Level'));
      });

      // Fill and submit form
      fireEvent.change(screen.getByPlaceholderText('Enter access level name'), {
        target: { value: 'Test Access' }
      });
      const checkbox = screen.getByLabelText('View Guilds');
      fireEvent.click(checkbox);
      fireEvent.click(screen.getByText('Create'));

      await waitFor(() => {
        expect(screen.getByText('Failed to create access level')).toBeInTheDocument();
      });
    });

    test('handles 403 error on create access level', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([])
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 403,
          json: () => Promise.resolve({ detail: 'Insufficient permissions' })
        });

      render(<AccessLevelManager />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('Create Access Level'));
      });

      // Fill and submit form
      fireEvent.change(screen.getByPlaceholderText('Enter access level name'), {
        target: { value: 'Test Access' }
      });
      const checkbox = screen.getByLabelText('View Guilds');
      fireEvent.click(checkbox);
      fireEvent.click(screen.getByText('Create'));

      await waitFor(() => {
        expect(screen.getByText('Insufficient permissions to manage access levels. You need manage_rbac permission.')).toBeInTheDocument();
      });
    });

    test('handles 403 error on delete access level', async () => {
      const mockAccessLevels = [
        {
          id: '550e8400-e29b-41d4-a716-446655440001',
          name: 'Test Access',
          user_actions: ['view_guilds']
        }
      ];

      // Mock window.confirm to return true
      window.confirm = jest.fn(() => true);

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockAccessLevels)
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 403,
          json: () => Promise.resolve({ detail: 'Insufficient permissions' })
        });

      render(<AccessLevelManager />);

      await waitFor(() => {
        expect(screen.getByText('Test Access')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Delete'));

      await waitFor(() => {
        expect(screen.getByText('Insufficient permissions to manage access levels. You need manage_rbac permission.')).toBeInTheDocument();
      });
    });
  });

  describe('User Actions', () => {
    test('displays all hardcoded user actions in form including manage_rbac', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([])
      });

      render(<AccessLevelManager />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('Create Access Level'));
      });

      // Check that all user actions are displayed including manage_rbac
      expect(screen.getByLabelText('View Guilds')).toBeInTheDocument();
      expect(screen.getByLabelText('Manage Guilds')).toBeInTheDocument();
      expect(screen.getByLabelText('Manage Users')).toBeInTheDocument();
      expect(screen.getByLabelText('Create Objective')).toBeInTheDocument();
      expect(screen.getByLabelText('Manage Objectives')).toBeInTheDocument();
      expect(screen.getByLabelText('Manage Rbac')).toBeInTheDocument();
    });

    test('toggles user actions correctly', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([])
      });

      render(<AccessLevelManager />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('Create Access Level'));
      });

      const viewGuildsCheckbox = screen.getByLabelText('View Guilds');
      const manageGuildsCheckbox = screen.getByLabelText('Manage Guilds');

      // Initially unchecked
      expect(viewGuildsCheckbox).not.toBeChecked();
      expect(manageGuildsCheckbox).not.toBeChecked();

      // Check first action
      fireEvent.click(viewGuildsCheckbox);
      expect(viewGuildsCheckbox).toBeChecked();

      // Check second action
      fireEvent.click(manageGuildsCheckbox);
      expect(manageGuildsCheckbox).toBeChecked();

      // Uncheck first action
      fireEvent.click(viewGuildsCheckbox);
      expect(viewGuildsCheckbox).not.toBeChecked();
      expect(manageGuildsCheckbox).toBeChecked();
    });
  });
});

export {};