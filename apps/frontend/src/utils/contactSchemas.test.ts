import { contactFormSchema, diffContact, isValidPhone, tagNameSchema } from './contactSchemas';
import type { Contact } from '@/types/contact';

const contact: Contact = {
  id: 1,
  first_name: 'Ada',
  last_name: 'Lovelace',
  email: 'ada@example.com',
  phone: null,
  company: 'Engines',
  tags: [],
  version: 4,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

describe('diffContact', () => {
  it('returns only changed fields and sends cleared optional fields as null', () => {
    const changes = diffContact(contact, {
      first_name: 'Ada',
      last_name: 'King',
      email: '',
      phone: '',
      company: 'Engines',
    });
    expect(changes).toEqual({ last_name: 'King', email: null });
  });
});

describe('contactFormSchema', () => {
  const valid = { first_name: 'Ada', last_name: 'L', email: '', phone: '', company: '' };

  it('accepts empty optional fields', () => {
    expect(contactFormSchema.safeParse(valid).success).toBe(true);
  });

  it('trims values', () => {
    expect(contactFormSchema.parse({ ...valid, first_name: '  Ada  ' }).first_name).toBe('Ada');
  });

  it.each([
    [{ first_name: '   ' }, 'First name is required'],
    [{ email: 'nope' }, 'Enter a valid email address'],
    [{ phone: '12' }, 'Enter a valid phone number, e.g. +1 555 010 2030'],
  ])('rejects %o', (override, message) => {
    const result = contactFormSchema.safeParse({ ...valid, ...override });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(message);
  });
});

describe('isValidPhone', () => {
  it.each(['+1 (555) 010-2030', '+91 98765 43210', '5550102030'])('accepts %s', (phone) => {
    expect(isValidPhone(phone)).toBe(true);
  });

  it.each(['123', 'call me', '+1 555 0102 0304 0506'])('rejects %s', (phone) => {
    expect(isValidPhone(phone)).toBe(false);
  });
});

describe('tagNameSchema', () => {
  it('collapses whitespace', () => {
    expect(tagNameSchema.parse('  Key   Account ')).toBe('Key Account');
  });

  it('rejects odd characters', () => {
    expect(tagNameSchema.safeParse('<b>vip</b>').success).toBe(false);
  });
});
