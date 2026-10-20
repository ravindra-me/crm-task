import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/render';
import type { Contact } from '@/types/contact';
import { ContactForm } from '.';

const contact: Contact = {
  id: 7,
  first_name: 'Ada',
  last_name: 'Lovelace',
  email: 'ada@example.com',
  phone: null,
  company: 'Engines',
  tags: [],
  version: 1,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

function errorResponse(status: number, code: string, message: string, details?: unknown) {
  return Response.json({ error: { code, message, details } }, { status });
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => vi.unstubAllGlobals());

async function lastRequestBody() {
  const request = fetchMock.mock.calls.at(-1)?.[0] as Request;
  return JSON.parse(await request.clone().text());
}

describe('ContactForm', () => {
  it('sends only the changed fields with the version it was loaded with', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(Response.json({ ...contact, company: 'Analytical', version: 2 }));
    renderWithProviders(<ContactForm contact={contact} />);

    const company = screen.getByLabelText(/company/i);
    await user.clear(company);
    await user.type(company, 'Analytical');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(await lastRequestBody()).toEqual({ company: 'Analytical', version: 1 });
    expect(await screen.findByText('Contact saved')).toBeInTheDocument();
  });

  it('shows validation errors without calling the API', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ContactForm contact={contact} />);

    await user.clear(screen.getByLabelText(/first name/i));
    await user.clear(screen.getByLabelText(/email/i));
    await user.type(screen.getByLabelText(/email/i), 'not-an-email');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('First name is required')).toBeInTheDocument();
    expect(screen.getByText('Enter a valid email address')).toBeInTheDocument();
    expect(screen.getByLabelText(/first name/i)).toHaveAttribute('aria-invalid', 'true');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('puts a duplicate email error on the email field', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(
      errorResponse(409, 'email_taken', 'Another contact already uses this email'),
    );
    renderWithProviders(<ContactForm contact={contact} />);

    const email = screen.getByLabelText(/email/i);
    await user.clear(email);
    await user.type(email, 'grace@example.com');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('Another contact already uses this email')).toBeInTheDocument();
    expect(email).toHaveAttribute('aria-invalid', 'true');
  });

  describe('when someone else saved first', () => {
    const theirs = { ...contact, company: 'Their Co', version: 2 };

    async function submitStaleEdit() {
      const user = userEvent.setup();
      fetchMock.mockResolvedValueOnce(
        errorResponse(409, 'version_conflict', 'Changed by someone else', { current: theirs }),
      );
      renderWithProviders(<ContactForm contact={contact} />);
      const company = screen.getByLabelText(/company/i);
      await user.clear(company);
      await user.type(company, 'My Co');
      await user.click(screen.getByRole('button', { name: 'Save changes' }));
      await screen.findByText(/someone else updated this contact/i);
      return { user, company };
    }

    it('shows both values side by side', async () => {
      await submitStaleEdit();
      expect(screen.getByRole('cell', { name: 'Their Co' })).toBeInTheDocument();
      expect(screen.getByRole('cell', { name: 'My Co' })).toBeInTheDocument();
    });

    it('can discard my edit and load the saved version', async () => {
      const { user, company } = await submitStaleEdit();
      await user.click(screen.getByRole('button', { name: /use saved version/i }));

      expect(company).toHaveValue('Their Co');
      expect(screen.queryByText(/someone else updated/i)).not.toBeInTheDocument();
    });

    it('can overwrite, sending the newer version this time', async () => {
      const { user } = await submitStaleEdit();
      fetchMock.mockResolvedValueOnce(Response.json({ ...theirs, company: 'My Co', version: 3 }));

      await user.click(screen.getByRole('button', { name: /overwrite with my changes/i }));

      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
      expect(await lastRequestBody()).toEqual({ company: 'My Co', version: 2 });
      expect(await screen.findByText('Contact saved')).toBeInTheDocument();
    });
  });
});
