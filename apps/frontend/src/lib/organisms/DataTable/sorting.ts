import type { SortingState } from './types';

export function sortDirection(sorting: SortingState, columnId: string): 'asc' | 'desc' | null {
  const current = sorting.find((sort) => sort.id === columnId);
  if (!current) return null;
  return current.desc ? 'desc' : 'asc';
}

export function nextSorting(sorting: SortingState, columnId: string): SortingState {
  const direction = sortDirection(sorting, columnId);
  return [{ id: columnId, desc: direction === 'asc' }];
}
