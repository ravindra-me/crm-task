import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useMutate, type MutationMethod } from './useMutate';

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn(() => Promise.resolve(Response.json({ ok: true })));
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => vi.unstubAllGlobals());

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

async function lastRequest() {
  const [input, init] = fetchMock.mock.calls.at(-1) as [RequestInfo | URL, RequestInit?];
  const request = input instanceof Request ? input : new Request(String(input), init);
  const text = await request.clone().text();
  return { method: request.method, url: request.url, body: text ? JSON.parse(text) : undefined };
}

describe('useMutate', () => {
  it.each<MutationMethod>(['post', 'put', 'patch'])(
    '%s sends the variables as the body',
    async (method) => {
      const { result } = renderHook(
        () => useMutate<unknown, { name: string }>({ method, url: '/tags' }),
        {
          wrapper,
        },
      );

      await act(() => result.current.mutateAsync({ name: 'VIP' }));

      expect(await lastRequest()).toMatchObject({
        method: method.toUpperCase(),
        url: expect.stringMatching(/\/api\/v1\/tags$/),
        body: { name: 'VIP' },
      });
    },
  );

  it('builds the url and body from the variables', async () => {
    const { result } = renderHook(
      () =>
        useMutate<unknown, { contactId: number; name: string }>({
          method: 'post',
          url: ({ contactId }) => `/contacts/${contactId}/tags`,
          body: ({ name }) => ({ name }),
        }),
      { wrapper },
    );

    await act(() => result.current.mutateAsync({ contactId: 7, name: 'Lead' }));

    const request = await lastRequest();
    expect(request.url).toMatch(/\/contacts\/7\/tags$/);
    expect(request.body).toEqual({ name: 'Lead' });
  });

  it('delete sends no body', async () => {
    const { result } = renderHook(
      () =>
        useMutate<unknown, number>({
          method: 'delete',
          url: (tagId) => `/contacts/7/tags/${tagId}`,
        }),
      { wrapper },
    );

    await act(() => result.current.mutateAsync(3));

    expect(await lastRequest()).toMatchObject({
      method: 'DELETE',
      url: expect.stringMatching(/\/contacts\/7\/tags\/3$/),
      body: undefined,
    });
  });

  it('cancel() stops a save and reports it as a "cancelled" error', async () => {
    fetchMock.mockImplementation(
      (input: Request) =>
        new Promise((_, reject) =>
          input.signal.addEventListener('abort', () => reject(new DOMException('', 'AbortError'))),
        ),
    );
    const onError = vi.fn();
    const { result } = renderHook(
      () => useMutate<unknown, { name: string }>({ method: 'post', url: '/tags', onError }),
      { wrapper },
    );

    act(() => result.current.mutate({ name: 'VIP' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    act(() => result.current.cancel());

    await waitFor(() => expect(onError).toHaveBeenCalled());
    expect(onError.mock.calls[0]?.[0]).toMatchObject({ code: 'cancelled' });
  });
});
