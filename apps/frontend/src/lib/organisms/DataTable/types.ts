import type { ReactNode } from 'react';

export type SortingState = Array<{ id: string; desc: boolean }>;

export interface DataTableColumn<TRow> {
  id: string;
  header: ReactNode;
  cell: (row: TRow) => ReactNode;
  width?: number | string;
  minWidth?: number | string;
  maxWidth?: number | string;
  enableSorting?: boolean;
  mobile?: 'show' | 'hide' | 'aside';
}
