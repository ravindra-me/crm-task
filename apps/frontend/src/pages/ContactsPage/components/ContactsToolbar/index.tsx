import { Button, Icon, SelectField, Tooltip } from '@/lib';
import {
  fromSortChoice,
  hasActiveFilters,
  SORT_OPTIONS,
  toSortChoice,
} from '../../hooks/useContactFilters';
import type { ContactFilters } from '@/types/contact';
import { DebouncedTextField } from '../DebouncedTextField';
import { TagFilter } from '../TagFilter';
import styles from './style.module.css';

interface ContactsToolbarProps {
  filters: ContactFilters;
  onChange: (patch: Partial<ContactFilters>) => void;
  onReset: () => void;
  selectedCount: number;
  onAddTags: () => void;
}

export function ContactsToolbar({
  filters,
  onChange,
  onReset,
  selectedCount,
  onAddTags,
}: ContactsToolbarProps) {
  const canAddTags = selectedCount > 0;

  return (
    <div className={styles.toolbar} role="search">
      <DebouncedTextField
        label="Search contacts"
        hideLabel
        type="search"
        icon="search"
        placeholder="Search by name, email or phone"
        maxLength={100}
        value={filters.search}
        onDebouncedChange={(search) => onChange({ search })}
      />

      <div className={styles.row}>
        <DebouncedTextField
          className={styles.company}
          label="Filter by company"
          hideLabel
          type="search"
          placeholder="Company"
          maxLength={200}
          value={filters.company}
          onDebouncedChange={(company) => onChange({ company })}
        />
        <TagFilter selected={filters.tagIds} onChange={(tagIds) => onChange({ tagIds })} />
        <SelectField
          className={styles.sortOnMobile}
          label="Sort by"
          hideLabel
          value={toSortChoice(filters)}
          options={SORT_OPTIONS}
          onChange={(choice) => onChange(fromSortChoice(choice))}
        />
        {hasActiveFilters(filters) && (
          <Button variant="ghost" onClick={onReset}>
            Clear filters
          </Button>
        )}

        <div className={styles.actions}>
          <Tooltip content="Select contacts in the table to add tags to them" active={!canAddTags}>
            {(triggerProps) => (
              <Button
                variant="primary"
                aria-disabled={!canAddTags}
                onClick={canAddTags ? onAddTags : undefined}
                {...triggerProps}
              >
                <Icon name="tag" />
                Add tags{canAddTags && ` (${selectedCount})`}
              </Button>
            )}
          </Tooltip>
        </div>
      </div>
    </div>
  );
}
