import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios';

export interface ApiRequestLog {
  id: number;
  method: string;
  url: string;
  status?: number;
  statusText?: string;
  timestamp: number;
  durationMs?: number;
  errorMessage?: string;
}

export interface TokenRefreshEvent {
  id: number;
  timestamp: number;
  status: 'success' | 'failure';
  message?: string;
}

export interface ApiDebugState {
  lastRequest: ApiRequestLog | null;
  lastResponse: ApiRequestLog | null;
  requestHistory: ApiRequestLog[];
  tokenRefreshEvents: TokenRefreshEvent[];
}

const apiDebugState: ApiDebugState = {
  lastRequest: null,
  lastResponse: null,
  requestHistory: [],
  tokenRefreshEvents: []
};

type DebugSubscriber = () => void;

const debugSubscribers = new Set<DebugSubscriber>();

const notifyDebugSubscribers = () => {
  debugSubscribers.forEach((listener) => {
    try {
      listener();
    } catch (err) {
      // Swallow subscriber errors to avoid breaking API requests in production.
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.warn('Debug overlay subscriber error', err);
      }
    }
  });
};

export const apiDebugStore = {
  subscribe(listener: DebugSubscriber) {
    debugSubscribers.add(listener);
    return () => {
      debugSubscribers.delete(listener);
    };
  },
  getState(): ApiDebugState {
    return apiDebugState;
  }
};

interface DebuggableAxiosConfig extends InternalAxiosRequestConfig {
  metadata?: {
    requestLog?: ApiRequestLog;
  };
  _retry?: boolean;
}

const buildRequestUrl = (config: InternalAxiosRequestConfig) => {
  const requestUrl = config.url || '';
  if (!config.baseURL) {
    return requestUrl;
  }
  if (/^https?:/i.test(requestUrl)) {
    return requestUrl;
  }
  return `${config.baseURL}${requestUrl}`;
};

let requestCounter = 0;
let tokenRefreshCounter = 0;

const api: AxiosInstance = axios.create({
  baseURL: 'http://localhost:8000/api',
});

// Request interceptor to attach token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers = config.headers || {};
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    const debugConfig = config as DebuggableAxiosConfig;
    const requestLog: ApiRequestLog = {
      id: ++requestCounter,
      method: (config.method || 'GET').toUpperCase(),
      url: buildRequestUrl(config),
      timestamp: Date.now()
    };

    debugConfig.metadata = {
      ...(debugConfig.metadata || {}),
      requestLog
    };

    apiDebugState.lastRequest = requestLog;
    notifyDebugSubscribers();

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for token refresh
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (error?: any) => void;
  config: InternalAxiosRequestConfig;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject, config }) => {
    if (error) {
      reject(error);
    } else {
      if (config.headers) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }
      resolve(api(config));
    }
  });

  failedQueue = [];
};

api.interceptors.response.use(
  (response: AxiosResponse) => {
    const debugConfig = response.config as DebuggableAxiosConfig;
    const requestLog = debugConfig.metadata?.requestLog;
    if (requestLog) {
      const completedLog: ApiRequestLog = {
        ...requestLog,
        status: response.status,
        statusText: response.statusText,
        durationMs: Date.now() - requestLog.timestamp
      };

      debugConfig.metadata = {
        ...(debugConfig.metadata || {}),
        requestLog: completedLog
      };

      apiDebugState.lastResponse = completedLog;
      apiDebugState.requestHistory = [completedLog, ...apiDebugState.requestHistory].slice(0, 20);
      notifyDebugSubscribers();
    }

    return response;
  },
  async (error) => {
    const originalRequest = (error.config || {}) as DebuggableAxiosConfig;

    const finalizeWithErrorLog = () => {
      const baseConfig = (originalRequest as InternalAxiosRequestConfig) || error.config;
      const requestLog = originalRequest?.metadata?.requestLog || (baseConfig
        ? {
            id: ++requestCounter,
            method: (baseConfig.method || 'GET').toUpperCase(),
            url: buildRequestUrl(baseConfig),
            timestamp: Date.now()
          }
        : null);

      if (requestLog) {
        const erroredLog: ApiRequestLog = {
          ...requestLog,
          status: error.response?.status,
          statusText: error.response?.statusText,
          durationMs: Date.now() - requestLog.timestamp,
          errorMessage: error.message
        };

        originalRequest.metadata = {
          ...(originalRequest.metadata || {}),
          requestLog: erroredLog
        };

        apiDebugState.lastResponse = erroredLog;
        apiDebugState.requestHistory = [erroredLog, ...apiDebugState.requestHistory].slice(0, 20);
        notifyDebugSubscribers();
      }
    };

    if (error.response?.status === 401 && !originalRequest._retry) {
      finalizeWithErrorLog();
      if (isRefreshing) {
        // If refresh is in progress, queue the request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject, config: originalRequest });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
        // No refresh token, redirect to login
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const response = await axios.post('http://localhost:8000/api/auth/refresh', {
          refresh_token: refreshToken,
        });

        const { access_token, refresh_token: newRefreshToken } = response.data;

        // Update tokens
        localStorage.setItem('token', access_token);
        if (newRefreshToken) {
          localStorage.setItem('refresh_token', newRefreshToken);
        }

        // Retry original request
        if (originalRequest.headers) {
          originalRequest.headers['Authorization'] = `Bearer ${access_token}`;
        }

        // Process queued requests
        processQueue(null, access_token);

        const refreshEvent: TokenRefreshEvent = {
          id: ++tokenRefreshCounter,
          timestamp: Date.now(),
          status: 'success',
          message: 'Access token refreshed via /auth/refresh'
        };
        apiDebugState.tokenRefreshEvents = [refreshEvent, ...apiDebugState.tokenRefreshEvents].slice(0, 20);
        notifyDebugSubscribers();

        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, clear tokens and redirect
        localStorage.clear();
        window.location.href = '/login';
        processQueue(refreshError, null);

        const refreshEvent: TokenRefreshEvent = {
          id: ++tokenRefreshCounter,
          timestamp: Date.now(),
          status: 'failure',
          message: refreshError instanceof Error ? refreshError.message : 'Token refresh failed'
        };
        apiDebugState.tokenRefreshEvents = [refreshEvent, ...apiDebugState.tokenRefreshEvents].slice(0, 20);
        notifyDebugSubscribers();

        finalizeWithErrorLog();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    finalizeWithErrorLog();
    return Promise.reject(error);
  }
);

export default api;