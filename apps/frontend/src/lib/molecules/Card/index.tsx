import type { ReactNode } from 'react';
import { classNames } from '@/utils/classNames';
import styles from './style.module.css';

interface CardProps {
  title?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Card({ title, actions, children, className }: CardProps) {
  return (
    <section className={classNames(styles.card, className)} aria-label={title}>
      {title && (
        <header className={styles.header}>
          <h2 className={styles.title}>{title}</h2>
          {actions}
        </header>
      )}
      <div className={styles.body}>{children}</div>
    </section>
  );
}
