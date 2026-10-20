import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Alert, Button, TextField, useToast } from '@/lib';
import { ApiError } from '@/api/apiClient';
import { endpoints } from '@/api/endpoints';
import { useMutate } from '@/hooks/useMutate';
import {
  contactFormSchema,
  diffContact,
  EDITABLE_FIELDS,
  toFormValues,
  type ContactFormValues,
} from '@/utils/contactSchemas';
import type { Contact, ContactUpdate } from '@/types/contact';
import { ConflictNotice } from '../ConflictNotice';
import styles from './style.module.css';

export function ContactForm({ contact }: { contact: Contact }) {
  const toast = useToast();
  const updateContact = useMutate<Contact, ContactUpdate>({
    method: 'patch',
    url: endpoints.contact(contact.id),
  });
  const [conflict, setConflict] = useState<{ latest: Contact; mine: ContactFormValues } | null>(
    null,
  );
  const [formError, setFormError] = useState<string | null>(null);

  const baseRef = useRef(contact);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isDirty },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: toFormValues(contact),
  });

  useEffect(() => {
    if (isDirty || contact.version < baseRef.current.version) return;
    baseRef.current = contact;
    reset(toFormValues(contact));
  }, [contact, isDirty, reset]);

  function startFrom(latest: Contact) {
    baseRef.current = latest;
    reset(toFormValues(latest));
  }

  async function save(values: ContactFormValues) {
    const base = baseRef.current;
    const changes = diffContact(base, values);
    if (Object.keys(changes).length === 0) {
      reset(values);
      return;
    }

    setFormError(null);
    try {
      const saved = await updateContact.mutateAsync({ ...changes, version: base.version });
      setConflict(null);
      startFrom(saved);
      toast.success('Contact saved');
    } catch (error) {
      handleSaveError(error, values);
    }
  }

  function handleSaveError(error: unknown, values: ContactFormValues) {
    if (!(error instanceof ApiError)) {
      setFormError('Something went wrong while saving. Please try again.');
      return;
    }

    if (error.code === 'version_conflict') {
      const latest = (error.details as { current?: Contact } | null)?.current;
      if (latest) {
        setConflict({ latest, mine: values });
        return;
      }
    }

    if (error.code === 'email_taken') {
      setError('email', { message: error.message }, { shouldFocus: true });
      return;
    }

    const fieldErrors = error.fieldErrors.filter((item) =>
      (EDITABLE_FIELDS as string[]).includes(item.field),
    );
    if (fieldErrors.length > 0) {
      fieldErrors.forEach((item) =>
        setError(item.field as keyof ContactFormValues, { message: item.message }),
      );
      return;
    }

    setFormError(error.message);
  }

  function useLatest() {
    if (!conflict) return;
    startFrom(conflict.latest);
    setConflict(null);
  }

  function keepMine() {
    if (!conflict) return;
    baseRef.current = conflict.latest;
    void handleSubmit(save)();
  }

  return (
    <form className={styles.form} onSubmit={(event) => void handleSubmit(save)(event)} noValidate>
      {conflict && (
        <ConflictNotice
          mine={conflict.mine}
          latest={conflict.latest}
          onUseLatest={useLatest}
          onKeepMine={keepMine}
          saving={updateContact.isPending}
        />
      )}
      {formError && (
        <Alert tone="error" title="Couldn't save changes">
          {formError}
        </Alert>
      )}

      <div className={styles.grid}>
        <TextField
          label="First name"
          autoComplete="given-name"
          maxLength={100}
          error={errors.first_name?.message}
          {...register('first_name')}
        />
        <TextField
          label="Last name"
          autoComplete="family-name"
          maxLength={100}
          error={errors.last_name?.message}
          {...register('last_name')}
        />
        <TextField
          className={styles.full}
          label="Email"
          type="email"
          optional
          autoComplete="email"
          maxLength={254}
          error={errors.email?.message}
          {...register('email')}
        />
        <TextField
          label="Phone"
          type="tel"
          optional
          autoComplete="tel"
          maxLength={32}
          error={errors.phone?.message}
          {...register('phone')}
        />
        <TextField
          label="Company"
          optional
          autoComplete="organization"
          maxLength={200}
          error={errors.company?.message}
          {...register('company')}
        />
      </div>

      <div className={styles.footer}>
        <span className={styles.status} aria-live="polite">
          {isDirty ? 'Unsaved changes' : ''}
        </span>
        <Button
          variant="ghost"
          disabled={!isDirty || updateContact.isPending}
          onClick={() => {
            startFrom(baseRef.current);
            setConflict(null);
            setFormError(null);
          }}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          loading={updateContact.isPending && !conflict}
          disabled={!isDirty || Boolean(conflict)}
        >
          Save changes
        </Button>
      </div>
    </form>
  );
}
