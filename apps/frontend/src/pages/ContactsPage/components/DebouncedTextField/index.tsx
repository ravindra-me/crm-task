import { useState } from 'react';
import { TextField, type TextFieldProps } from '@/lib';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';

interface DebouncedTextFieldProps extends Omit<TextFieldProps, 'value' | 'onChange'> {
  value: string;
  onDebouncedChange: (value: string) => void;
  delayMs?: number;
}

export function DebouncedTextField({
  value,
  onDebouncedChange,
  delayMs = 300,
  ...props
}: DebouncedTextFieldProps) {
  const [text, setText] = useState(value);
  const [lastValue, setLastValue] = useState(value);
  const report = useDebouncedCallback(onDebouncedChange, delayMs);

  if (value !== lastValue) {
    setLastValue(value);
    setText(value);
  }

  return (
    <TextField
      {...props}
      value={text}
      onChange={(event) => {
        setText(event.target.value);
        report(event.target.value);
      }}
    />
  );
}
