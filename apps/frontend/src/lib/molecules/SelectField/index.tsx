import { Select, type SelectProps } from '@/lib/atoms/Select';
import { FormField } from '@/lib/molecules/FormField';

export interface SelectFieldProps<TValue extends string> extends SelectProps<TValue> {
  label: string;
  hideLabel?: boolean;
}

export function SelectField<TValue extends string>({
  label,
  hideLabel,
  id,
  className,
  ...selectProps
}: SelectFieldProps<TValue>) {
  return (
    <FormField label={label} hideLabel={hideLabel} id={id} className={className}>
      {(controlProps) => <Select {...controlProps} {...selectProps} />}
    </FormField>
  );
}
