import { Link, useLocation } from 'react-router';
import { Avatar, Checkbox, DataTable, Tag, type DataTableColumn, type SortingState } from '@/lib';
import type { Contact } from '@/types/contact';
import { formatDate, fullName } from '@/utils/format';
import styles from './style.module.css';

const VISIBLE_TAGS = 3;

interface ContactsTableProps {
  contacts: Contact[];
  selectedIds: Set<number>;
  onToggle: (id: number) => void;
  onToggleMany: (ids: number[], selected: boolean) => void;
  sorting: SortingState;
  onSortingChange: (sorting: SortingState) => void;
  loading?: boolean;
  refreshing?: boolean;
}

function emptyValue() {
  return <span className={styles.muted}>—</span>;
}

export function ContactsTable({
  contacts,
  selectedIds,
  onToggle,
  onToggleMany,
  sorting,
  onSortingChange,
  loading,
  refreshing,
}: ContactsTableProps) {
  const { search } = useLocation();
  const pageIds = contacts.map((contact) => contact.id);
  const selectedOnPage = pageIds.filter((id) => selectedIds.has(id)).length;
  const allSelected = pageIds.length > 0 && selectedOnPage === pageIds.length;

  const columns: DataTableColumn<Contact>[] = [
    {
      id: 'select',
      width: 48,
      mobile: 'aside',
      header: (
        <Checkbox
          label="Select all contacts on this page"
          hideLabel
          checked={allSelected}
          indeterminate={selectedOnPage > 0 && !allSelected}
          disabled={loading}
          onChange={() => onToggleMany(pageIds, !allSelected)}
        />
      ),
      cell: (contact) => (
        <Checkbox
          label={`Select ${fullName(contact)}`}
          hideLabel
          checked={selectedIds.has(contact.id)}
          onChange={() => onToggle(contact.id)}
        />
      ),
    },
    {
      id: 'name',
      header: 'Name',
      enableSorting: true,
      minWidth: 200,
      cell: (contact) => {
        const name = fullName(contact);
        return (
          <div className={styles.person}>
            <Avatar name={name} />
            <div className={styles.personText}>
              <Link
                to={`/contacts/${contact.id}`}
                state={{ listSearch: search }}
                className={styles.name}
              >
                {name}
              </Link>
              <span className={styles.mobileOnly}>
                {[contact.company, contact.email].filter(Boolean).join(' · ') || '—'}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      id: 'email',
      header: 'Email',
      maxWidth: 240,
      mobile: 'hide',
      cell: (contact) =>
        contact.email ? (
          <span className={styles.subtle} title={contact.email}>
            {contact.email}
          </span>
        ) : (
          emptyValue()
        ),
    },
    {
      id: 'phone',
      header: 'Phone',
      mobile: 'hide',
      cell: (contact) =>
        contact.phone ? <span className={styles.subtle}>{contact.phone}</span> : emptyValue(),
    },
    {
      id: 'company',
      header: 'Company',
      maxWidth: 200,
      mobile: 'hide',
      cell: (contact) =>
        contact.company ? <span className={styles.subtle}>{contact.company}</span> : emptyValue(),
    },
    {
      id: 'tags',
      header: 'Tags',
      minWidth: 160,
      cell: (contact) => {
        const hiddenTags = contact.tags.length - VISIBLE_TAGS;
        return (
          <div className={styles.tags}>
            {contact.tags.slice(0, VISIBLE_TAGS).map((tag) => (
              <Tag key={tag.id}>{tag.name}</Tag>
            ))}
            {hiddenTags > 0 && (
              <span className={styles.more} title={contact.tags.map((tag) => tag.name).join(', ')}>
                +{hiddenTags}
              </span>
            )}
          </div>
        );
      },
    },
    {
      id: 'created_at',
      header: 'Created',
      enableSorting: true,
      width: 136,
      mobile: 'hide',
      cell: (contact) => <span className={styles.muted}>{formatDate(contact.created_at)}</span>,
    },
  ];

  return (
    <DataTable
      label="Contacts"
      columns={columns}
      data={contacts}
      getRowId={(contact) => contact.id}
      sorting={sorting}
      onSortingChange={onSortingChange}
      isRowSelected={(contact) => selectedIds.has(contact.id)}
      loading={loading}
      refreshing={refreshing}
    />
  );
}
