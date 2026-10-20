import { MutationCache, QueryClient } from '@tanstack/react-query';
import { ApiError } from '@/api/apiClient';

const MAX_RETRIES = 2;

export function createQueryClient() {
  const queryClient: QueryClient = new QueryClient({
    mutationCache: new MutationCache({
      onSettled: () => queryClient.invalidateQueries(),
    }),
    defaultOptions: {
      queries: {
        retry: (failureCount, error) => {
          if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
          return failureCount < MAX_RETRIES;
        },
      },
      mutations: { retry: false },
    },
  });
  return queryClient;
}
