import { classNames } from '@/utils/classNames';
import { Icon } from '@/lib/atoms/Icon';
import styles from './style.module.css';

interface TagProps {
  children: string;
  onRemove?: () => void;
  removing?: boolean;
}

export function Tag({ children, onRemove, removing }: TagProps) {
  return (
    <span className={classNames(styles.tag, onRemove && styles.removable)}>
      <span className={styles.label}>{children}</span>
      {onRemove && (
        <button
          type="button"
          className={styles.remove}
          onClick={onRemove}
          disabled={removing}
          aria-label={`Remove tag ${children}`}
        >
          <Icon name="x" size={12} />
        </button>
      )}
    </span>
  );
}
