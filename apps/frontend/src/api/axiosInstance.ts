import axios, { AxiosError } from 'axios';
import { API_BASE_URL, REQUEST_TIMEOUT_MS } from '@/utils/constants';
import { ApiError } from './apiError';

interface BackendErrorBody {
  error?: { code?: unknown; message?: unknown; details?: unknown };
}

export const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: REQUEST_TIMEOUT_MS,
  adapter: 'fetch',
  paramsSerializer: { indexes: null },
});

function toApiError(error: AxiosError<BackendErrorBody>): ApiError {
  const body = error.response?.data?.error;
  if (error.response && body && typeof body.code === 'string') {
    return new ApiError(
      error.response.status,
      body.code,
      typeof body.message === 'string' ? body.message : 'Request failed',
      body.details,
    );
  }
  if (error.response) {
    return new ApiError(
      error.response.status,
      'http_error',
      `Request failed (${error.response.status})`,
    );
  }
  if (error.code === AxiosError.ECONNABORTED || error.code === AxiosError.ETIMEDOUT) {
    return new ApiError(0, 'timeout', 'The server took too long to respond. Please try again.');
  }
  return new ApiError(0, 'network_error', 'Could not reach the server. Check your connection.');
}

axiosInstance.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isCancel(error) || !(error instanceof AxiosError)) return Promise.reject(error);
    return Promise.reject(toApiError(error));
  },
);
