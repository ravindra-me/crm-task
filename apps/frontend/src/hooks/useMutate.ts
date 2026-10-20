import { useMutation, type UseMutationOptions } from '@tanstack/react-query';
import axios from 'axios';
import { useRef } from 'react';
import { api, ApiError } from '@/api/apiClient';

export type MutationMethod = 'post' | 'put' | 'patch' | 'delete';

export interface UseMutateOptions<TData, TVariables> extends Omit<
  UseMutationOptions<TData, ApiError, TVariables>,
  'mutationFn'
> {
  method: MutationMethod;
  url: string | ((variables: TVariables) => string);
  body?: (variables: TVariables) => unknown;
  enableCancel?: boolean;
}

export function useMutate<TData, TVariables = void>({
  method,
  url,
  body,
  enableCancel = true,
  ...mutationOptions
}: UseMutateOptions<TData, TVariables>) {
  const controller = useRef<AbortController | null>(null);

  const mutation = useMutation<TData, ApiError, TVariables>({
    mutationFn: async (variables) => {
      const target = typeof url === 'function' ? url(variables) : url;
      controller.current = enableCancel ? new AbortController() : null;
      const config = { signal: controller.current?.signal };

      try {
        if (method === 'delete') return await api.delete<TData>(target, config);
        return await api[method]<TData>(target, body ? body(variables) : variables, config);
      } catch (error) {
        if (axios.isCancel(error)) throw new ApiError(0, 'cancelled', 'The request was cancelled');
        throw error;
      } finally {
        controller.current = null;
      }
    },
    ...mutationOptions,
  });

  function cancel() {
    controller.current?.abort();
  }

  return { ...mutation, cancel };
}
