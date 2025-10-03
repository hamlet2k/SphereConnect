export interface ApiErrorInfo {
  status?: number;
  detail?: string;
}

export const parseApiError = (error: unknown): ApiErrorInfo => {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { status?: number; data?: any } }).response;
    if (response) {
      const detail = (response.data as { detail?: string } | undefined)?.detail;
      return {
        status: response.status,
        detail
      };
    }
  }
  return {};
};
