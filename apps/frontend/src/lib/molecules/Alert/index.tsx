import type { ReactNode } from 'react';
import { Icon } from '@/lib/atoms/Icon';
import styles from './style.module.css';

interface AlertProps {
  tone: 'warning' | 'error';
  title: string;
  children?: ReactNode;
}

export function Alert({ tone, title, children }: AlertProps) {
  return (
    <div className={`${styles.alert} ${styles[tone]}`} role="alert">
      <Icon name="alert" className={styles.icon} />
      <div className={styles.content}>
        <p className={styles.title}>{title}</p>
        {children && <div className={styles.body}>{children}</div>}
      </div>
    </div>
  );
}
