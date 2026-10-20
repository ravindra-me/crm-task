import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useFetch } from './useFetch';

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn(() => Promise.resolve(Response.json([{ id: 1, name: 'VIP' }])));
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => vi.unstubAllGlobals());

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

function lastRequest() {
  return fetchMock.mock.calls.at(-1)?.[0] as Request;
}

describe('useFetch', () => {
  it('fetches the url with its params and calls onSuccess once', async () => {
    const onSuccess = vi.fn();
    const { result } = renderHook(
      () => useFetch({ url: '/tags', params: { search: 'v', empty: '' }, onSuccess }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(lastRequest().url).toMatch(/\/api\/v1\/tags\?search=v$/);
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(onSuccess).toHaveBeenCalledWith([{ id: 1, name: 'VIP' }]);
  });

  it('calls onError with the ApiError', async () => {
    fetchMock.mockResolvedValue(
      Response.json(
        { error: { code: 'not_found', message: 'Contact not found' } },
        { status: 404 },
      ),
    );
    const onError = vi.fn();
    renderHook(() => useFetch({ url: '/contacts/9', onError }), { wrapper });

    await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
    expect(onError.mock.calls[0]?.[0]).toMatchObject({ status: 404, code: 'not_found' });
  });

  it('waits while enabled is false or the url is null', async () => {
    renderHook(() => useFetch({ url: '/tags', enabled: false }), { wrapper });
    renderHook(() => useFetch({ url: null }), { wrapper });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('cancel() stops the request in flight', async () => {
    fetchMock.mockImplementation(() => new Promise(() => {}));
    const { result } = renderHook(() => useFetch({ url: '/tags' }), { wrapper });
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());

    act(() => result.current.cancel());

    expect(lastRequest().signal.aborted).toBe(true);
  });

  it('with enableCancel off the request is never aborted', async () => {
    fetchMock.mockImplementation(() => new Promise(() => {}));
    const { result } = renderHook(() => useFetch({ url: '/tags', enableCancel: false }), {
      wrapper,
    });
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());

    act(() => result.current.cancel());

    expect(lastRequest().signal.aborted).toBe(false);
  });
});
