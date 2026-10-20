import { useId, useState, type FormEvent } from 'react';
import { endpoints } from '@/api/endpoints';
import { useFetch } from '@/hooks/useFetch';
import { useMutate } from '@/hooks/useMutate';
import { Alert, Button, Modal, SelectableTag, Skeleton, Tag, TextField, useToast } from '@/lib';
import type { BulkTagResult, Tag as TagItem } from '@/types/contact';
import { tagNameSchema } from '@/utils/contactSchemas';
import styles from './style.module.css';

interface BulkTagModalProps {
  contactIds: number[];
  onClose: () => void;
  onDone: () => void;
}

function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

function successMessage(result: BulkTagResult, contactCount: number) {
  const names = result.tags.map((tag) => `"${tag.name}"`).join(', ');
  const skipped = result.already_tagged > 0 ? ` (${result.already_tagged} already in place)` : '';
  return `Added ${names} to ${plural(contactCount, 'contact')}${skipped}`;
}

export function BulkTagModal({ contactIds, onClose, onDone }: BulkTagModalProps) {
  const toast = useToast();
  const [chosenNames, setChosenNames] = useState<string[]>([]);
  const [newTagName, setNewTagName] = useState('');
  const [newTagError, setNewTagError] = useState<string>();
  const existingHeadingId = useId();
  const newHeadingId = useId();

  const { data: existingTags = [], isPending: tagsLoading } = useFetch<TagItem[]>({
    url: endpoints.tags(),
  });

  const assignTags = useMutate<BulkTagResult, string[]>({
    method: 'post',
    url: endpoints.bulkTags(),
    body: (names) => ({ contact_ids: contactIds, names }),
  });

  const isChosen = (name: string) =>
    chosenNames.some((chosen) => chosen.toLowerCase() === name.toLowerCase());

  function toggleExisting(name: string) {
    setChosenNames((current) =>
      isChosen(name) ? current.filter((chosen) => chosen !== name) : [...current, name],
    );
  }

  function addNewTag(event: FormEvent) {
    event.preventDefault();
    const parsed = tagNameSchema.safeParse(newTagName);
    if (!parsed.success) {
      setNewTagError(parsed.error.issues[0]?.message);
      return;
    }
    if (isChosen(parsed.data)) {
      setNewTagError('That tag is already selected');
      return;
    }
    const existing = existingTags.find(
      (tag) => tag.name.toLowerCase() === parsed.data.toLowerCase(),
    );
    setChosenNames((current) => [...current, existing?.name ?? parsed.data]);
    setNewTagName('');
    setNewTagError(undefined);
  }

  function apply() {
    assignTags.mutate(chosenNames, {
      onSuccess: (result) => {
        toast.success(successMessage(result, contactIds.length));
        onDone();
      },
    });
  }

  const saving = assignTags.isPending;
  const newNames = chosenNames.filter(
    (name) => !existingTags.some((tag) => tag.name.toLowerCase() === name.toLowerCase()),
  );

  return (
    <Modal
      title={`Add tags to ${plural(contactIds.length, 'contact')}`}
      description="Pick existing tags or create new ones. Contacts that already have a tag are left as they are."
      onClose={() => {
        if (!saving) onClose();
      }}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={apply}
            loading={saving}
            disabled={chosenNames.length === 0}
          >
            {chosenNames.length > 0 ? `Add ${plural(chosenNames.length, 'tag')}` : 'Add tags'}
          </Button>
        </>
      }
    >
      {assignTags.isError && (
        <Alert tone="error" title="Couldn't add the tags">
          {assignTags.error.message}
        </Alert>
      )}

      <section className={styles.section} aria-labelledby={existingHeadingId}>
        <h3 id={existingHeadingId} className={styles.heading}>
          Existing tags
        </h3>
        {tagsLoading && <Skeleton width="60%" />}
        {!tagsLoading && existingTags.length === 0 && (
          <p className={styles.muted}>No tags yet. Create one below.</p>
        )}
        {existingTags.length > 0 && (
          <ul className={styles.chips}>
            {existingTags.map((tag) => (
              <li key={tag.id}>
                <SelectableTag
                  label={tag.name}
                  selected={isChosen(tag.name)}
                  disabled={saving}
                  onClick={() => toggleExisting(tag.name)}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={styles.section} aria-labelledby={newHeadingId}>
        <h3 id={newHeadingId} className={styles.heading}>
          Create a new tag
        </h3>
        <form className={styles.newTag} onSubmit={addNewTag} noValidate>
          <TextField
            className={styles.newTagInput}
            label="New tag name"
            hideLabel
            placeholder="e.g. Key Account"
            maxLength={40}
            autoComplete="off"
            value={newTagName}
            error={newTagError}
            disabled={saving}
            onChange={(event) => {
              setNewTagName(event.target.value);
              setNewTagError(undefined);
            }}
          />
          <Button type="submit" disabled={saving}>
            Add
          </Button>
        </form>
        {newNames.length > 0 && (
          <ul className={styles.chips} aria-label="New tags to create">
            {newNames.map((name) => (
              <li key={name}>
                <Tag
                  onRemove={() =>
                    setChosenNames((current) => current.filter((chosen) => chosen !== name))
                  }
                >
                  {name}
                </Tag>
              </li>
            ))}
          </ul>
        )}
      </section>
    </Modal>
  );
}
