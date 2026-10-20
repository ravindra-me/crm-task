import {
  useQuery,
  useQueryClient,
  type QueryKey,
  type UseQueryOptions,
} from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { api, type ApiError } from '@/api/apiClient';

type QueryParams = Record<string, unknown>;

export interface UseFetchOptions<TData> extends Omit<
  UseQueryOptions<TData, ApiError>,
  'queryKey' | 'queryFn' | 'enabled'
> {
  url: string | null;
  params?: QueryParams;
  enabled?: boolean;
  enableCancel?: boolean;
  onSuccess?: (data: TData) => void;
  onError?: (error: ApiError) => void;
  queryKey?: QueryKey;
}

function fetchKey(url: string, params?: QueryParams): QueryKey {
  return params ? [url, params] : [url];
}

export function useFetch<TData>({
  url,
  params,
  enabled = true,
  enableCancel = true,
  onSuccess,
  onError,
  queryKey,
  ...queryOptions
}: UseFetchOptions<TData>) {
  const queryClient = useQueryClient();
  const key = queryKey ?? fetchKey(url ?? '', params);

  const query = useQuery<TData, ApiError>({
    queryKey: key,
    queryFn: ({ signal }) =>
      api.get<TData>(url ?? '', { params, signal: enableCancel ? signal : undefined }),
    enabled: url !== null && enabled,
    ...queryOptions,
  });

  const callbacks = useRef({ onSuccess, onError });
  useEffect(() => {
    callbacks.current = { onSuccess, onError };
  });

  useEffect(() => {
    if (query.isSuccess) callbacks.current.onSuccess?.(query.data);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run only when new data arrives
  }, [query.dataUpdatedAt]);

  useEffect(() => {
    if (query.error) callbacks.current.onError?.(query.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run only when a new error arrives
  }, [query.errorUpdatedAt]);

  function cancel() {
    void queryClient.cancelQueries({ queryKey: key });
  }

  return { ...query, cancel };
}
