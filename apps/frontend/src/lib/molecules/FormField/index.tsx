import { useId, type ReactNode } from 'react';
import { classNames } from '@/utils/classNames';
import styles from './style.module.css';

export interface FieldControlProps {
  id: string;
  'aria-invalid'?: true;
  'aria-describedby'?: string;
}

export interface FormFieldProps {
  label: string;
  hideLabel?: boolean;
  optional?: boolean;
  error?: string;
  hint?: ReactNode;
  id?: string;
  className?: string;
  children: (controlProps: FieldControlProps) => ReactNode;
}

export function FormField({
  label,
  hideLabel,
  optional,
  error,
  hint,
  id,
  className,
  children,
}: FormFieldProps) {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const errorId = `${controlId}-error`;
  const hintId = `${controlId}-hint`;
  const showHint = Boolean(hint) && !error;
  const describedBy = [error && errorId, showHint && hintId].filter(Boolean).join(' ');

  return (
    <div className={classNames(styles.field, className)}>
      <label htmlFor={controlId} className={hideLabel ? 'visually-hidden' : styles.label}>
        {label}
        {optional && <span className={styles.optional}> (optional)</span>}
      </label>
      {children({
        id: controlId,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': describedBy || undefined,
      })}
      {showHint && (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className={styles.error}>
          {error}
        </p>
      )}
    </div>
  );
}
