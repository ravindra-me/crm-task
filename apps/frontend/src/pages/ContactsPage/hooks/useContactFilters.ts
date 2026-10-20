import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import type { SortingState } from '@/lib';
import type { ContactFilters, SortField, SortOrder } from '@/types/contact';

type SortChoice = `${SortField}:${SortOrder}`;

export const SORT_OPTIONS: ReadonlyArray<{ value: SortChoice; label: string }> = [
  { value: 'created_at:desc', label: 'Newest first' },
  { value: 'created_at:asc', label: 'Oldest first' },
  { value: 'name:asc', label: 'Name (A–Z)' },
  { value: 'name:desc', label: 'Name (Z–A)' },
];

const SORT_FIELDS: SortField[] = ['name', 'created_at'];
const SORT_ORDERS: SortOrder[] = ['asc', 'desc'];
const PAGE_SIZES = [10, 25, 50, 100];

export const DEFAULT_FILTERS: ContactFilters = {
  search: '',
  company: '',
  tagIds: [],
  sortBy: 'created_at',
  sortOrder: 'desc',
  page: 1,
  pageSize: 10,
};

function isSortField(value: string | null | undefined): value is SortField {
  return SORT_FIELDS.some((field) => field === value);
}

function isSortOrder(value: string | null | undefined): value is SortOrder {
  return SORT_ORDERS.some((order) => order === value);
}

export function parseFilters(params: URLSearchParams): ContactFilters {
  const sortBy = params.get('sortBy');
  const sortOrder = params.get('sortOrder');
  const page = Number(params.get('page'));
  const pageSize = Number(params.get('pageSize'));

  return {
    search: params.get('search') ?? '',
    company: params.get('company') ?? '',
    tagIds: params
      .getAll('tag')
      .map(Number)
      .filter((id) => Number.isInteger(id) && id > 0),
    sortBy: isSortField(sortBy) ? sortBy : DEFAULT_FILTERS.sortBy,
    sortOrder: isSortOrder(sortOrder) ? sortOrder : DEFAULT_FILTERS.sortOrder,
    page: Number.isInteger(page) && page > 0 ? page : DEFAULT_FILTERS.page,
    pageSize: PAGE_SIZES.includes(pageSize) ? pageSize : DEFAULT_FILTERS.pageSize,
  };
}

export function toSearchParams(filters: ContactFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.company) params.set('company', filters.company);
  filters.tagIds.forEach((id) => params.append('tag', String(id)));
  const isDefaultSort =
    filters.sortBy === DEFAULT_FILTERS.sortBy && filters.sortOrder === DEFAULT_FILTERS.sortOrder;
  if (!isDefaultSort) {
    params.set('sortBy', filters.sortBy);
    params.set('sortOrder', filters.sortOrder);
  }
  if (filters.page !== DEFAULT_FILTERS.page) params.set('page', String(filters.page));
  if (filters.pageSize !== DEFAULT_FILTERS.pageSize) {
    params.set('pageSize', String(filters.pageSize));
  }
  return params;
}

export function toApiParams(filters: ContactFilters) {
  return {
    search: filters.search,
    company: filters.company,
    tag_ids: filters.tagIds,
    sort_by: filters.sortBy,
    sort_order: filters.sortOrder,
    page: filters.page,
    page_size: filters.pageSize,
  };
}

export function toSortChoice(filters: ContactFilters): SortChoice {
  return `${filters.sortBy}:${filters.sortOrder}`;
}

export function fromSortChoice(choice: SortChoice): Pick<ContactFilters, 'sortBy' | 'sortOrder'> {
  const [sortBy, sortOrder] = choice.split(':');
  return {
    sortBy: isSortField(sortBy) ? sortBy : DEFAULT_FILTERS.sortBy,
    sortOrder: isSortOrder(sortOrder) ? sortOrder : DEFAULT_FILTERS.sortOrder,
  };
}

export function toSortingState(filters: ContactFilters): SortingState {
  return [{ id: filters.sortBy, desc: filters.sortOrder === 'desc' }];
}

export function fromSortingState(
  sorting: SortingState,
): Pick<ContactFilters, 'sortBy' | 'sortOrder'> {
  const first = sorting[0];
  if (!first || !isSortField(first.id)) {
    return { sortBy: DEFAULT_FILTERS.sortBy, sortOrder: DEFAULT_FILTERS.sortOrder };
  }
  return { sortBy: first.id, sortOrder: first.desc ? 'desc' : 'asc' };
}

export function hasActiveFilters(filters: ContactFilters): boolean {
  return Boolean(filters.search.trim() || filters.company.trim() || filters.tagIds.length);
}

export function useContactFilters() {
  const [params, setParams] = useSearchParams();
  const filters = useMemo(() => parseFilters(params), [params]);

  const updateFilters = useCallback(
    (patch: Partial<ContactFilters>) => {
      const replace = 'search' in patch || 'company' in patch;
      setParams(
        (current) => {
          const next = { ...parseFilters(current), page: 1, ...patch };
          return toSearchParams(next);
        },
        { replace },
      );
    },
    [setParams],
  );

  const resetFilters = useCallback(() => {
    setParams((current) => {
      const { sortBy, sortOrder, pageSize } = parseFilters(current);
      return toSearchParams({ ...DEFAULT_FILTERS, sortBy, sortOrder, pageSize });
    });
  }, [setParams]);

  return { filters, updateFilters, resetFilters };
}
