import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import RanksManager from '../../components/RanksManager';

// Mock the useGuild hook
jest.mock('../../contexts/GuildContext', () => ({
  useGuild: () => ({
    currentGuildId: 'test-guild-id',
    guildName: 'Test Guild'
  })
}));

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn()
};
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

// Mock fetch
global.fetch = jest.fn();

describe('RanksManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue('mock-token');
  });

  it('renders loading state initially', () => {
    (global.fetch as jest.Mock).mockImplementationOnce(() =>
      new Promise(() => {}) // Never resolves to keep loading state
    );

    render(<RanksManager />);
    expect(screen.getByText('Loading ranks...')).toBeInTheDocument();
  });

  it('renders ranks table when data is loaded', async () => {
    const mockRanks = [
      {
        id: 'rank-1',
        name: 'Recruit',
        access_levels: ['access-1', 'access-2'],
        phonetic: 'Recruit'
      },
      {
        id: 'rank-2',
        name: 'Commander',
        access_levels: ['access-1', 'access-2', 'access-3'],
        phonetic: 'Commander'
      }
    ];

    const mockAccessLevels = [
      { id: 'access-1', name: 'View Guilds', user_actions: ['view_guilds'] },
      { id: 'access-2', name: 'Manage Users', user_actions: ['manage_users'] },
      { id: 'access-3', name: 'Manage Guilds', user_actions: ['manage_guilds'] }
    ];

    (global.fetch as jest.Mock)
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockRanks)
        })
      )
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockAccessLevels)
        })
      );

    render(<RanksManager />);

    await waitFor(() => {
      expect(screen.getByText('Recruit')).toBeInTheDocument();
      expect(screen.getByText('Commander')).toBeInTheDocument();
    });

    expect(screen.getByText('View Guilds, Manage Users')).toBeInTheDocument();
  });

  it('shows create form when Create Rank button is clicked', async () => {
    (global.fetch as jest.Mock)
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve([])
        })
      )
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve([])
        })
      );

    render(<RanksManager />);

    await waitFor(() => {
      expect(screen.getByText('Create Rank')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Create Rank'));
    expect(screen.getByText('Create New Rank')).toBeInTheDocument();
  });

  it('handles form submission for creating a rank', async () => {
    const mockAccessLevels = [
      { id: 'access-1', name: 'View Guilds', user_actions: ['view_guilds'] }
    ];

    (global.fetch as jest.Mock)
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve([])
        })
      )
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockAccessLevels)
        })
      )
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ message: 'Rank created successfully' })
        })
      )
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve([])
        })
      );

    // Mock window.confirm
    window.confirm = jest.fn(() => true);

    render(<RanksManager />);

    await waitFor(() => {
      expect(screen.getByText('Create Rank')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Create Rank'));

    const nameInput = screen.getByPlaceholderText('Enter rank name (e.g., Recruit, NCO, Commander)');
    const checkbox = screen.getByLabelText('View Guilds');
    const submitButton = screen.getByText('Create');

    fireEvent.change(nameInput, { target: { value: 'Test Rank' } });
    fireEvent.click(checkbox);
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/admin/ranks',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            name: 'Test Rank',
            access_levels: ['access-1'],
            guild_id: 'test-guild-id'
          })
        })
      );
    });
  });

  it('handles edit functionality', async () => {
    const mockRanks = [
      {
        id: 'rank-1',
        name: 'Recruit',
        access_levels: ['access-1'],
        phonetic: 'Recruit'
      }
    ];

    const mockAccessLevels = [
      { id: 'access-1', name: 'View Guilds', user_actions: ['view_guilds'] }
    ];

    (global.fetch as jest.Mock)
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockRanks)
        })
      )
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockAccessLevels)
        })
      );

    render(<RanksManager />);

    await waitFor(() => {
      expect(screen.getByText('Recruit')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Edit'));
    expect(screen.getByText('Edit Rank')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Recruit')).toBeInTheDocument();
  });

  it('handles delete functionality', async () => {
    const mockRanks = [
      {
        id: 'rank-1',
        name: 'Recruit',
        access_levels: ['access-1'],
        phonetic: 'Recruit'
      }
    ];

    (global.fetch as jest.Mock)
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockRanks)
        })
      )
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve([])
        })
      )
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ message: 'Rank deleted successfully' })
        })
      )
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve([])
        })
      );

    // Mock window.confirm
    window.confirm = jest.fn(() => true);

    render(<RanksManager />);

    await waitFor(() => {
      expect(screen.getByText('Recruit')).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByText('Delete')[0]);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/admin/ranks/rank-1',
        expect.objectContaining({
          method: 'DELETE'
        })
      );
    });
  });

  it('shows error message on API failure', async () => {
    (global.fetch as jest.Mock)
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: false,
          status: 403,
          json: () => Promise.resolve({ detail: 'Insufficient permissions' })
        })
      )
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve([])
        })
      );

    render(<RanksManager />);

    await waitFor(() => {
      expect(screen.getByText('Insufficient permissions to manage ranks. You need manage_ranks permission.')).toBeInTheDocument();
    });
  });

  it('shows access denied when no token', () => {
    mockLocalStorage.getItem.mockReturnValue(null);

    render(<RanksManager />);
    expect(screen.getByText('Access denied. Please login first.')).toBeInTheDocument();
  });

  it('handles access level toggle in form', async () => {
    const mockAccessLevels = [
      { id: 'access-1', name: 'View Guilds', user_actions: ['view_guilds'] },
      { id: 'access-2', name: 'Manage Users', user_actions: ['manage_users'] }
    ];

    (global.fetch as jest.Mock)
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve([])
        })
      )
      .mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockAccessLevels)
        })
      );

    render(<RanksManager />);

    await waitFor(() => {
      expect(screen.getByText('Create Rank')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Create Rank'));

    const checkbox1 = screen.getByLabelText('View Guilds');
    const checkbox2 = screen.getByLabelText('Manage Users');

    fireEvent.click(checkbox1);
    fireEvent.click(checkbox2);
    fireEvent.click(checkbox1); // Uncheck first one

    expect(checkbox1).not.toBeChecked();
    expect(checkbox2).toBeChecked();
  });
});