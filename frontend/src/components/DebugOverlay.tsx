import React, {
  CSSProperties,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore
} from 'react';
import { useLocation } from 'react-router-dom';
import api, { ApiRequestLog, apiDebugStore } from '../api';
import { useGuild } from '../contexts/GuildContext';
import { DEBUG_OVERLAY_ENABLED, useDebugOverlay } from '../hooks/useDebugOverlay';

interface AuthSnapshot {
  token: string | null;
  refreshToken: string | null;
  user: any;
  lastActivity: string | null;
  permissionCache: string | null;
}

interface PreferencesFetchResult {
  data: any;
  source: 'guild' | 'preferences-endpoint' | null;
}

type AdminContext = 'users' | 'guilds' | 'objectives' | 'categories' | 'dashboard' | null;

const MIN_WIDTH = 360;
const MIN_HEIGHT = 300;
const RESIZE_HANDLE_SIZE = 14;

const getDefaultPosition = () => {
  if (typeof window === 'undefined') {
    return { x: 24, y: 24 };
  }
  const defaultWidth = 480;
  const defaultHeight = 560;
  return {
    x: Math.max(24, window.innerWidth - defaultWidth - 36),
    y: Math.max(24, window.innerHeight - defaultHeight - 36)
  };
};

const getDefaultSize = () => ({
  width: 480,
  height: 560
});

const getAuthSnapshot = (): AuthSnapshot => {
  if (typeof window === 'undefined') {
    return {
      token: null,
      refreshToken: null,
      user: null,
      lastActivity: null,
      permissionCache: null
    };
  }

  const token = localStorage.getItem('token');
  const refreshToken = localStorage.getItem('refresh_token');
  const userRaw = localStorage.getItem('user');
  const lastActivity = localStorage.getItem('lastActivity');
  const permissionCache = localStorage.getItem('permission_cache');

  let user: any = null;
  if (userRaw) {
    try {
      user = JSON.parse(userRaw);
    } catch (err) {
      user = null;
    }
  }

  return {
    token,
    refreshToken,
    user,
    lastActivity,
    permissionCache
  };
};

const decodeJwtPayload = (token: string | null) => {
  if (!token) {
    return null;
  }

  const segments = token.split('.');
  if (segments.length < 2) {
    return null;
  }

  try {
    const base64 = segments[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    if (typeof window === 'undefined' || typeof window.atob !== 'function') {
      return null;
    }
    const decoded = window.atob(padded);
    return JSON.parse(decoded);
  } catch (err) {
    return null;
  }
};

const formatTimestamp = (timestamp?: number | null) => {
  if (!timestamp) {
    return 'unknown';
  }
  try {
    return new Date(timestamp).toLocaleString();
  } catch (err) {
    return String(timestamp);
  }
};

const DebugOverlayInner: React.FC = () => {
  const { isVisible, setIsVisible } = useDebugOverlay({ initialVisible: true });
  const location = useLocation();
  const { currentGuildId, guildName } = useGuild();

  const [isMinimized, setIsMinimized] = useState(false);
  const [position, setPosition] = useState(getDefaultPosition);
  const [size, setSize] = useState(getDefaultSize);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  const positionRef = useRef(position);
  const sizeRef = useRef(size);
  const draggingRef = useRef(false);
  const resizingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const dragOriginRef = useRef({ x: 0, y: 0 });
  const resizeStartRef = useRef({ x: 0, y: 0 });
  const resizeOriginRef = useRef({ width: 0, height: 0 });

  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  useEffect(() => {
    sizeRef.current = size;
  }, [size]);

  const [authSnapshot, setAuthSnapshot] = useState<AuthSnapshot>(() => getAuthSnapshot());

  useEffect(() => {
    setAuthSnapshot(getAuthSnapshot());
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (isVisible) {
      setAuthSnapshot(getAuthSnapshot());
    }
  }, [isVisible]);

  const refreshAuthSnapshot = useCallback(() => {
    setAuthSnapshot(getAuthSnapshot());
  }, []);

  const authUserId = authSnapshot.user?.id ?? authSnapshot.user?.user_id ?? null;

  const tokenPayload = useMemo(() => decodeJwtPayload(authSnapshot.token), [authSnapshot.token]);
  const tokenExpiration = useMemo(() => {
    if (!tokenPayload || typeof tokenPayload.exp === 'undefined') {
      return 'unknown';
    }
    const exp = Number(tokenPayload.exp) * 1000;
    if (Number.isNaN(exp)) {
      return 'unknown';
    }
    return new Date(exp).toISOString();
  }, [tokenPayload]);

  const truncatedToken = useMemo(() => {
    const token = authSnapshot.token;
    if (!token) {
      return null;
    }
    if (token.length <= 32) {
      return token;
    }
    return `${token.slice(0, 16)}…${token.slice(-8)}`;
  }, [authSnapshot.token]);

  const apiDebugState = useSyncExternalStore(apiDebugStore.subscribe, apiDebugStore.getState, apiDebugStore.getState);

  const [guildDetails, setGuildDetails] = useState<any | null>(null);
  const [guildUserEntry, setGuildUserEntry] = useState<any | null>(null);
  const [preferencesRaw, setPreferencesRaw] = useState<string | null>(null);
  const [guildLoading, setGuildLoading] = useState(false);
  const [guildError, setGuildError] = useState<string | null>(null);
  const [guildFetchedAt, setGuildFetchedAt] = useState<number | null>(null);

  const [contextData, setContextData] = useState<any>(null);
  const [contextLoading, setContextLoading] = useState(false);
  const [contextError, setContextError] = useState<string | null>(null);
  const [contextFetchedAt, setContextFetchedAt] = useState<number | null>(null);

  const [adminTab, setAdminTab] = useState<string | null>(() => {
    if (typeof window === 'undefined') {
      return null;
    }
    return (window as any).__SPHERECONNECT_ACTIVE_ADMIN_TAB ?? null;
  });

  const adminTabListener = useCallback((event: Event) => {
    const detail = (event as CustomEvent<string | null>).detail ?? null;
    setAdminTab(detail);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    window.addEventListener('sphereconnect-admin-tab-change', adminTabListener as EventListener);
    return () => {
      window.removeEventListener('sphereconnect-admin-tab-change', adminTabListener as EventListener);
    };
  }, [adminTabListener]);

  const adminContext = useMemo<AdminContext>(() => {
    if (!location.pathname.startsWith('/admin')) {
      return null;
    }

    const normalizedTab = adminTab || location.pathname.split('/')[2] || null;
    switch (normalizedTab) {
      case 'users':
        return 'users';
      case 'guilds':
        return 'guilds';
      case 'objectives':
        return 'objectives';
      case 'categories':
        return 'categories';
      default:
        return 'dashboard';
    }
  }, [adminTab, location.pathname]);

  const toggleSection = useCallback((sectionId: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  }, []);

  const handleDragMove = useCallback((event: MouseEvent) => {
    if (!draggingRef.current) {
      return;
    }

    event.preventDefault();
    const deltaX = event.clientX - dragStartRef.current.x;
    const deltaY = event.clientY - dragStartRef.current.y;
    let nextX = dragOriginRef.current.x + deltaX;
    let nextY = dragOriginRef.current.y + deltaY;

    if (typeof window !== 'undefined') {
      const maxX = window.innerWidth - sizeRef.current.width - 16;
      const maxY = window.innerHeight - sizeRef.current.height - 16;
      nextX = Math.min(Math.max(16, nextX), Math.max(16, maxX));
      nextY = Math.min(Math.max(16, nextY), Math.max(16, maxY));
    }

    setPosition({ x: nextX, y: nextY });
  }, []);

  const handleDragEnd = useCallback(() => {
    draggingRef.current = false;
    document.removeEventListener('mousemove', handleDragMove);
    document.removeEventListener('mouseup', handleDragEnd);
  }, [handleDragMove]);

  const handleDragStart = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (isMinimized) {
      return;
    }
    event.preventDefault();
    draggingRef.current = true;
    dragStartRef.current = { x: event.clientX, y: event.clientY };
    dragOriginRef.current = { ...positionRef.current };
    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);
  }, [handleDragEnd, handleDragMove, isMinimized]);

  const handleResizeMove = useCallback((event: MouseEvent) => {
    if (!resizingRef.current) {
      return;
    }

    event.preventDefault();
    const deltaX = event.clientX - resizeStartRef.current.x;
    const deltaY = event.clientY - resizeStartRef.current.y;

    let nextWidth = resizeOriginRef.current.width + deltaX;
    let nextHeight = resizeOriginRef.current.height + deltaY;

    if (typeof window !== 'undefined') {
      const maxWidth = window.innerWidth - positionRef.current.x - 16;
      const maxHeight = window.innerHeight - positionRef.current.y - 16;
      nextWidth = Math.min(Math.max(MIN_WIDTH, nextWidth), Math.max(MIN_WIDTH, maxWidth));
      nextHeight = Math.min(Math.max(MIN_HEIGHT, nextHeight), Math.max(MIN_HEIGHT, maxHeight));
    } else {
      nextWidth = Math.max(MIN_WIDTH, nextWidth);
      nextHeight = Math.max(MIN_HEIGHT, nextHeight);
    }

    setSize({ width: nextWidth, height: nextHeight });
  }, []);

  const handleResizeEnd = useCallback(() => {
    resizingRef.current = false;
    document.removeEventListener('mousemove', handleResizeMove);
    document.removeEventListener('mouseup', handleResizeEnd);
  }, [handleResizeMove]);

  const handleResizeStart = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    resizingRef.current = true;
    resizeStartRef.current = { x: event.clientX, y: event.clientY };
    resizeOriginRef.current = { ...sizeRef.current };
    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);
  }, [handleResizeEnd, handleResizeMove]);

  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleDragMove);
      document.removeEventListener('mouseup', handleDragEnd);
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
    };
  }, [handleDragEnd, handleDragMove, handleResizeEnd, handleResizeMove]);

  const fetchPreferencesFallback = useCallback(async (guildId: string): Promise<PreferencesFetchResult> => {
    try {
      const response = await api.get('/preferences', { params: { guild_id: guildId } });
      return { data: response.data, source: 'preferences-endpoint' };
    } catch (err) {
      return { data: null, source: null };
    }
  }, []);

  const fetchGuildData = useCallback(async () => {
    if (!isVisible || !authUserId || !currentGuildId) {
      return;
    }

    setGuildLoading(true);
    setGuildError(null);

    try {
      const [guildResult, usersResult] = await Promise.allSettled([
        api.get(`/guilds/${currentGuildId}`),
        api.get('/admin/users', { params: { guild_id: currentGuildId } })
      ]);

      let resolvedGuild: any | null = null;
      let resolvedUsers: any[] | null = null;
      const errors: string[] = [];

      if (guildResult.status === 'fulfilled') {
        resolvedGuild = guildResult.value.data;
        setGuildDetails(resolvedGuild);
      } else {
        errors.push(guildResult.reason?.message || 'Failed to fetch guild');
        setGuildDetails(null);
      }

      if (usersResult.status === 'fulfilled') {
        resolvedUsers = Array.isArray(usersResult.value.data) ? usersResult.value.data : [];
        const matchingUser = resolvedUsers.find((entry: any) => {
          return entry?.id === authUserId || entry?.user_id === authUserId;
        }) || null;
        setGuildUserEntry(matchingUser);
      } else {
        errors.push(usersResult.reason?.message || 'Failed to fetch guild members');
        setGuildUserEntry(null);
      }

      let preferencesPayload: PreferencesFetchResult = { data: null, source: null };
      if (resolvedGuild && typeof resolvedGuild.preferences !== 'undefined') {
        preferencesPayload = { data: resolvedGuild.preferences, source: 'guild' };
      } else {
        preferencesPayload = await fetchPreferencesFallback(currentGuildId);
      }

      setPreferencesRaw(preferencesPayload.data !== null ? JSON.stringify(preferencesPayload.data) : null);

      setGuildFetchedAt(Date.now());
      if (errors.length > 0) {
        setGuildError(errors.join(' | '));
      } else {
        setGuildError(null);
      }
    } catch (err: any) {
      setGuildError(err?.message || 'Failed to load guild state');
      setGuildDetails(null);
      setGuildUserEntry(null);
      setPreferencesRaw(null);
      setGuildFetchedAt(Date.now());
    } finally {
      setGuildLoading(false);
    }
  }, [authUserId, currentGuildId, fetchPreferencesFallback, isVisible]);

  const fetchContextData = useCallback(async () => {
    if (!isVisible) {
      return;
    }

    if (!adminContext) {
      setContextData(null);
      setContextError(null);
      return;
    }

    if ((adminContext === 'users' || adminContext === 'objectives' || adminContext === 'categories') && !currentGuildId) {
      setContextError('No active guild selected');
      setContextData(null);
      return;
    }

    setContextLoading(true);
    setContextError(null);

    try {
      let data: any = null;
      switch (adminContext) {
        case 'users': {
          const response = await api.get('/admin/users', { params: { guild_id: currentGuildId } });
          data = response.data;
          break;
        }
        case 'guilds': {
          if (!authUserId) {
            throw new Error('Missing user identifier for guild fetch');
          }
          const response = await api.get(`/users/${authUserId}/guilds`);
          data = response.data;
          break;
        }
        case 'objectives': {
          const response = await api.get('/admin/objectives', { params: { guild_id: currentGuildId } });
          data = response.data;
          break;
        }
        case 'categories': {
          const response = await api.get('/categories', { params: { guild_id: currentGuildId } });
          data = response.data;
          break;
        }
        case 'dashboard':
        default:
          data = null;
          break;
      }

      setContextData(data);
      setContextFetchedAt(Date.now());
    } catch (err: any) {
      setContextError(err?.message || 'Failed to load context data');
      setContextData(null);
      setContextFetchedAt(Date.now());
    } finally {
      setContextLoading(false);
    }
  }, [adminContext, authUserId, currentGuildId, isVisible]);

  useEffect(() => {
    if (isVisible) {
      fetchGuildData();
    }
  }, [fetchGuildData, isVisible]);

  useEffect(() => {
    if (isVisible) {
      fetchContextData();
    }
  }, [fetchContextData, isVisible]);

  const generalSectionContent = (
    <div>
      <div style={{ marginBottom: 8 }}>
        <strong>Route:</strong> <code>{location.pathname}{location.search}{location.hash}</code>
      </div>
      <div style={{ marginBottom: 8 }}>
        <strong>User:</strong>
        <div style={{ fontFamily: 'monospace', fontSize: '0.85rem', marginTop: 4 }}>
          {authSnapshot.user ? (
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {JSON.stringify({
                id: authSnapshot.user?.id,
                username: authSnapshot.user?.username,
                email: authSnapshot.user?.email
              }, null, 2)}
            </pre>
          ) : (
            <span>No user loaded</span>
          )}
        </div>
      </div>
      <div style={{ marginBottom: 8 }}>
        <strong>Token:</strong> {truncatedToken || 'None'}
        <div style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Expires: {tokenExpiration}</div>
      </div>
      <div style={{ marginBottom: 8 }}>
        <strong>Last API Call:</strong>
        <div style={{ fontFamily: 'monospace', fontSize: '0.85rem', marginTop: 4 }}>
          {(apiDebugState.lastResponse || apiDebugState.lastRequest) ? (
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {JSON.stringify({
                method: (apiDebugState.lastResponse || apiDebugState.lastRequest)?.method,
                url: (apiDebugState.lastResponse || apiDebugState.lastRequest)?.url,
                status: apiDebugState.lastResponse?.status ?? apiDebugState.lastRequest?.status,
                durationMs: apiDebugState.lastResponse?.durationMs,
                errorMessage: apiDebugState.lastResponse?.errorMessage
              }, null, 2)}
            </pre>
          ) : (
            <span>No requests logged yet</span>
          )}
        </div>
      </div>
      <div style={{ marginBottom: 8 }}>
        <strong>Refresh Token:</strong> {authSnapshot.refreshToken ? `${authSnapshot.refreshToken.slice(0, 12)}…` : 'None'}
      </div>
      <div style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>
        Last activity: {authSnapshot.lastActivity ? formatTimestamp(Number(authSnapshot.lastActivity)) : 'unknown'}
      </div>
    </div>
  );

  const userGuildState = guildUserEntry?.guild_state ?? null;
  const userAccessEntries = userGuildState?.access_levels || guildUserEntry?.access_levels || [];
  const userRankId = userGuildState?.rank_id ?? null;
  const guildFlags = {
    is_creator: guildDetails?.creator_id ? guildDetails.creator_id === authUserId : false,
    has_super_admin: Array.isArray(userAccessEntries)
      ? userAccessEntries.some((entry: any) => entry?.name === 'super_admin' || entry?.id === 'super_admin')
      : false
  };

  const guildSectionContent = currentGuildId ? (
    <div>
      <div style={{ marginBottom: 8 }}>
        <strong>Guild:</strong> {guildDetails?.name || guildName || 'Unknown'} ({currentGuildId || 'no guild'})
      </div>
      <div style={{ marginBottom: 8 }}>
        <strong>User Rank ID:</strong> {userRankId || 'n/a'}
      </div>
      <div style={{ marginBottom: 8 }}>
        <strong>Access Levels:</strong>
        <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'monospace', fontSize: '0.85rem' }}>
          {JSON.stringify(userAccessEntries || [], null, 2)}
        </pre>
      </div>
      <div style={{ marginBottom: 8 }}>
        <strong>UserAccess Entry:</strong>
        <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'monospace', fontSize: '0.85rem' }}>
          {JSON.stringify(guildUserEntry || {}, null, 2)}
        </pre>
      </div>
      <div style={{ marginBottom: 8 }}>
        <strong>Flags:</strong>
        <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'monospace', fontSize: '0.85rem' }}>
          {JSON.stringify(guildFlags, null, 2)}
        </pre>
      </div>
      <div style={{ marginBottom: 8 }}>
        <strong>Preferences JSON:</strong>
        <div style={{ fontFamily: 'monospace', fontSize: '0.75rem', background: '#0B1120', padding: '8px', borderRadius: 4, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
          {preferencesRaw || 'Unavailable'}
        </div>
      </div>
      {guildDetails && (
        <details style={{ marginTop: 8 }}>
          <summary style={{ cursor: 'pointer' }}>Guild Raw Payload</summary>
          <pre style={{ marginTop: 8, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'monospace', fontSize: '0.8rem' }}>
            {JSON.stringify(guildDetails, null, 2)}
          </pre>
        </details>
      )}
    </div>
  ) : (
    <div>No active guild selected.</div>
  );

  const contextSectionContent = useMemo(() => {
    if (adminContext === 'dashboard') {
      const history = apiDebugState.requestHistory.slice(0, 10);
      const refreshEvents = apiDebugState.tokenRefreshEvents.slice(0, 10);

      return (
        <div>
          <div style={{ marginBottom: 12 }}>
            <strong>API Request History (latest first)</strong>
            {history.length === 0 ? (
              <div style={{ marginTop: 4 }}>No requests captured.</div>
            ) : (
              <div style={{ marginTop: 8, maxHeight: 180, overflowY: 'auto' }}>
                {history.map((entry: ApiRequestLog) => (
                  <pre key={entry.id} style={{
                    background: '#0B1120',
                    padding: '8px',
                    borderRadius: 4,
                    marginBottom: 8,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    fontFamily: 'monospace',
                    fontSize: '0.8rem'
                  }}>
                    {JSON.stringify(entry, null, 2)}
                  </pre>
                ))}
              </div>
            )}
          </div>
          <div style={{ marginBottom: 12 }}>
            <strong>Token Refresh Events</strong>
            {refreshEvents.length === 0 ? (
              <div style={{ marginTop: 4 }}>No refresh attempts recorded.</div>
            ) : (
              <div style={{ marginTop: 8, maxHeight: 140, overflowY: 'auto' }}>
                {refreshEvents.map((event) => (
                  <pre key={event.id} style={{
                    background: '#0B1120',
                    padding: '8px',
                    borderRadius: 4,
                    marginBottom: 8,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    fontFamily: 'monospace',
                    fontSize: '0.8rem'
                  }}>
                    {JSON.stringify(event, null, 2)}
                  </pre>
                ))}
              </div>
            )}
          </div>
          <div>
            <strong>Authentication Context Snapshot</strong>
            <pre style={{
              marginTop: 8,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              fontFamily: 'monospace',
              fontSize: '0.8rem',
              background: '#0B1120',
              padding: '8px',
              borderRadius: 4
            }}>
              {JSON.stringify({
                user: authSnapshot.user,
                token: authSnapshot.token,
                refreshToken: authSnapshot.refreshToken,
                permissionCache: authSnapshot.permissionCache
              }, null, 2)}
            </pre>
          </div>
        </div>
      );
    }

    if (!adminContext) {
      return <div>No admin context detected.</div>;
    }

    if (contextLoading) {
      return <div>Loading raw context data…</div>;
    }

    if (contextError) {
      return <div style={{ color: '#FCA5A5' }}>Error: {contextError}</div>;
    }

    return (
      <pre style={{
        margin: 0,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        fontFamily: 'monospace',
        fontSize: '0.8rem',
        maxHeight: 260,
        overflowY: 'auto',
        background: '#0B1120',
        padding: '8px',
        borderRadius: 4
      }}>
        {JSON.stringify(contextData, null, 2)}
      </pre>
    );
  }, [adminContext, apiDebugState.requestHistory, apiDebugState.tokenRefreshEvents, authSnapshot, contextData, contextError, contextLoading]);

  const overlayContainerStyle: CSSProperties = {
    position: 'fixed',
    top: position.y,
    left: position.x,
    width: size.width,
    height: isMinimized ? 'auto' : size.height,
    minWidth: MIN_WIDTH,
    background: 'rgba(17, 24, 39, 0.92)',
    color: '#F9FAFB',
    borderRadius: 12,
    boxShadow: '0 25px 50px rgba(0, 0, 0, 0.4)',
    backdropFilter: 'blur(12px)',
    zIndex: 9999,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    border: '1px solid rgba(59, 130, 246, 0.35)'
  };

  const headerStyle: CSSProperties = {
    cursor: isMinimized ? 'default' : 'move',
    background: 'rgba(30, 41, 59, 0.9)',
    padding: '10px 14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    userSelect: 'none',
    borderBottom: '1px solid rgba(59, 130, 246, 0.25)'
  };

  const headerTitleStyle: CSSProperties = {
    fontWeight: 600,
    letterSpacing: '0.03em',
    fontSize: '0.95rem'
  };

  const actionButtonStyle: CSSProperties = {
    background: 'transparent',
    border: '1px solid rgba(148, 163, 184, 0.4)',
    color: '#E5E7EB',
    borderRadius: 6,
    padding: '4px 8px',
    fontSize: '0.75rem',
    cursor: 'pointer'
  };

  const sectionContainerStyle: CSSProperties = {
    border: '1px solid rgba(59, 130, 246, 0.2)',
    borderRadius: 10,
    marginBottom: 12,
    background: 'rgba(15, 23, 42, 0.85)'
  };

  const sectionHeaderStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 12px',
    cursor: 'pointer',
    borderBottom: '1px solid rgba(59, 130, 246, 0.15)'
  };

  const sectionBodyStyle: CSSProperties = {
    padding: '12px',
    fontSize: '0.85rem'
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div style={overlayContainerStyle}>
      <div
        style={headerStyle}
        onMouseDown={handleDragStart}
      >
        <div style={headerTitleStyle}>
          SphereConnect Debug Overlay
          <div style={{ fontSize: '0.7rem', color: '#93C5FD' }}>Ctrl + D to toggle</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            style={actionButtonStyle}
            onClick={(event) => {
              event.stopPropagation();
              setIsMinimized((prev) => !prev);
            }}
          >
            {isMinimized ? 'Restore' : 'Minimize'}
          </button>
          <button
            style={{ ...actionButtonStyle, borderColor: 'rgba(248, 113, 113, 0.5)', color: '#FCA5A5' }}
            onClick={(event) => {
              event.stopPropagation();
              setIsVisible(false);
            }}
          >
            Close
          </button>
        </div>
      </div>

      {!isMinimized && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
          <div style={sectionContainerStyle}>
            <div style={sectionHeaderStyle} onClick={() => toggleSection('general')}>
              <span>General</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  style={actionButtonStyle}
                  onClick={(event) => {
                    event.stopPropagation();
                    refreshAuthSnapshot();
                  }}
                >
                  Refresh
                </button>
                <span>{collapsedSections['general'] ? '+' : '−'}</span>
              </div>
            </div>
            {!collapsedSections['general'] && (
              <div style={sectionBodyStyle}>
                {generalSectionContent}
              </div>
            )}
          </div>

          <div style={sectionContainerStyle}>
            <div style={sectionHeaderStyle} onClick={() => toggleSection('guild')}>
              <span>Guild State</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  style={actionButtonStyle}
                  onClick={(event) => {
                    event.stopPropagation();
                    fetchGuildData();
                  }}
                >
                  Refresh
                </button>
                <span>{guildLoading ? '…' : collapsedSections['guild'] ? '+' : '−'}</span>
              </div>
            </div>
            {!collapsedSections['guild'] && (
              <div style={sectionBodyStyle}>
                {guildError && (
                  <div style={{ color: '#FCA5A5', marginBottom: 8 }}>Error: {guildError}</div>
                )}
                {guildFetchedAt && (
                  <div style={{ fontSize: '0.7rem', color: '#9CA3AF', marginBottom: 8 }}>
                    Fetched: {formatTimestamp(guildFetchedAt)}
                  </div>
                )}
                {guildSectionContent}
              </div>
            )}
          </div>

          <div style={sectionContainerStyle}>
            <div style={sectionHeaderStyle} onClick={() => toggleSection('context')}>
              <span>Context ({adminContext || 'none'})</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {adminContext && adminContext !== 'dashboard' && (
                  <button
                    style={actionButtonStyle}
                    onClick={(event) => {
                      event.stopPropagation();
                      fetchContextData();
                    }}
                  >
                    Refresh
                  </button>
                )}
                <span>{collapsedSections['context'] ? '+' : '−'}</span>
              </div>
            </div>
            {!collapsedSections['context'] && (
              <div style={sectionBodyStyle}>
                {contextFetchedAt && adminContext && (
                  <div style={{ fontSize: '0.7rem', color: '#9CA3AF', marginBottom: 8 }}>
                    Fetched: {formatTimestamp(contextFetchedAt)}
                  </div>
                )}
                {contextSectionContent}
              </div>
            )}
          </div>
        </div>
      )}

      {!isMinimized && (
        <div
          onMouseDown={handleResizeStart}
          style={{
            position: 'absolute',
            right: 4,
            bottom: 4,
            width: RESIZE_HANDLE_SIZE,
            height: RESIZE_HANDLE_SIZE,
            cursor: 'nwse-resize',
            background: 'rgba(96, 165, 250, 0.35)',
            borderRadius: 4
          }}
        />
      )}
    </div>
  );
};

const DebugOverlay: React.FC = () => {
  if (!DEBUG_OVERLAY_ENABLED) {
    return null;
  }

  return <DebugOverlayInner />;
};

export default DebugOverlay;
