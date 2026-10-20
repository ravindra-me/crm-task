import { getPageItems } from '@/utils/pagination';
import { Button } from '@/lib/atoms/Button';
import { Icon } from '@/lib/atoms/Icon';
import { SelectField } from '@/lib/molecules/SelectField';
import styles from './style.module.css';

const PAGE_SIZES = [
  { value: '10', label: '10 / page' },
  { value: '25', label: '25 / page' },
  { value: '50', label: '50 / page' },
  { value: '100', label: '100 / page' },
] as const;

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  disabled?: boolean;
}

const numberFormat = new Intl.NumberFormat();

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  disabled,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <nav className={styles.pagination} aria-label="Pagination">
      <p className={styles.summary}>
        Showing <strong>{numberFormat.format(from)}</strong>–
        <strong>{numberFormat.format(to)}</strong> of <strong>{numberFormat.format(total)}</strong>
      </p>

      <div className={styles.controls}>
        <SelectField
          label="Rows per page"
          hideLabel
          value={String(pageSize) as (typeof PAGE_SIZES)[number]['value']}
          options={PAGE_SIZES}
          onChange={(value) => onPageSizeChange(Number(value))}
          disabled={disabled}
        />

        <ul className={styles.pages}>
          <li>
            <Button
              size="sm"
              iconOnly
              aria-label="Previous page"
              disabled={disabled || page <= 1}
              onClick={() => onPageChange(page - 1)}
            >
              <Icon name="chevron-left" />
            </Button>
          </li>
          {getPageItems(page, totalPages).map((item, index) =>
            item === 'gap' ? (
              <li key={`gap-${index}`} className={`${styles.gap} ${styles.numbers}`} aria-hidden>
                …
              </li>
            ) : (
              <li key={item} className={styles.numbers}>
                <Button
                  size="sm"
                  variant={item === page ? 'secondary' : 'ghost'}
                  className={item === page ? `${styles.page} ${styles.current}` : styles.page}
                  aria-current={item === page ? 'page' : undefined}
                  aria-label={`Page ${item}`}
                  disabled={disabled}
                  onClick={() => onPageChange(item)}
                >
                  {item}
                </Button>
              </li>
            ),
          )}
          <li className={styles.pageLabel}>
            {page} / {totalPages}
          </li>
          <li>
            <Button
              size="sm"
              iconOnly
              aria-label="Next page"
              disabled={disabled || page >= totalPages}
              onClick={() => onPageChange(page + 1)}
            >
              <Icon name="chevron-right" />
            </Button>
          </li>
        </ul>
      </div>
    </nav>
  );
}
