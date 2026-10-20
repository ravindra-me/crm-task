import styles from './style.module.css';

export function Skeleton({ width = '100%' }: { width?: string }) {
  return <span className={styles.skeleton} style={{ width }} aria-hidden="true" />;
}
