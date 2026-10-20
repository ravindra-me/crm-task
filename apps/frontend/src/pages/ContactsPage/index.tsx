import { keepPreviousData } from '@tanstack/react-query';
import { Button, EmptyState, Pagination, type SortingState } from '@/lib';
import { errorMessage } from '@/api/apiClient';
import { useState } from 'react';
import { BulkTagModal } from './components/BulkTagModal';
import { ContactsTable } from './components/ContactsTable';
import { ContactsToolbar } from './components/ContactsToolbar';
import {
  fromSortingState,
  hasActiveFilters,
  toApiParams,
  toSortingState,
  useContactFilters,
} from './hooks/useContactFilters';
import { useSelection } from './hooks/useSelection';
import { endpoints } from '@/api/endpoints';
import { useFetch } from '@/hooks/useFetch';
import type { ContactPage } from '@/types/contact';
import styles from './style.module.css';

const numberFormat = new Intl.NumberFormat();

export function ContactsPage() {
  const { filters, updateFilters, resetFilters } = useContactFilters();
  const { data, isPending, isError, error, isPlaceholderData, refetch } = useFetch<ContactPage>({
    url: endpoints.contacts(),
    params: toApiParams(filters),
    placeholderData: keepPreviousData,
  });

  const selectionScope = JSON.stringify([filters.search, filters.company, filters.tagIds]);
  const selection = useSelection(selectionScope);
  const [tagModalOpen, setTagModalOpen] = useState(false);

  function renderBody() {
    const tableProps = {
      selectedIds: selection.selectedIds,
      onToggle: selection.toggle,
      onToggleMany: selection.setMany,
      sorting: toSortingState(filters),
      onSortingChange: (sorting: SortingState) => updateFilters(fromSortingState(sorting)),
    };

    if (isPending) return <ContactsTable {...tableProps} contacts={[]} loading />;

    if (isError) {
      return (
        <EmptyState
          tone="error"
          icon="alert"
          title="Couldn't load contacts"
          description={errorMessage(error)}
          action={<Button onClick={() => void refetch()}>Try again</Button>}
        />
      );
    }

    if (data.total === 0) {
      return hasActiveFilters(filters) ? (
        <EmptyState
          icon="search"
          title="No contacts match"
          description="Try a different search term or remove some filters."
          action={<Button onClick={resetFilters}>Clear filters</Button>}
        />
      ) : (
        <EmptyState title="No contacts yet" description="Contacts you add will show up here." />
      );
    }

    if (data.items.length === 0) {
      return (
        <EmptyState
          icon="search"
          title="This page is empty"
          description={`There are only ${numberFormat.format(data.total)} matching contacts.`}
          action={<Button onClick={() => updateFilters({ page: 1 })}>Go to first page</Button>}
        />
      );
    }

    return (
      <>
        <ContactsTable {...tableProps} contacts={data.items} refreshing={isPlaceholderData} />
        <div className={styles.footer}>
          <Pagination
            page={filters.page}
            pageSize={filters.pageSize}
            total={data.total}
            onPageChange={(page) => updateFilters({ page })}
            onPageSizeChange={(pageSize) => updateFilters({ pageSize })}
          />
        </div>
      </>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Contacts</h1>
        <div className={styles.subtitle} aria-live="polite">
          <span>{data ? `${numberFormat.format(data.total)} contacts` : 'Loading…'}</span>
          {selection.selectedIds.size > 0 && (
            <>
              <span aria-hidden="true">·</span>
              <span className={styles.selected}>{selection.selectedIds.size} selected</span>
              <Button variant="ghost" size="sm" onClick={selection.clear}>
                Clear selection
              </Button>
            </>
          )}
        </div>
      </header>

      <ContactsToolbar
        filters={filters}
        onChange={updateFilters}
        onReset={resetFilters}
        selectedCount={selection.selectedIds.size}
        onAddTags={() => setTagModalOpen(true)}
      />

      {tagModalOpen && (
        <BulkTagModal
          contactIds={[...selection.selectedIds]}
          onClose={() => setTagModalOpen(false)}
          onDone={() => {
            setTagModalOpen(false);
            selection.clear();
          }}
        />
      )}

      <section className={styles.panel} aria-label="Contact list">
        {renderBody()}
      </section>
    </div>
  );
}
