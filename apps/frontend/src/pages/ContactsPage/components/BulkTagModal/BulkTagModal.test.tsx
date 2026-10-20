import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/render';
import { BulkTagModal } from '.';

const existingTags = [
  { id: 1, name: 'Lead' },
  { id: 2, name: 'VIP' },
];

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn((input: Request) =>
    Promise.resolve(
      input.method === 'GET'
        ? Response.json(existingTags)
        : Response.json({ tags: [{ id: 2, name: 'VIP' }], added: 2, already_tagged: 1 }),
    ),
  );
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => vi.unstubAllGlobals());

async function postedBody() {
  const request = fetchMock.mock.calls
    .map(([input]) => input as Request)
    .find((r) => r.method === 'POST');
  return request ? JSON.parse(await request.clone().text()) : undefined;
}

function renderModal() {
  const onClose = vi.fn();
  const onDone = vi.fn();
  renderWithProviders(<BulkTagModal contactIds={[4, 9]} onClose={onClose} onDone={onDone} />);
  return { onClose, onDone, user: userEvent.setup() };
}

describe('BulkTagModal', () => {
  it('applies a mix of existing and new tags to the selected contacts', async () => {
    const { user, onDone } = renderModal();
    expect(screen.getByRole('heading', { name: 'Add tags to 2 contacts' })).toBeInTheDocument();
    const addButton = screen.getByRole('button', { name: 'Add tags' });
    expect(addButton).toBeDisabled();

    await user.click(await screen.findByRole('button', { name: 'VIP' }));
    expect(screen.getByRole('button', { name: 'VIP' })).toHaveAttribute('aria-pressed', 'true');

    await user.type(screen.getByLabelText('New tag name'), 'Key   Account{Enter}');
    expect(screen.getByRole('list', { name: 'New tags to create' })).toHaveTextContent(
      'Key Account',
    );

    await user.click(screen.getByRole('button', { name: 'Add 2 tags' }));

    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(await postedBody()).toEqual({ contact_ids: [4, 9], names: ['VIP', 'Key Account'] });
    expect(await screen.findByText('Added "VIP" to 2 contacts (1 already in place)')).toBeVisible();
  });

  it('reuses an existing tag when its name is typed in another case', async () => {
    const { user } = renderModal();
    await screen.findByRole('button', { name: 'Lead' });

    await user.type(screen.getByLabelText('New tag name'), 'lead{Enter}');

    expect(screen.getByRole('button', { name: 'Lead' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByRole('list', { name: 'New tags to create' })).not.toBeInTheDocument();
  });

  it('validates the new tag name', async () => {
    const { user } = renderModal();

    await user.type(screen.getByLabelText('New tag name'), '<oops>{Enter}');

    expect(await screen.findByText(/Use letters, numbers, spaces/)).toBeInTheDocument();
  });

  it('shows the server error and stays open', async () => {
    fetchMock.mockImplementation((input: Request) =>
      Promise.resolve(
        input.method === 'GET'
          ? Response.json(existingTags)
          : Response.json(
              { error: { code: 'not_found', message: 'Some contacts do not exist' } },
              { status: 404 },
            ),
      ),
    );
    const { user, onDone } = renderModal();

    await user.click(await screen.findByRole('button', { name: 'Lead' }));
    await user.click(screen.getByRole('button', { name: 'Add 1 tag' }));

    expect(await screen.findByText('Some contacts do not exist')).toBeInTheDocument();
    expect(onDone).not.toHaveBeenCalled();
  });

  it('closes with Cancel', async () => {
    const { user, onClose } = renderModal();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalled();
  });
});
