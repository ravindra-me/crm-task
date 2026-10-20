import styles from './style.module.css';

export function Spinner({ size = 'md', label }: { size?: 'sm' | 'md'; label?: string }) {
  return (
    <span
      className={`${styles.spinner} ${styles[size]}`}
      role={label ? 'status' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    />
  );
}
