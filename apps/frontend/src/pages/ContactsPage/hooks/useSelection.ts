import { useState } from 'react';

export function useSelection(scope: string) {
  const [selection, setSelection] = useState({ scope, ids: new Set<number>() });

  const selectedIds = selection.scope === scope ? selection.ids : new Set<number>();

  const save = (ids: Set<number>) => {
    setSelection({ scope, ids });
  };

  const toggle = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    save(next);
  };

  const setMany = (ids: number[], selected: boolean) => {
    const next = new Set(selectedIds);
    for (const id of ids) {
      if (selected) {
        next.add(id);
      } else {
        next.delete(id);
      }
    }
    save(next);
  };

  function clear() {
    save(new Set());
  }

  return { selectedIds, toggle, setMany, clear };
}
