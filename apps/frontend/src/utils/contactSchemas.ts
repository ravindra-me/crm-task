import { z } from 'zod';
import type { Contact, ContactChanges, EditableField } from '@/types/contact';

const PHONE_PATTERN = /^\+?[0-9 ().-]+$/;
const TAG_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 _&-]*$/;

export function isValidPhone(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  return PHONE_PATTERN.test(value) && digits.length >= 7 && digits.length <= 15;
}

const emailSchema = z.email();

export const contactFormSchema = z.object({
  first_name: z
    .string()
    .trim()
    .min(1, 'First name is required')
    .max(100, 'Use 100 characters or fewer'),
  last_name: z
    .string()
    .trim()
    .min(1, 'Last name is required')
    .max(100, 'Use 100 characters or fewer'),
  email: z
    .string()
    .trim()
    .max(254, 'Email is too long')
    .refine((value) => value === '' || emailSchema.safeParse(value).success, {
      message: 'Enter a valid email address',
    }),
  phone: z
    .string()
    .trim()
    .refine((value) => value === '' || isValidPhone(value), {
      message: 'Enter a valid phone number, e.g. +1 555 010 2030',
    }),
  company: z.string().trim().max(200, 'Use 200 characters or fewer'),
});

export type ContactFormValues = z.infer<typeof contactFormSchema>;

export const FIELD_LABELS: Record<EditableField, string> = {
  first_name: 'First name',
  last_name: 'Last name',
  email: 'Email',
  phone: 'Phone',
  company: 'Company',
};

export const EDITABLE_FIELDS = Object.keys(FIELD_LABELS) as EditableField[];

export function toFormValues(contact: Contact): ContactFormValues {
  return {
    first_name: contact.first_name,
    last_name: contact.last_name,
    email: contact.email ?? '',
    phone: contact.phone ?? '',
    company: contact.company ?? '',
  };
}

export function diffContact(original: Contact, values: ContactFormValues): ContactChanges {
  const changes: ContactChanges = {};
  for (const field of EDITABLE_FIELDS) {
    const next = values[field] === '' ? null : values[field];
    if (next !== original[field]) changes[field] = next;
  }
  return changes;
}

export const tagNameSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/\s+/g, ' '))
  .pipe(
    z
      .string()
      .min(1, 'Enter a tag name')
      .max(40, 'Use 40 characters or fewer')
      .regex(TAG_PATTERN, "Use letters, numbers, spaces, '-', '_' or '&'"),
  );
