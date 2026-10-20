import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DataTable, type DataTableColumn, type SortingState } from '.';
import { nextSorting } from './sorting';

interface Person {
  id: number;
  name: string;
  city: string;
}

const people: Person[] = [
  { id: 1, name: 'Ada', city: 'London' },
  { id: 2, name: 'Grace', city: 'New York' },
];

const columns: DataTableColumn<Person>[] = [
  { id: 'name', header: 'Name', enableSorting: true, cell: (person) => person.name },
  { id: 'city', header: 'City', cell: (person) => person.city },
];

function renderTable(sorting: SortingState = [], onSortingChange = vi.fn()) {
  render(
    <DataTable
      label="People"
      columns={columns}
      data={people}
      getRowId={(person) => person.id}
      sorting={sorting}
      onSortingChange={onSortingChange}
      isRowSelected={(person) => person.id === 2}
    />,
  );
  return onSortingChange;
}

describe('DataTable', () => {
  it('renders a header per column and a cell per row', () => {
    renderTable();
    const table = screen.getByRole('table', { name: 'People' });
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((th) => th.textContent),
    ).toEqual(['Name', 'City']);
    expect(within(table).getByRole('cell', { name: 'New York' })).toBeInTheDocument();
  });

  it('only sortable columns get a sort button', () => {
    renderTable();
    expect(screen.getByRole('button', { name: 'Name' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'City' })).not.toBeInTheDocument();
  });

  it('marks the sorted column for screen readers', () => {
    renderTable([{ id: 'name', desc: true }]);
    const [nameHeader, cityHeader] = screen.getAllByRole('columnheader');
    expect(nameHeader).toHaveAttribute('aria-sort', 'descending');
    expect(cityHeader).not.toHaveAttribute('aria-sort');
  });

  it('a header click reports the new sorting in TanStack shape', async () => {
    const onSortingChange = renderTable([{ id: 'name', desc: false }]);
    await userEvent.click(screen.getByRole('button', { name: 'Name' }));
    expect(onSortingChange).toHaveBeenCalledWith([{ id: 'name', desc: true }]);
  });

  it('highlights selected rows', () => {
    renderTable();
    const rows = screen.getAllByRole('row');
    expect(rows.at(2)).toHaveAttribute('data-selected', 'true');
    expect(rows.at(1)).not.toHaveAttribute('data-selected');
  });

  it('shows placeholder rows while loading', () => {
    render(
      <DataTable
        label="People"
        columns={columns}
        data={[]}
        getRowId={(person) => person.id}
        loading
      />,
    );
    expect(screen.getByRole('table')).toHaveAttribute('aria-busy', 'true');
    expect(screen.getAllByRole('row')).toHaveLength(9);
  });
});

describe('nextSorting', () => {
  it('sorts a new column ascending, then flips it', () => {
    expect(nextSorting([], 'name')).toEqual([{ id: 'name', desc: false }]);
    expect(nextSorting([{ id: 'name', desc: false }], 'name')).toEqual([
      { id: 'name', desc: true },
    ]);
    expect(nextSorting([{ id: 'name', desc: true }], 'name')).toEqual([
      { id: 'name', desc: false },
    ]);
    expect(nextSorting([{ id: 'name', desc: true }], 'created_at')).toEqual([
      { id: 'created_at', desc: false },
    ]);
  });
});
