export type PageItem = number | 'gap';

export function getPageItems(current: number, totalPages: number): PageItem[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const start = Math.max(2, Math.min(current - 1, totalPages - 4));
  const end = Math.min(totalPages - 1, Math.max(current + 1, 5));

  const items: PageItem[] = [1];
  if (start > 2) items.push('gap');
  for (let page = start; page <= end; page++) items.push(page);
  if (end < totalPages - 1) items.push('gap');
  items.push(totalPages);
  return items;
}
