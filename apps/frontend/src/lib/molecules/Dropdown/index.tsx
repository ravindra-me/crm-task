import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Button } from '@/lib/atoms/Button';
import { Icon } from '@/lib/atoms/Icon';
import styles from './style.module.css';

interface DropdownProps {
  label: string;
  count?: number;
  children: ReactNode;
}

export function Dropdown({ label, count = 0, children }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div className={styles.dropdown} ref={rootRef}>
      <Button
        ref={triggerRef}
        className={styles.trigger}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        {label}
        {count > 0 && <span className={styles.count}>{count}</span>}
        <Icon name="chevron-down" />
      </Button>
      {open && (
        <div id={panelId} className={styles.panel}>
          {children}
        </div>
      )}
    </div>
  );
}
