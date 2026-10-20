import { formatRelative, fullName } from './format';

describe('formatRelative', () => {
  const now = new Date('2026-10-19T12:00:00Z');

  it('uses the largest sensible unit', () => {
    expect(formatRelative('2026-10-19T11:59:30Z', now)).toBe('just now');
    expect(formatRelative('2026-10-19T09:00:00Z', now)).toMatch(/3 hours ago/);
    expect(formatRelative('2026-10-18T12:00:00Z', now)).toMatch(/yesterday|1 day ago/);
  });
});

describe('fullName', () => {
  it('joins first and last name', () => {
    expect(fullName({ first_name: 'Ada', last_name: 'Lovelace' })).toBe('Ada Lovelace');
  });
});
