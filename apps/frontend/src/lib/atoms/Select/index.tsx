import type { ComponentProps } from 'react';
import { Icon } from '@/lib/atoms/Icon';
import { classNames } from '@/utils/classNames';
import styles from './style.module.css';

export interface SelectOption<TValue extends string> {
  value: TValue;
  label: string;
}

export interface SelectProps<TValue extends string> extends Omit<
  ComponentProps<'select'>,
  'onChange' | 'value'
> {
  value: TValue;
  options: readonly SelectOption<TValue>[];
  onChange: (value: TValue) => void;
}

export function Select<TValue extends string>({
  value,
  options,
  onChange,
  className,
  ...props
}: SelectProps<TValue>) {
  return (
    <div className={styles.control}>
      <select
        className={classNames(styles.select, className)}
        value={value}
        onChange={(event) => onChange(event.target.value as TValue)}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <Icon name="chevron-down" className={styles.chevron} />
    </div>
  );
}
