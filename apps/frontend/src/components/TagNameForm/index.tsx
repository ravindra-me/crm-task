import { useId, useState, type FormEvent } from 'react';
import { Button, TextField } from '@/lib';
import { errorMessage } from '@/api/apiClient';
import { tagNameSchema } from '@/utils/contactSchemas';
import { endpoints } from '@/api/endpoints';
import { useFetch } from '@/hooks/useFetch';
import type { Tag } from '@/types/contact';
import styles from './style.module.css';

interface TagNameFormProps {
  label: string;
  submitLabel: string;
  onSubmit: (name: string) => Promise<unknown>;
  exclude?: string[];
  disabled?: boolean;
}

export function TagNameForm({
  label,
  submitLabel,
  onSubmit,
  exclude = [],
  disabled,
}: TagNameFormProps) {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);
  const listId = useId();
  const { data: tags = [] } = useFetch<Tag[]>({
    url: endpoints.tags(),
  });

  const excluded = new Set(exclude.map((name) => name.toLowerCase()));
  const suggestions = tags.filter((tag) => !excluded.has(tag.name.toLowerCase()));

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const parsed = tagNameSchema.safeParse(value);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message);
      return;
    }

    setPending(true);
    try {
      await onSubmit(parsed.data);
      setValue('');
      setError(undefined);
    } catch (caughtError) {
      setError(errorMessage(caughtError));
    } finally {
      setPending(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <TextField
        className={styles.input}
        label={label}
        hideLabel
        placeholder="Tag name, e.g. VIP"
        list={listId}
        value={value}
        error={error}
        maxLength={40}
        autoComplete="off"
        disabled={disabled}
        onChange={(event) => {
          setValue(event.target.value);
          if (error) setError(undefined);
        }}
      />
      <datalist id={listId}>
        {suggestions.map((tag) => (
          <option key={tag.id} value={tag.name} />
        ))}
      </datalist>
      <Button type="submit" variant="primary" loading={pending} disabled={disabled}>
        {submitLabel}
      </Button>
    </form>
  );
}
