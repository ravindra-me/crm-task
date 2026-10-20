import type { ReactNode } from 'react';
import { Input, type InputProps } from '@/lib/atoms/Input';
import { FormField } from '@/lib/molecules/FormField';

export interface TextFieldProps extends InputProps {
  label: string;
  hideLabel?: boolean;
  optional?: boolean;
  error?: string;
  hint?: ReactNode;
}

export function TextField({
  label,
  hideLabel,
  optional,
  error,
  hint,
  id,
  className,
  ...inputProps
}: TextFieldProps) {
  return (
    <FormField
      label={label}
      hideLabel={hideLabel}
      optional={optional}
      error={error}
      hint={hint}
      id={id}
      className={className}
    >
      {(controlProps) => <Input {...controlProps} {...inputProps} />}
    </FormField>
  );
}
