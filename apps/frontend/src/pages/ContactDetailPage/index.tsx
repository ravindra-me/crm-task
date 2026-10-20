import { Link, useLocation, useParams } from 'react-router';
import { Avatar, Button, Card, EmptyState, Icon, Skeleton } from '@/lib';
import { ApiError, errorMessage } from '@/api/apiClient';
import { formatDate, formatRelative, fullName } from '@/utils/format';
import { ActivityList } from './components/ActivityList';
import { ContactForm } from './components/ContactForm';
import { ContactTags } from './components/ContactTags';
import { endpoints } from '@/api/endpoints';
import { useFetch } from '@/hooks/useFetch';
import type { Contact } from '@/types/contact';
import styles from './style.module.css';

function BackLink() {
  const location = useLocation();
  const listSearch = (location.state as { listSearch?: string } | null)?.listSearch ?? '';

  return (
    <Link to={`/${listSearch}`} className={styles.back}>
      <Icon name="arrow-left" /> All contacts
    </Link>
  );
}

function ContactDetail({ contactId }: { contactId: number }) {
  const {
    data: contact,
    isPending,
    isError,
    error,
    refetch,
  } = useFetch<Contact>({ url: endpoints.contact(contactId) });

  if (isPending) {
    return (
      <div className={styles.skeleton} role="status" aria-label="Loading contact">
        <Skeleton width="40%" />
        <Skeleton width="60%" />
        <Skeleton width="50%" />
      </div>
    );
  }

  if (isError) {
    const notFound = error instanceof ApiError && error.status === 404;
    return notFound ? (
      <EmptyState
        icon="search"
        title="Contact not found"
        description="It may have been deleted, or the link is wrong."
      />
    ) : (
      <EmptyState
        tone="error"
        icon="alert"
        title="Couldn't load this contact"
        description={errorMessage(error)}
        action={<Button onClick={() => void refetch()}>Try again</Button>}
      />
    );
  }

  const name = fullName(contact);

  return (
    <>
      <header className={styles.header}>
        <Avatar name={name} size="lg" />
        <div className={styles.headerText}>
          <h1 className={styles.name}>{name}</h1>
          <p className={styles.meta}>
            Added {formatDate(contact.created_at)} · Last updated{' '}
            {formatRelative(contact.updated_at)}
          </p>
        </div>
      </header>

      <div className={styles.layout}>
        <Card title="Details">
          <ContactForm key={contact.id} contact={contact} />
        </Card>
        <div className={styles.aside}>
          <Card title="Tags">
            <ContactTags contact={contact} />
          </Card>
          <Card title="Recent activity">
            <ActivityList contactId={contact.id} />
          </Card>
        </div>
      </div>
    </>
  );
}

export function ContactDetailPage() {
  const { contactId } = useParams();
  const id = Number(contactId);
  const validId = Number.isInteger(id) && id > 0;

  return (
    <div className={styles.page}>
      <BackLink />
      {validId ? (
        <ContactDetail contactId={id} />
      ) : (
        <EmptyState
          icon="search"
          title="Contact not found"
          description="That link doesn't look right."
        />
      )}
    </div>
  );
}
