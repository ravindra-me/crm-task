import type { ComponentProps } from 'react';
import { Icon } from '@/lib/atoms/Icon';
import styles from './style.module.css';

interface SelectableTagProps extends Omit<ComponentProps<'button'>, 'children'> {
  label: string;
  selected: boolean;
}

export function SelectableTag({ label, selected, ...props }: SelectableTagProps) {
  return (
    <button type="button" className={styles.chip} aria-pressed={selected} {...props}>
      {selected && <Icon name="check" size={12} />}
      {label}
    </button>
  );
}
