import type { ComponentProps } from 'react';
import { Icon, type IconName } from '@/lib/atoms/Icon';
import { classNames } from '@/utils/classNames';
import styles from './style.module.css';

export interface InputProps extends ComponentProps<'input'> {
  icon?: IconName;
}

export function Input({ icon, className, ...props }: InputProps) {
  return (
    <div className={styles.control}>
      {icon && <Icon name={icon} className={styles.icon} />}
      <input className={classNames(styles.input, icon && styles.withIcon, className)} {...props} />
    </div>
  );
}
