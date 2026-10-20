import {
  DEFAULT_FILTERS,
  fromSortChoice,
  fromSortingState,
  parseFilters,
  toApiParams,
  toSearchParams,
  toSortingState,
} from './useContactFilters';

describe('contact filters in the URL', () => {
  it('uses defaults for an empty query string', () => {
    expect(parseFilters(new URLSearchParams())).toEqual(DEFAULT_FILTERS);
  });

  it('ignores values that make no sense', () => {
    const filters = parseFilters(
      new URLSearchParams('sortBy=email&sortOrder=up&page=-3&pageSize=7&tag=abc&tag=4&tag=0'),
    );
    expect(filters).toMatchObject({
      sortBy: 'created_at',
      sortOrder: 'desc',
      page: 1,
      pageSize: 10,
      tagIds: [4],
    });
  });

  it('round-trips and leaves defaults out of the URL', () => {
    const filters = {
      ...DEFAULT_FILTERS,
      search: 'ada',
      tagIds: [1, 2],
      sortBy: 'name' as const,
      sortOrder: 'asc' as const,
      page: 3,
    };
    const params = toSearchParams(filters);
    expect(params.toString()).toBe('search=ada&tag=1&tag=2&sortBy=name&sortOrder=asc&page=3');
    expect(parseFilters(params)).toEqual(filters);
  });

  it('writes both sort values whenever the sort is not the default', () => {
    const filters = { ...DEFAULT_FILTERS, sortBy: 'name' as const };
    expect(toSearchParams(filters).toString()).toBe('sortBy=name&sortOrder=desc');
  });

  it('sends the sort to the API as sort_by and sort_order', () => {
    const filters = { ...DEFAULT_FILTERS, sortBy: 'name' as const, sortOrder: 'asc' as const };
    expect(toApiParams(filters)).toMatchObject({ sort_by: 'name', sort_order: 'asc' });
  });
});

describe('table sorting and the URL sort', () => {
  it('converts both ways', () => {
    expect(toSortingState(DEFAULT_FILTERS)).toEqual([{ id: 'created_at', desc: true }]);
    expect(fromSortingState([{ id: 'name', desc: false }])).toEqual({
      sortBy: 'name',
      sortOrder: 'asc',
    });
    expect(fromSortingState([{ id: 'name', desc: true }])).toEqual({
      sortBy: 'name',
      sortOrder: 'desc',
    });
  });

  it('falls back to the default for columns the API cannot sort by', () => {
    const fallback = { sortBy: DEFAULT_FILTERS.sortBy, sortOrder: DEFAULT_FILTERS.sortOrder };
    expect(fromSortingState([{ id: 'email', desc: false }])).toEqual(fallback);
    expect(fromSortingState([])).toEqual(fallback);
  });

  it('reads the sort dropdown value', () => {
    expect(fromSortChoice('name:desc')).toEqual({ sortBy: 'name', sortOrder: 'desc' });
  });
});
