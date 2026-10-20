import { useEffect, useRef, type InputHTMLAttributes } from 'react';
import styles from './style.module.css';

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  hideLabel?: boolean;
  indeterminate?: boolean;
}

export function Checkbox({ label, hideLabel, indeterminate = false, ...props }: CheckboxProps) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return (
    <label className={styles.wrapper}>
      <input ref={ref} type="checkbox" className={styles.checkbox} {...props} />
      <span className={hideLabel ? 'visually-hidden' : undefined}>{label}</span>
    </label>
  );
}
