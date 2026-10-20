import { Button, Checkbox, Dropdown, Spinner } from '@/lib';
import { endpoints } from '@/api/endpoints';
import { useFetch } from '@/hooks/useFetch';
import type { Tag } from '@/types/contact';
import styles from './style.module.css';

interface TagFilterProps {
  selected: number[];
  onChange: (tagIds: number[]) => void;
}

export function TagFilter({ selected, onChange }: TagFilterProps) {
  const {
    data: tags,
    isPending,
    isError,
  } = useFetch<Tag[]>({
    url: endpoints.tags(),
  });

  function toggle(tagId: number, checked: boolean) {
    onChange(checked ? [...selected, tagId] : selected.filter((id) => id !== tagId));
  }

  return (
    <Dropdown label="Tags" count={selected.length}>
      {isPending && (
        <p className={styles.message}>
          <Spinner size="sm" /> Loading tags…
        </p>
      )}
      {isError && <p className={styles.message}>Couldn't load tags.</p>}
      {tags?.length === 0 && <p className={styles.message}>No tags yet.</p>}
      {tags && tags.length > 0 && (
        <fieldset className={styles.fieldset}>
          <legend className="visually-hidden">Show contacts with any of these tags</legend>
          {tags.map((tag) => (
            <div key={tag.id} className={styles.option}>
              <Checkbox
                label={tag.name}
                checked={selected.includes(tag.id)}
                onChange={(event) => toggle(tag.id, event.target.checked)}
              />
            </div>
          ))}
        </fieldset>
      )}
      {selected.length > 0 && (
        <div className={styles.footer}>
          <Button variant="ghost" size="sm" onClick={() => onChange([])}>
            Clear tags
          </Button>
        </div>
      )}
    </Dropdown>
  );
}
