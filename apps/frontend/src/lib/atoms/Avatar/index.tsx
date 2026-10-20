import styles from './style.module.css';

export function Avatar({ name, size = 'sm' }: { name: string; size?: 'sm' | 'lg' }) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('');

  return (
    <span className={`${styles.avatar} ${styles[size]}`} aria-hidden="true">
      {initials}
    </span>
  );
}
