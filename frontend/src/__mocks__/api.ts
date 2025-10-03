const BASE_URL = 'http://localhost:8000/api';

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';

type FetchOptions = {
  headers?: Record<string, string>;
};

const buildHeaders = (options?: FetchOptions) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers || {})
  };

  try {
    const token = window?.localStorage?.getItem?.('token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  } catch (error) {
    // Ignore if localStorage is unavailable
  }

  return headers;
};

const resolveUrl = (url: string) => {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  if (url.startsWith('/')) {
    return `${BASE_URL}${url}`;
  }
  return `${BASE_URL}/${url}`;
};

const request = async (method: Method, url: string, data?: any, options?: FetchOptions) => {
  const fullUrl = resolveUrl(url);
  const headers = buildHeaders(options);
  const init: RequestInit = {
    method,
    headers
  };

  if (data !== undefined) {
    init.body = typeof data === 'string' ? data : JSON.stringify(data);
  }

  const response = await (global.fetch as jest.Mock)(fullUrl, init);

  if (!response || typeof response.ok === 'undefined') {
    throw new Error('Invalid fetch response');
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const error: any = new Error('Request failed');
    error.response = {
      status: response.status,
      data: errorBody
    };
    throw error;
  }

  const dataBody = await response.json().catch(() => undefined);

  return {
    data: dataBody,
    status: response.status,
    headers: response.headers ?? {},
    config: init
  };
};

const api = {
  get: jest.fn((url: string, options?: FetchOptions) => request('GET', url, undefined, options)),
  post: jest.fn((url: string, data?: any, options?: FetchOptions) => request('POST', url, data, options)),
  patch: jest.fn((url: string, data?: any, options?: FetchOptions) => request('PATCH', url, data, options)),
  delete: jest.fn((url: string, options?: FetchOptions) => request('DELETE', url, undefined, options))
};

export default api;
