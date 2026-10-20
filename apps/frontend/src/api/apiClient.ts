import type { AxiosInstance, AxiosRequestConfig } from 'axios';
import { axiosInstance } from './axiosInstance';

export { ApiError, errorMessage, type FieldError } from './apiError';

type RequestConfig = Pick<AxiosRequestConfig, 'params' | 'signal' | 'headers'>;

function withCleanParams(config: RequestConfig = {}): RequestConfig {
  if (!config.params) return config;
  const params = Object.fromEntries(
    Object.entries(config.params as Record<string, unknown>).filter(
      ([, value]) => value !== undefined && value !== null && value !== '',
    ),
  );
  return { ...config, params };
}

export class Api {
  private readonly client: AxiosInstance;

  constructor(client: AxiosInstance) {
    this.client = client;
  }

  async get<TResponse>(url: string, config?: RequestConfig): Promise<TResponse> {
    const response = await this.client.get<TResponse>(url, withCleanParams(config));
    return response.data;
  }

  async post<TResponse>(url: string, body?: unknown, config?: RequestConfig): Promise<TResponse> {
    const response = await this.client.post<TResponse>(url, body, withCleanParams(config));
    return response.data;
  }

  async put<TResponse>(url: string, body?: unknown, config?: RequestConfig): Promise<TResponse> {
    const response = await this.client.put<TResponse>(url, body, withCleanParams(config));
    return response.data;
  }

  async patch<TResponse>(url: string, body?: unknown, config?: RequestConfig): Promise<TResponse> {
    const response = await this.client.patch<TResponse>(url, body, withCleanParams(config));
    return response.data;
  }

  async delete<TResponse>(url: string, config?: RequestConfig): Promise<TResponse> {
    const response = await this.client.delete<TResponse>(url, withCleanParams(config));
    return response.data;
  }
}

export const api = new Api(axiosInstance);
