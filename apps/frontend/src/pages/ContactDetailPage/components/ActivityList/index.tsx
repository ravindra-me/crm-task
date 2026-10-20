import { Button, Icon, type IconName, Skeleton } from '@/lib';
import { formatDateTime, formatRelative } from '@/utils/format';
import { endpoints } from '@/api/endpoints';
import { useFetch } from '@/hooks/useFetch';
import { RECENT_ACTIVITY_LIMIT } from '@/utils/constants';
import { FIELD_LABELS } from '@/utils/contactSchemas';
import type { Activity, EditableField } from '@/types/contact';
import styles from './style.module.css';

const LOOK: Record<Activity['type'], { icon: IconName; className?: string }> = {
  CONTACT_UPDATED: { icon: 'edit' },
  TAG_ADDED: { icon: 'plus', className: styles.added },
  TAG_REMOVED: { icon: 'minus', className: styles.removed },
};

function describe(activity: Activity): string {
  switch (activity.type) {
    case 'TAG_ADDED':
      return `Tag "${activity.details.tag}" added`;
    case 'TAG_REMOVED':
      return `Tag "${activity.details.tag}" removed`;
    case 'CONTACT_UPDATED':
      return 'Details updated';
  }
}

function ActivityItem({ activity }: { activity: Activity }) {
  const look = LOOK[activity.type];
  const changes = Object.entries(activity.details.changes ?? {}) as Array<
    [EditableField, { from: string | null; to: string | null }]
  >;

  return (
    <li className={styles.item}>
      <span className={`${styles.dot} ${look.className ?? ''}`}>
        <Icon name={look.icon} size={12} />
      </span>
      <div className={styles.body}>
        <span>{describe(activity)}</span>
        {changes.length > 0 && (
          <ul className={styles.changes}>
            {changes.map(([field, change]) => (
              <li key={field}>
                {FIELD_LABELS[field] ?? field}:{' '}
                <span className={styles.old}>{change.from || 'empty'}</span> →{' '}
                {change.to || 'empty'}
              </li>
            ))}
          </ul>
        )}
        <time
          className={styles.time}
          dateTime={activity.created_at}
          title={formatDateTime(activity.created_at)}
        >
          {formatRelative(activity.created_at)}
        </time>
      </div>
    </li>
  );
}

export function ActivityList({ contactId }: { contactId: number }) {
  const { data, isPending, isError, refetch } = useFetch<Activity[]>({
    url: endpoints.contactActivities(contactId),
    params: { limit: RECENT_ACTIVITY_LIMIT },
  });

  if (isPending) {
    return (
      <div role="status" aria-label="Loading activity">
        <Skeleton width="80%" />
        <br />
        <Skeleton width="60%" />
      </div>
    );
  }

  if (isError) {
    return (
      <p className={styles.message}>
        Couldn't load activity.{' '}
        <Button variant="ghost" size="sm" onClick={() => void refetch()}>
          Retry
        </Button>
      </p>
    );
  }

  if (data.length === 0) {
    return <p className={styles.message}>No changes recorded yet.</p>;
  }

  return (
    <ol className={styles.list} aria-label="Recent activity">
      {data.map((activity) => (
        <ActivityItem key={activity.id} activity={activity} />
      ))}
    </ol>
  );
}
