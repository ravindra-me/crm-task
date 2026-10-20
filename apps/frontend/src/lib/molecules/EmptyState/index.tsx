import type { ReactNode } from 'react';
import { classNames } from '@/utils/classNames';
import { Icon, type IconName } from '@/lib/atoms/Icon';
import styles from './style.module.css';

interface EmptyStateProps {
  title: string;
  description?: ReactNode;
  icon?: IconName;
  action?: ReactNode;
  tone?: 'neutral' | 'error';
}

export function EmptyState({
  title,
  description,
  icon = 'users',
  action,
  tone = 'neutral',
}: EmptyStateProps) {
  return (
    <div
      className={classNames(styles.empty, tone === 'error' && styles.error)}
      role={tone === 'error' ? 'alert' : undefined}
    >
      <span className={styles.icon}>
        <Icon name={icon} size={22} />
      </span>
      <h2 className={styles.title}>{title}</h2>
      {description && <p className={styles.description}>{description}</p>}
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
}
