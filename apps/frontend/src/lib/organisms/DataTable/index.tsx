import type { CSSProperties, ReactNode } from 'react';
import { Icon, type IconName } from '@/lib/atoms/Icon';
import { Skeleton } from '@/lib/atoms/Skeleton';
import { classNames } from '@/utils/classNames';
import { nextSorting, sortDirection } from './sorting';
import type { DataTableColumn, SortingState } from './types';
import styles from './style.module.css';

export type { DataTableColumn, SortingState } from './types';

interface DataTableProps<TRow> {
  label: string;
  columns: DataTableColumn<TRow>[];
  data: TRow[];
  getRowId: (row: TRow) => string | number;
  sorting?: SortingState;
  onSortingChange?: (sorting: SortingState) => void;
  isRowSelected?: (row: TRow) => boolean;
  loading?: boolean;
  refreshing?: boolean;
}

const LOADING_ROWS = 8;
const ARIA_SORT = { asc: 'ascending', desc: 'descending' } as const;
const SORT_ICON: Record<'asc' | 'desc', IconName> = { asc: 'arrow-up', desc: 'arrow-down' };

function columnSize<TRow>(column: DataTableColumn<TRow>): CSSProperties {
  return { width: column.width, minWidth: column.minWidth, maxWidth: column.maxWidth };
}

export function DataTable<TRow>({
  label,
  columns,
  data,
  getRowId,
  sorting = [],
  onSortingChange,
  isRowSelected,
  loading = false,
  refreshing = false,
}: DataTableProps<TRow>) {
  const stackedCells = columns.filter((column) => column.mobile !== 'hide').length - 1;

  function renderHeader(column: DataTableColumn<TRow>) {
    if (!column.enableSorting || !onSortingChange) {
      return (
        <th key={column.id} scope="col" style={columnSize(column)} className={styles.headerCell}>
          {column.header}
        </th>
      );
    }

    const direction = sortDirection(sorting, column.id);
    return (
      <th
        key={column.id}
        scope="col"
        style={columnSize(column)}
        aria-sort={direction ? ARIA_SORT[direction] : 'none'}
        className={classNames(styles.headerCell, direction && styles.sorted)}
      >
        <button
          type="button"
          className={styles.sortButton}
          onClick={() => onSortingChange(nextSorting(sorting, column.id))}
        >
          {column.header}
          <Icon
            name={direction ? SORT_ICON[direction] : 'arrows-up-down'}
            size={14}
            className={styles.sortIcon}
          />
        </button>
      </th>
    );
  }

  function renderCell(column: DataTableColumn<TRow>, content: ReactNode) {
    const mobile = column.mobile ?? 'show';
    const style = columnSize(column);
    if (mobile === 'aside') style.gridRow = `1 / span ${Math.max(stackedCells, 1)}`;

    return (
      <td key={column.id} data-mobile={mobile} style={style} className={styles.cell}>
        {content}
      </td>
    );
  }

  return (
    <table
      aria-label={label}
      aria-busy={loading || refreshing}
      className={classNames(styles.table, refreshing && styles.refreshing)}
    >
      <thead>
        <tr>{columns.map(renderHeader)}</tr>
      </thead>
      <tbody>
        {loading &&
          Array.from({ length: LOADING_ROWS }, (_, index) => (
            <tr key={index} className={styles.row}>
              {columns.map((column) =>
                renderCell(column, column.mobile === 'aside' ? null : <Skeleton width="70%" />),
              )}
            </tr>
          ))}
        {!loading &&
          data.map((row) => (
            <tr
              key={getRowId(row)}
              className={styles.row}
              data-selected={isRowSelected?.(row) || undefined}
            >
              {columns.map((column) => renderCell(column, column.cell(row)))}
            </tr>
          ))}
      </tbody>
    </table>
  );
}
