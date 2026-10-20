import { api, ApiError } from './apiClient';

function mockFetch(response: Response | Error) {
  const fetchMock = vi.fn((_input: RequestInfo | URL, _init?: RequestInit) =>
    response instanceof Error ? Promise.reject(response) : Promise.resolve(response),
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function requestUrl(fetchMock: ReturnType<typeof mockFetch>) {
  const input = fetchMock.mock.calls[0]?.[0];
  return input instanceof Request ? input.url : String(input);
}

afterEach(() => vi.unstubAllGlobals());

describe('api', () => {
  it('sends list params as repeated keys and leaves out empty values', async () => {
    const fetchMock = mockFetch(Response.json([]));

    await api.get('/contacts', {
      params: { search: '', tag_ids: [1, 2], page: 2, company: undefined },
    });

    expect(requestUrl(fetchMock)).toMatch(/\/api\/v1\/contacts\?tag_ids=1&tag_ids=2&page=2$/);
  });

  it('returns the response body', async () => {
    mockFetch(Response.json({ id: 1, name: 'VIP' }));
    await expect(api.post('/tags', { name: 'VIP' })).resolves.toEqual({ id: 1, name: 'VIP' });
  });

  it('turns the backend error format into an ApiError', async () => {
    mockFetch(
      Response.json(
        { error: { code: 'email_taken', message: 'Email in use', details: { field: 'email' } } },
        { status: 409 },
      ),
    );
    await expect(api.patch('/contacts/1', {})).rejects.toMatchObject({
      status: 409,
      code: 'email_taken',
      message: 'Email in use',
    });
  });

  it('handles error responses that are not JSON', async () => {
    mockFetch(new Response('<html>Bad gateway</html>', { status: 502 }));
    const error = await api.get('/contacts').catch((caughtError: unknown) => caughtError);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 502, code: 'http_error' });
  });

  it('reports network failures in plain language', async () => {
    mockFetch(new TypeError('Failed to fetch'));
    await expect(api.get('/contacts')).rejects.toMatchObject({ code: 'network_error' });
  });

  it('exposes field errors from validation responses', () => {
    const error = new ApiError(422, 'validation_error', 'Invalid input', [
      { field: 'email', message: 'Bad email' },
    ]);
    expect(error.fieldErrors).toEqual([{ field: 'email', message: 'Bad email' }]);
  });
});
