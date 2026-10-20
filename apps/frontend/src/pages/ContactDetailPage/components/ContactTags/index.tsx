import { Tag, useToast } from '@/lib';
import { errorMessage } from '@/api/apiClient';
import { endpoints } from '@/api/endpoints';
import { useMutate } from '@/hooks/useMutate';
import type { Contact } from '@/types/contact';
import { TagNameForm } from '@/components/TagNameForm';
import styles from './style.module.css';

export function ContactTags({ contact }: { contact: Contact }) {
  const addTag = useMutate<Contact, string>({
    method: 'post',
    url: endpoints.contactTags(contact.id),
    body: (name) => ({ name }),
  });
  const removeTag = useMutate<Contact, number>({
    method: 'delete',
    url: (tagId) => endpoints.contactTag(contact.id, tagId),
  });
  const toast = useToast();

  function remove(tagId: number, name: string) {
    removeTag.mutate(tagId, {
      onSuccess: () => toast.success(`Removed "${name}"`),
      onError: (error) => toast.error(`Couldn't remove "${name}": ${errorMessage(error)}`),
    });
  }

  return (
    <div className={styles.wrapper}>
      {contact.tags.length > 0 ? (
        <ul className={styles.list} aria-label="Assigned tags">
          {contact.tags.map((tag) => (
            <li key={tag.id}>
              <Tag
                onRemove={() => remove(tag.id, tag.name)}
                removing={removeTag.isPending && removeTag.variables === tag.id}
              >
                {tag.name}
              </Tag>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.empty}>No tags yet.</p>
      )}

      <TagNameForm
        label="Add a tag"
        submitLabel="Add"
        exclude={contact.tags.map((tag) => tag.name)}
        onSubmit={(name) => addTag.mutateAsync(name)}
      />
    </div>
  );
}
