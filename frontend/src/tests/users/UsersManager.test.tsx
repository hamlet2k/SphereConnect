import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import UsersManager from '../../components/UsersManager';

const mockUseGuild = jest.fn();
jest.mock('../../contexts/GuildContext', () => ({
  useGuild: () => mockUseGuild()
}));

const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};

Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

describe('UsersManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseGuild.mockReturnValue({
      currentGuildId: 'guild-1',
      guildName: 'Test Guild'
    });
    mockLocalStorage.getItem.mockReturnValue('mock-token');
  });

  afterEach(() => {
    (global.fetch as jest.Mock | undefined)?.mockReset();
  });

  const mockRanks = [
    { id: 'rank-1', name: 'Commander', access_levels: [] },
    { id: 'rank-2', name: 'Specialist', access_levels: [] }
  ];

  const mockAccessLevels = [
    { id: 'access-1', name: 'manage_users', user_actions: ['manage_users'] },
    { id: 'access-2', name: 'view_users', user_actions: ['view_users'] }
  ];

  const mockSquads = [
    { id: 'squad-1', name: 'Alpha' },
    { id: 'squad-2', name: 'Bravo' }
  ];

  const mockPreferences = [
    { id: 'pref-1', name: 'combat', description: 'Combat operations' },
    { id: 'pref-2', name: 'exploration', description: 'Exploration operations' }
  ];

  const mockUsers = [
    {
      id: 'user-1',
      identity: { name: 'Jane Pilot', username: 'jpilot', email: 'jane@example.com' },
      guild_state: {
        rank_id: 'rank-1',
        squad_id: 'squad-1',
        access_levels: [{ id: 'access-2', name: 'view_users' }]
      },
      availability: 'online',
      phonetic: 'Jane Pilot',
      preferences: [mockPreferences[0]],
      created_at: '2025-01-01T00:00:00Z'
    }
  ];

  const setupSuccessfulFetchSequence = () => {
    global.fetch = jest.fn((url: string, options?: RequestInit) => {
      if (url.includes('/api/admin/ranks')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockRanks) });
      }
      if (url.includes('/api/admin/access-levels')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockAccessLevels) });
      }
      if (url.includes('/api/admin/squads')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockSquads) });
      }
      if (url.endsWith('/api/preferences')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockPreferences) });
      }
      if (url.startsWith('http://localhost:8000/api/admin/users') && (!options || options.method === 'GET')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockUsers) });
      }
      if (options?.method === 'PATCH') {
        const body = options.body ? JSON.parse(options.body.toString()) : {};
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            message: 'User guild attributes updated successfully',
            user: {
              ...mockUsers[0],
              guild_state: {
                ...mockUsers[0].guild_state,
                rank_id: body.rank_id ?? mockUsers[0].guild_state.rank_id,
                squad_id: body.squad_id ?? mockUsers[0].guild_state.squad_id,
                access_levels: body.access_level_ids
                  ? body.access_level_ids.map((id: string) => ({ id, name: id }))
                  : mockUsers[0].guild_state.access_levels
              }
            }
          })
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    }) as unknown as jest.Mock;
  };

  test('renders user identity and preferences read-only', async () => {
    setupSuccessfulFetchSequence();

    render(<UsersManager />);

    await waitFor(() => {
      expect(screen.getByText('Jane Pilot')).toBeInTheDocument();
    });

    expect(screen.getByText('Username: jpilot')).toBeInTheDocument();
    expect(screen.getByText('Email: jane@example.com')).toBeInTheDocument();
    expect(screen.getByText('combat')).toBeInTheDocument();
  });

  test('updates access levels when toggled', async () => {
    setupSuccessfulFetchSequence();

    render(<UsersManager />);

    await waitFor(() => {
      expect(screen.getByText('Jane Pilot')).toBeInTheDocument();
    });

    const manageUsersCheckbox = await screen.findByLabelText('manage_users');
    fireEvent.click(manageUsersCheckbox);

    await waitFor(() => {
      const patchCall = (global.fetch as jest.Mock).mock.calls.find((call) => {
        const [, options] = call;
        return options && options.method === 'PATCH';
      });
      expect(patchCall).toBeDefined();
      const [, options] = patchCall as [string, RequestInit];
      const body = JSON.parse(options.body as string);
      expect(body.access_level_ids).toContain('access-1');
    });
  });

  test('applies preference filter when toggled', async () => {
    setupSuccessfulFetchSequence();

    render(<UsersManager />);

    await waitFor(() => {
      expect(screen.getByText('Jane Pilot')).toBeInTheDocument();
    });

    const combatFilterButton = screen.getByRole('button', { name: 'combat' });
    fireEvent.click(combatFilterButton);

    await waitFor(() => {
      const filteredCall = (global.fetch as jest.Mock).mock.calls.find((call) => {
        const [url, options] = call;
        return typeof url === 'string' && url.includes('preference_ids=pref-1') && (!options || options.method === 'GET');
      });
      expect(filteredCall).toBeDefined();
    });
  });
});
