const DEFAULT_TIMEOUT_MS = 15_000;

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';

export const REQUEST_TIMEOUT_MS =
  Number(import.meta.env.VITE_REQUEST_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS;

export const RECENT_ACTIVITY_LIMIT = 20;
